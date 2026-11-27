import path from 'node:path';

/** Path flavour used for containment; injectable so both semantics are unit-testable on any OS. */
export type PathFlavor = Pick<typeof path, 'sep' | 'parse' | 'isAbsolute'>;

/**
 * Canonical segment containment: `candidate` is the root itself or a descendant of it.
 *
 * Both arguments must be canonical (`realpath`) absolute paths. Comparison is exact and
 * case-sensitive: canonical paths already carry the on-disk casing, so a case-only
 * difference is treated as "outside" (fail closed). String-prefix checks are not used,
 * which rules out sibling-prefix escapes such as `C:\ws` vs `C:\ws-evil`.
 */
export function isWithinRoot(
  canonicalRoot: string,
  canonicalCandidate: string,
  flavor: PathFlavor = path,
): boolean {
  if (!flavor.isAbsolute(canonicalRoot) || !flavor.isAbsolute(canonicalCandidate)) {
    return false;
  }
  const rootSegments = splitCanonical(canonicalRoot, flavor);
  const candidateSegments = splitCanonical(canonicalCandidate, flavor);
  if (rootSegments === null || candidateSegments === null) {
    return false;
  }
  if (candidateSegments.length < rootSegments.length) {
    return false;
  }
  return rootSegments.every((segment, index) => candidateSegments[index] === segment);
}

/**
 * Splits a canonical absolute path into `[root, ...segments]`. Returns `null` for paths that
 * still contain `.`/`..` segments, which canonical paths never do. Win32 treats both `\` and
 * `/` as separators, so both are split there (a `/..` must not hide inside one segment).
 */
function splitCanonical(value: string, flavor: PathFlavor): string[] | null {
  const { root } = flavor.parse(value);
  const separators = flavor.sep === '\\' ? /[\\/]/ : /\//;
  const rest = value
    .slice(root.length)
    .split(separators)
    .filter((segment) => segment !== '');
  if (rest.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }
  return [root, ...rest];
}

/** Relative POSIX-style path of a contained canonical path (empty string for the root). */
export function toWorkspaceRelative(
  canonicalRoot: string,
  canonicalCandidate: string,
  flavor: PathFlavor = path,
): string {
  const rootSegments = splitCanonical(canonicalRoot, flavor) ?? [];
  const candidateSegments = splitCanonical(canonicalCandidate, flavor) ?? [];
  return candidateSegments.slice(rootSegments.length).join('/');
}
