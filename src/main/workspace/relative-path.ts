import { policyFail, policyOk, type PolicyResult } from './policy-result';

/** Upper bound for a request path; far above real project paths, well below abuse sizes. */
export const MAX_RELATIVE_PATH_LENGTH = 4096;
/** NTFS and most POSIX filesystems limit a single name to 255 units. */
export const MAX_SEGMENT_LENGTH = 255;

/** A lexically validated, normalized workspace-relative path. Not yet checked against the disk. */
export interface WorkspaceRelativePath {
  /** Normalized segments; empty for the workspace root itself. */
  readonly segments: readonly string[];
  /** Segments joined with `/` (the workspace's canonical display form). */
  readonly posixPath: string;
}

// Percent-encoded '.', '/', '\', ':', NUL or '%' (the last one catches double encoding).
const ENCODED_PATH_SYNTAX = /%(?:2e|2f|5c|3a|00|25)/i;
// Drive-absolute ("C:\x", "C:/x") and drive-relative ("C:x") forms.
const DRIVE_PREFIX = /^[A-Za-z]:/;
// Characters Windows forbids in names; ':' also selects NTFS alternate data streams.
const WINDOWS_INVALID_CHARACTERS = /[<>:"|?*]/;
// DOS device names are reserved in any directory and with any extension (CON.txt, COM¹).
const RESERVED_DEVICE_NAME = /^(?:con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³]|conin\$|conout\$)$/i;
const SEPARATORS = /[\\/]+/;

/**
 * Lexical half of the workspace boundary (#49). Windows naming rules are applied on every
 * platform so the policy behaves identically in CI (Linux) and on the Windows demo machine.
 * This function is pure and never touches the filesystem; `resolveWorkspacePath` must still
 * be used before any file operation.
 */
export function parseWorkspaceRelativePath(input: unknown): PolicyResult<WorkspaceRelativePath> {
  if (typeof input !== 'string' || input.length === 0) {
    return policyFail('INVALID_INPUT');
  }
  if (input.length > MAX_RELATIVE_PATH_LENGTH || hasControlCharacter(input)) {
    return policyFail('INVALID_INPUT');
  }
  // Leading separator covers POSIX absolute, UNC (\\server), device (\\?\, \\.\) and rooted (\x).
  if (input.startsWith('/') || input.startsWith('\\') || DRIVE_PREFIX.test(input)) {
    return policyFail('ABSOLUTE_PATH');
  }
  if (ENCODED_PATH_SYNTAX.test(input)) {
    return policyFail('ENCODED_TRAVERSAL');
  }

  const rawSegments = input.split(SEPARATORS);
  // Rule order is part of the contract: any '..' reports TRAVERSAL before segment syntax.
  if (rawSegments.includes('..')) {
    return policyFail('TRAVERSAL');
  }
  const segments: string[] = [];
  for (const segment of rawSegments) {
    if (segment === '' || segment === '.') {
      continue;
    }
    const problem = checkSegment(segment);
    if (problem !== null) {
      return problem;
    }
    segments.push(segment);
  }
  return policyOk({ segments, posixPath: segments.join('/') });
}

function checkSegment(segment: string): PolicyResult<never> | null {
  if (
    segment.length > MAX_SEGMENT_LENGTH ||
    // Windows silently strips trailing dots/spaces ("..." / ".. " / "a." alias other names).
    segment.endsWith('.') ||
    segment.endsWith(' ') ||
    WINDOWS_INVALID_CHARACTERS.test(segment) ||
    isReservedDeviceName(segment)
  ) {
    return policyFail('INVALID_SEGMENT');
  }
  return null;
}

/**
 * Win32 cuts a name at its first '.' and strips the spaces before it when matching DOS
 * devices, so "NUL", "nul.txt", "NUL .txt" and "CON  .tar.gz" all name a device.
 */
function isReservedDeviceName(segment: string): boolean {
  const dot = segment.indexOf('.');
  const base = (dot === -1 ? segment : segment.slice(0, dot)).replace(/ +$/, '');
  return RESERVED_DEVICE_NAME.test(base);
}

/** C0 control characters (including NUL) and DEL are never valid in a request path. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}
