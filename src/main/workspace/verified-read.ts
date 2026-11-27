import { constants, type BigIntStats } from 'node:fs';
import { open, type FileHandle } from 'node:fs/promises';

import { policyFail, policyFailFromFsError, policyOk, type PolicyResult } from './policy-result';
import { resolveWorkspacePath, type ResolvedWorkspacePath } from './resolve-path';
import { sameIdentity, type FileIdentity, type WorkspaceRoot } from './workspace-root';

/** Plain-text size limit (1 MiB). Larger files are reported, never truncated silently. */
export const MAX_DISPLAY_BYTES = 1024 * 1024;

export interface VerifiedTextFile {
  /** Canonical workspace-relative path with `/` separators. */
  readonly relativePath: string;
  readonly content: string;
  readonly sizeBytes: number;
}

/** Internal only; the renderer does not receive raw bytes, file identities or absolute paths. */
export interface VerifiedTextSnapshot extends VerifiedTextFile {
  readonly resolved: ResolvedWorkspacePath;
  readonly stats: BigIntStats;
  readonly bytes: Buffer;
}

// O_NOFOLLOW / O_NONBLOCK are POSIX-only. O_NONBLOCK keeps a FIFO swapped in after validation
// from blocking `open`; on Windows the post-open identity check covers link swaps.
const POSIX_ONLY = constants as Partial<typeof constants>;
export const SAFE_OPEN_FLAGS = (POSIX_ONLY.O_NOFOLLOW ?? 0) | (POSIX_ONLY.O_NONBLOCK ?? 0);

/**
 * Reads a UTF-8 text file through the workspace boundary. The path is validated, then the
 * opened handle's identity is compared with the validated identity, so a component swapped
 * for a link between check and open is detected (TARGET_CHANGED) instead of followed.
 */
export async function readVerifiedTextFile(
  root: WorkspaceRoot,
  input: unknown,
  maxBytes: number = MAX_DISPLAY_BYTES,
): Promise<PolicyResult<VerifiedTextFile>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    return policyFail('INVALID_INPUT');
  }
  const snapshot = await readWorkspaceTextSnapshot(root, input, maxBytes);
  if (!snapshot.ok) return snapshot;
  const { relativePath, content, sizeBytes } = snapshot.value;
  return policyOk({ relativePath, content, sizeBytes });
}

/** Resolves the untrusted request before opening a verified UTF-8 snapshot. */
export async function readWorkspaceTextSnapshot(
  root: WorkspaceRoot,
  input: unknown,
  maxBytes: number = MAX_DISPLAY_BYTES,
): Promise<PolicyResult<VerifiedTextSnapshot>> {
  const resolved = await resolveWorkspacePath(root, input, 'read');
  if (!resolved.ok) {
    return resolved;
  }
  return readResolvedTextSnapshot(resolved.value, maxBytes);
}

/** Reads an already resolved file. `write` access checks OS permission without truncating. */
export async function readResolvedTextSnapshot(
  resolved: ResolvedWorkspacePath,
  maxBytes: number = MAX_DISPLAY_BYTES,
  access: 'read' | 'write' = 'read',
): Promise<PolicyResult<VerifiedTextSnapshot>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    return policyFail('INVALID_INPUT');
  }
  if (resolved.sizeBytes > BigInt(maxBytes)) {
    return policyFail('FILE_TOO_LARGE');
  }

  let handle: FileHandle;
  try {
    const flags = access === 'write' ? constants.O_RDWR : constants.O_RDONLY;
    handle = await open(resolved.canonicalPath, flags | SAFE_OPEN_FLAGS);
  } catch (error) {
    if (access === 'write' && isPermissionError(error)) return policyFail('READ_ONLY');
    return policyFailFromFsError(error);
  }
  try {
    try {
      return await readTextHandle(handle, resolved, maxBytes);
    } finally {
      await handle.close();
    }
  } catch (error) {
    return policyFailFromFsError(error);
  }
}

async function readTextHandle(
  handle: FileHandle,
  resolved: ResolvedWorkspacePath,
  maxBytes: number,
): Promise<PolicyResult<VerifiedTextSnapshot>> {
  const stats = await handle.stat({ bigint: true });
  if (!matchesRegularFile(stats, resolved.identity)) {
    return policyFail('TARGET_CHANGED');
  }
  if (stats.size > BigInt(maxBytes)) {
    return policyFail('FILE_TOO_LARGE');
  }
  // Read at most one byte past the validated size: growth or shrinkage during the read
  // means the content is not the file we validated.
  const expectedSize = Number(stats.size);
  const bytes = await readAtMost(handle, expectedSize + 1);
  if (bytes.length > maxBytes) {
    return policyFail('FILE_TOO_LARGE');
  }
  const afterRead = await handle.stat({ bigint: true });
  if (
    bytes.length !== expectedSize ||
    !matchesRegularFile(afterRead, resolved.identity) ||
    afterRead.size !== stats.size ||
    afterRead.mtimeNs !== stats.mtimeNs ||
    afterRead.ctimeNs !== stats.ctimeNs
  ) {
    return policyFail('TARGET_CHANGED');
  }
  const content = decodeStrictUtf8(bytes);
  if (content === null) {
    return policyFail('UNSUPPORTED_ENCODING');
  }
  return policyOk({
    relativePath: resolved.relativePath,
    content,
    sizeBytes: bytes.length,
    resolved,
    stats: afterRead,
    bytes,
  });
}

export function matchesRegularFile(stats: BigIntStats, identity: FileIdentity): boolean {
  return stats.isFile() && stats.nlink === 1n && sameIdentity(stats, identity);
}

export function matchesFileVersion(stats: BigIntStats, resolved: ResolvedWorkspacePath): boolean {
  return (
    stats.size === resolved.sizeBytes &&
    stats.mtimeNs === resolved.modifiedAtNs &&
    stats.ctimeNs === resolved.changedAtNs
  );
}

function isPermissionError(error: unknown): boolean {
  const code: unknown =
    typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
  return code === 'EACCES' || code === 'EPERM' || code === 'EROFS';
}

async function readAtMost(handle: FileHandle, limit: number): Promise<Buffer> {
  const buffer = Buffer.alloc(limit);
  let offset = 0;
  while (offset < limit) {
    const { bytesRead } = await handle.read(buffer, offset, limit - offset, offset);
    if (bytesRead === 0) {
      break;
    }
    offset += bytesRead;
  }
  return buffer.subarray(0, offset);
}

/** Strict UTF-8 (optional BOM stripped); NUL bytes are treated as binary content. */
export function decodeStrictUtf8(bytes: Uint8Array): string | null {
  if (bytes.includes(0)) {
    return null;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
