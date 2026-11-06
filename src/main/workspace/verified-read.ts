import { constants } from 'node:fs';
import { open, type FileHandle } from 'node:fs/promises';

import { policyFail, policyFailFromFsError, policyOk, type PolicyResult } from './policy-result';
import { resolveWorkspacePath } from './resolve-path';
import { sameIdentity, type WorkspaceRoot } from './workspace-root';

/** S1 read-only display limit (1 MiB). Larger files are reported, never truncated silently. */
export const MAX_DISPLAY_BYTES = 1024 * 1024;

export interface VerifiedTextFile {
  /** Canonical workspace-relative path with `/` separators. */
  readonly relativePath: string;
  readonly content: string;
  readonly sizeBytes: number;
}

// O_NOFOLLOW / O_NONBLOCK are POSIX-only. O_NONBLOCK keeps a FIFO swapped in after validation
// from blocking `open`; on Windows the post-open identity check covers link swaps.
const POSIX_ONLY = constants as Partial<typeof constants>;
const OPEN_FLAGS = constants.O_RDONLY | (POSIX_ONLY.O_NOFOLLOW ?? 0) | (POSIX_ONLY.O_NONBLOCK ?? 0);

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
  const resolved = await resolveWorkspacePath(root, input, 'read');
  if (!resolved.ok) {
    return resolved;
  }
  if (resolved.value.sizeBytes > BigInt(maxBytes)) {
    return policyFail('FILE_TOO_LARGE');
  }

  let handle: FileHandle;
  try {
    handle = await open(resolved.value.canonicalPath, OPEN_FLAGS);
  } catch (error) {
    return policyFailFromFsError(error);
  }
  try {
    const stats = await handle.stat({ bigint: true });
    if (
      !stats.isFile() ||
      stats.nlink > 1n ||
      !sameIdentity({ dev: stats.dev, ino: stats.ino }, resolved.value.identity)
    ) {
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
    if (bytes.length !== expectedSize) {
      return policyFail('TARGET_CHANGED');
    }
    const content = decodeStrictUtf8(bytes);
    if (content === null) {
      return policyFail('UNSUPPORTED_ENCODING');
    }
    return policyOk({
      relativePath: resolved.value.relativePath,
      content,
      sizeBytes: bytes.length,
    });
  } catch (error) {
    return policyFailFromFsError(error);
  } finally {
    await handle.close();
  }
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
