import type { BigIntStats } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

import { isWithinRoot, toWorkspaceRelative } from './containment';
import { policyFail, policyFailFromFsError, policyOk, type PolicyResult } from './policy-result';
import { parseWorkspaceRelativePath } from './relative-path';
import {
  sameIdentity,
  verifyWorkspaceRoot,
  type FileIdentity,
  type WorkspaceRoot,
} from './workspace-root';

/**
 * What the caller is about to do. `write` never follows links; S1 itself has no write
 * operation, but S3 apply must resolve with `write` and call `revalidateResolvedPath`.
 */
export type AccessIntent = 'read' | 'list' | 'write';

const KNOWN_INTENTS: ReadonlySet<unknown> = new Set<AccessIntent>(['read', 'list', 'write']);

/** A path the broker validated against the workspace boundary. Main-process only. */
export interface ResolvedWorkspacePath {
  readonly intent: AccessIntent;
  /** Canonical workspace-relative path with `/` separators ('' for the root). */
  readonly relativePath: string;
  /** Canonical absolute path. Never sent to the renderer or written to audit records. */
  readonly canonicalPath: string;
  readonly kind: 'file' | 'directory';
  readonly identity: FileIdentity;
  readonly sizeBytes: bigint;
  /** A symbolic link or junction inside the workspace was followed (read/list only). */
  readonly followedLink: boolean;
}

/**
 * Broker-side workspace boundary check (#49). Must run before every file operation.
 *
 * 1. lexical validation (`parseWorkspaceRelativePath`), 2. root identity re-check,
 * 3. per-component `lstat` walk: links fail closed on writes and must resolve inside the
 * root on reads, 4. canonical (`realpath`) segment containment, 5. canonical-name match
 * when no link was followed (catches 8.3 aliases, case aliases and unknown reparse points),
 * 6. entry-type / hard-link checks.
 */
export async function resolveWorkspacePath(
  root: WorkspaceRoot,
  input: unknown,
  intent: AccessIntent,
): Promise<PolicyResult<ResolvedWorkspacePath>> {
  // Fail closed on anything but the three known intents (e.g. a mistyped 'WRITE' or 'apply').
  if (!KNOWN_INTENTS.has(intent)) {
    return policyFail('INVALID_INPUT');
  }
  const parsed = parseWorkspaceRelativePath(input);
  if (!parsed.ok) {
    return parsed;
  }
  const rootCheck = await verifyWorkspaceRoot(root);
  if (!rootCheck.ok) {
    return rootCheck;
  }
  const lexicalPath = path.join(root.canonicalPath, ...parsed.value.segments);
  if (!isWithinRoot(root.canonicalPath, lexicalPath)) {
    return policyFail('OUTSIDE_WORKSPACE');
  }

  const walk = await walkComponents(root, parsed.value.segments, intent);
  if (!walk.ok) {
    return walk;
  }
  const canonical = await resolveCanonical(root, lexicalPath, walk.value);
  if (!canonical.ok) {
    return canonical;
  }
  const { canonicalPath, stats } = canonical.value;
  const kind = classifyEntry(stats, intent);
  if (!kind.ok) {
    return kind;
  }
  const relativePath = toWorkspaceRelative(root.canonicalPath, canonicalPath);
  // Every returned path must round-trip through the lexical policy (e.g. a Linux name
  // containing '\' would re-parse into different segments).
  const roundTrip = parseWorkspaceRelativePath(relativePath === '' ? '.' : relativePath);
  if (!roundTrip.ok || roundTrip.value.posixPath !== relativePath) {
    return policyFail('NON_CANONICAL_PATH');
  }
  return policyOk({
    intent,
    relativePath,
    canonicalPath,
    kind: kind.value,
    identity: { dev: stats.dev, ino: stats.ino },
    sizeBytes: stats.size,
    followedLink: walk.value.followedLink,
  });
}

/**
 * Steps 4–5: canonical containment and canonical-name match, then `lstat` of the canonical
 * entry. `lstat` follows intermediate components, so an ancestor swapped for a link between
 * `realpath` and `lstat` would hand back another file's identity; the entry must therefore be
 * the one the walk saw, and the canonical path must still resolve to itself afterwards.
 */
