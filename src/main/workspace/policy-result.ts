/**
 * Workspace policy outcomes (#49). Policy functions never throw for policy decisions; they
 * return a typed failure so callers cannot accidentally treat a denial as success.
 * Messages are generic on purpose: they never echo absolute paths back to the renderer.
 */
export type WorkspacePolicyCode =
  /** Not a string, empty, too long, or contains control characters / NUL. */
  | 'INVALID_INPUT'
  /** POSIX/Windows absolute, drive-relative, UNC or device path. */
  | 'ABSOLUTE_PATH'
  /** A `..` segment. */
  | 'TRAVERSAL'
  /** Percent-encoded dot, separator, colon, NUL or percent (double encoding). */
  | 'ENCODED_TRAVERSAL'
  /** Segment Windows would rewrite or interpret (trailing dot/space, ADS, wildcard, device name). */
  | 'INVALID_SEGMENT'
  /** Canonical path is not inside the canonical workspace root. */
  | 'OUTSIDE_WORKSPACE'
  /** A symbolic link or junction resolves outside the workspace, or link resolution loops (ELOOP). A dangling link is NOT_FOUND. */
  | 'LINK_ESCAPE'
  /** Links are followed only for read/list; write (and any other intent) fails closed. */
  | 'LINK_NOT_ALLOWED'
  /** A regular file with more than one hard link may alias data outside the workspace. */
  | 'HARDLINK_UNSUPPORTED'
  /** Wrong kind for the operation, or a FIFO/socket/device. */
  | 'UNSUPPORTED_FILE_TYPE'
  /** The OS canonical path differs from the request without a detected link (8.3 alias, case, reparse point). */
  | 'NON_CANONICAL_PATH'
  | 'NOT_FOUND'
  /** File bytes or identity changed since it was opened or during validation. */
  | 'TARGET_CHANGED'
  | 'PROTECTED_PATH'
  /** The write policy could not be safely loaded. */
  | 'PROTECTION_UNAVAILABLE'
  | 'READ_ONLY'
  /** The workspace root is unusable (filesystem root, UNC/device path, not a directory). */
  | 'ROOT_UNSUPPORTED'
  /** The workspace root was replaced or moved after it was opened. */
  | 'ROOT_CHANGED'
  /** Plain-text files are read and saved up to a fixed size only. */
  | 'FILE_TOO_LARGE'
  /** Content is not strict UTF-8 text (binary, NUL bytes or invalid sequences). */
  | 'UNSUPPORTED_ENCODING'
  | 'IO_ERROR';

export interface WorkspacePolicyError {
  readonly code: WorkspacePolicyCode;
  readonly message: string;
}

export type PolicyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: WorkspacePolicyError };

const MESSAGES: Readonly<Record<WorkspacePolicyCode, string>> = {
  INVALID_INPUT: 'The path is empty, too long or contains control characters.',
  ABSOLUTE_PATH: 'Only paths relative to the workspace are accepted.',
  TRAVERSAL: 'Parent-directory segments are not allowed.',
  ENCODED_TRAVERSAL: 'Percent-encoded path syntax is not allowed.',
  INVALID_SEGMENT: 'A path segment uses reserved or ambiguous file name syntax.',
  OUTSIDE_WORKSPACE: 'The path resolves outside the workspace.',
  LINK_ESCAPE: 'A link resolves outside the workspace.',
  LINK_NOT_ALLOWED: 'Links are not followed for this operation.',
  HARDLINK_UNSUPPORTED: 'Files with multiple hard links are not supported.',
  UNSUPPORTED_FILE_TYPE: 'This kind of file system entry is not supported for the operation.',
  NON_CANONICAL_PATH: 'The path does not match its canonical file system name.',
  NOT_FOUND: 'The path does not exist.',
  TARGET_CHANGED: 'The file changed since it was opened or during validation.',
  PROTECTED_PATH: 'The workspace policy prevents saving this file.',
  PROTECTION_UNAVAILABLE: 'The workspace write policy could not be read safely.',
  READ_ONLY: 'The file cannot be saved because it is read-only.',
  ROOT_UNSUPPORTED: 'This folder cannot be used as a workspace.',
  ROOT_CHANGED: 'The workspace folder changed after it was opened.',
  FILE_TOO_LARGE: 'The file exceeds the UTF-8 text size limit.',
  UNSUPPORTED_ENCODING: 'This operation requires valid UTF-8 text without NUL characters.',
  IO_ERROR: 'The file system operation failed.',
};

/** Successful policy result. */
export function policyOk<T>(value: T): PolicyResult<T> {
  return { ok: true, value };
}

/** Failed policy result with the canonical message for `code`. */
export function policyFail<T = never>(code: WorkspacePolicyCode): PolicyResult<T> {
  return { ok: false, error: { code, message: MESSAGES[code] } };
}

/** Maps a Node.js filesystem error to a policy failure without leaking its message. */
export function policyFailFromFsError<T = never>(error: unknown): PolicyResult<T> {
  const code: unknown =
    typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
  if (code === 'ENOENT' || code === 'ENOTDIR') {
    return policyFail('NOT_FOUND');
  }
  if (code === 'ELOOP') {
    return policyFail('LINK_ESCAPE');
  }
  return policyFail('IO_ERROR');
}
