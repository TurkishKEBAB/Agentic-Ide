import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

import { policyFail, policyFailFromFsError, policyOk, type PolicyResult } from './policy-result';

/** Filesystem identity of an entry (exact 64-bit values; Windows file IDs exceed 2^53). */
export interface FileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

/** The single workspace boundary. Held by the main-process broker only. */
export interface WorkspaceRoot {
  /** `realpath` of the selected folder; every containment check compares against this. */
  readonly canonicalPath: string;
  /** Folder name for display; the absolute path is not sent to the renderer. */
  readonly displayName: string;
  readonly identity: FileIdentity;
}

// UNC shares (\\server\share) and Win32 device/extended paths (\\?\, \\.\) in any mix of
// separators (Win32 treats '/' like '\', so "/\host\share" and "\/./C:" count too).
// Checked before realpath so no SMB/NTLM connection is ever attempted.
const UNC_OR_DEVICE_PREFIX = /^[\\/]{2}/;

/**
 * Opens a user-selected folder as the workspace root. Filesystem roots, UNC/device paths and
 * non-directories are rejected (fail closed); links in the selected path are resolved once,
 * here, and the canonical result becomes the boundary.
 */
export async function openWorkspaceRoot(
  selectedPath: unknown,
): Promise<PolicyResult<WorkspaceRoot>> {
  if (
    typeof selectedPath !== 'string' ||
    selectedPath.length === 0 ||
    selectedPath.includes('\0') ||
    !path.isAbsolute(selectedPath) ||
    UNC_OR_DEVICE_PREFIX.test(selectedPath)
  ) {
    return policyFail('ROOT_UNSUPPORTED');
  }
  let canonicalPath: string;
  try {
    canonicalPath = await realpath(selectedPath);
  } catch (error) {
    return policyFailFromFsError(error);
  }
  if (
    UNC_OR_DEVICE_PREFIX.test(canonicalPath) ||
    path.parse(canonicalPath).root === canonicalPath
  ) {
    return policyFail('ROOT_UNSUPPORTED');
  }
  try {
    const stats = await lstat(canonicalPath, { bigint: true });
    if (!stats.isDirectory()) {
      return policyFail('ROOT_UNSUPPORTED');
    }
    return policyOk({
      canonicalPath,
      displayName: path.basename(canonicalPath),
      identity: { dev: stats.dev, ino: stats.ino },
    });
  } catch (error) {
    return policyFailFromFsError(error);
  }
}

/** Confirms the root still has the same canonical path and identity (not swapped for a link). */
export async function verifyWorkspaceRoot(root: WorkspaceRoot): Promise<PolicyResult<true>> {
  try {
    const current = await realpath(root.canonicalPath);
    const stats = await lstat(root.canonicalPath, { bigint: true });
    if (
      current !== root.canonicalPath ||
      !stats.isDirectory() ||
      stats.dev !== root.identity.dev ||
      stats.ino !== root.identity.ino
    ) {
      return policyFail('ROOT_CHANGED');
    }
    return policyOk(true);
  } catch {
    return policyFail('ROOT_CHANGED');
  }
}

/** True when two identities denote the same filesystem object. */
export function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}