async function resolveCanonical(
  root: WorkspaceRoot,
  lexicalPath: string,
  walk: WalkResult,
): Promise<PolicyResult<{ canonicalPath: string; stats: BigIntStats }>> {
  try {
    const canonicalPath = await realpath(lexicalPath);
    if (!isWithinRoot(root.canonicalPath, canonicalPath)) {
      return policyFail(walk.followedLink ? 'LINK_ESCAPE' : 'OUTSIDE_WORKSPACE');
    }
    if (!walk.followedLink && canonicalPath !== lexicalPath) {
      return policyFail('NON_CANONICAL_PATH');
    }
    const stats = await lstat(canonicalPath, { bigint: true });
    const identity = { dev: stats.dev, ino: stats.ino };
    if (
      (walk.finalIdentity !== null && !sameIdentity(walk.finalIdentity, identity)) ||
      (await realpath(canonicalPath)) !== canonicalPath
    ) {
      return policyFail('TARGET_CHANGED');
    }
    return policyOk({ canonicalPath, stats });
  } catch (error) {
    return policyFailFromFsError(error);
  }
}

/**
 * Second check immediately before use (e.g. S3 apply): the same request must still resolve
 * to the same canonical path, kind and filesystem identity.
 */
export async function revalidateResolvedPath(
  root: WorkspaceRoot,
  previous: ResolvedWorkspacePath,
): Promise<PolicyResult<ResolvedWorkspacePath>> {
  const again = await resolveWorkspacePath(
    root,
    previous.relativePath === '' ? '.' : previous.relativePath,
    previous.intent,
  );
  if (!again.ok) {
    return again;
  }
  if (
    again.value.canonicalPath !== previous.canonicalPath ||
    again.value.kind !== previous.kind ||
    !sameIdentity(again.value.identity, previous.identity)
  ) {
    return policyFail('TARGET_CHANGED');
  }
  return again;
}

interface WalkResult {
  /** An (inside-root) link was followed somewhere on the path. */
  readonly followedLink: boolean;
  /** `lstat` identity of the last component when it is not a link; `null` otherwise. */
  readonly finalIdentity: FileIdentity | null;
}

/** Walks each prefix with `lstat`, checking every link it meets against the root. */
async function walkComponents(
  root: WorkspaceRoot,
  segments: readonly string[],
  intent: AccessIntent,
): Promise<PolicyResult<WalkResult>> {
  let prefix = root.canonicalPath;
  let followedLink = false;
  let finalIdentity: FileIdentity | null = null;
  for (const segment of segments) {
    prefix = path.join(prefix, segment);
    try {
      const stats = await lstat(prefix, { bigint: true });
      if (!stats.isSymbolicLink()) {
        finalIdentity = { dev: stats.dev, ino: stats.ino };
        continue;
      }
      finalIdentity = null;
      // Node reports Windows junctions and app-exec links as symbolic links too.
      // Only read/list may follow a link; every other intent fails closed.
      if (intent !== 'read' && intent !== 'list') {
        return policyFail('LINK_NOT_ALLOWED');
      }
      const target = await realpath(prefix);
      if (!isWithinRoot(root.canonicalPath, target)) {
        return policyFail('LINK_ESCAPE');
      }
      followedLink = true;
    } catch (error) {
      return policyFailFromFsError(error);
    }
  }
  return policyOk({ followedLink, finalIdentity });
}

function classifyEntry(
  stats: BigIntStats,
  intent: AccessIntent,
): PolicyResult<'file' | 'directory'> {
  if (stats.isFile()) {
    if (intent === 'list') {
      return policyFail('UNSUPPORTED_FILE_TYPE');
    }
    return stats.nlink > 1n ? policyFail('HARDLINK_UNSUPPORTED') : policyOk('file');
  }
  if (stats.isDirectory()) {
    return intent === 'list' ? policyOk('directory') : policyFail('UNSUPPORTED_FILE_TYPE');
  }
  // FIFOs, sockets, devices, or a link that appeared after realpath (race).
  return policyFail('UNSUPPORTED_FILE_TYPE');
}
