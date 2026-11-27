import type { Dirent } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';

import { policyOk, type PolicyResult } from './policy-result';
import { parseWorkspaceRelativePath } from './relative-path';
import { resolveWorkspacePath, revalidateResolvedPath } from './resolve-path';
import { verifyWorkspaceRoot, type WorkspaceRoot } from './workspace-root';

export interface ListLimits {
  readonly maxEntries: number;
  readonly maxDepth: number;
}

/** S1 listing budget: enough for the ~100-file benchmark fixtures, bounded for large repos. */
export const DEFAULT_LIST_LIMITS: ListLimits = { maxEntries: 5000, maxDepth: 16 };

/** Heavy or VCS-internal directories that the tree never descends into. */
const SKIPPED_DIRECTORIES = new Set(['.git', 'node_modules']);

export interface ListedEntry {
  readonly path: string;
  readonly kind: 'file' | 'directory';
}

export interface WorkspaceListing {
  readonly entries: readonly ListedEntry[];
  readonly truncated: boolean;
}

interface PendingDirectory {
  readonly canonicalPath: string;
  readonly relativePath: string;
  readonly depth: number;
}

type IncludeEntry = (relativePath: string, kind: ListedEntry['kind']) => boolean;

/**
 * Breadth-first listing of the workspace for the file tree (#33/#49).
 *
 * Fail-closed choices: links and junctions (and other reparse points the OS reports as
 * links) are not listed or descended into; names the lexical policy would reject are
 * omitted, so every listed path is a valid `readFile` request. Hard-linked files are listed
 * but `readVerifiedTextFile` refuses them.
 */
export async function listWorkspace(
  root: WorkspaceRoot,
  limits: ListLimits = DEFAULT_LIST_LIMITS,
  include?: IncludeEntry,
): Promise<PolicyResult<WorkspaceListing>> {
  const rootCheck = await verifyWorkspaceRoot(root);
  if (!rootCheck.ok) {
    return rootCheck;
  }
  const entries: ListedEntry[] = [];
  let truncated = false;
  const queue: PendingDirectory[] = [
    { canonicalPath: root.canonicalPath, relativePath: '', depth: 0 },
  ];

  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const children =
      include === undefined
        ? policyOk(await readChildren(next))
        : await readFilteredChildren(root, next, include, limits.maxEntries - entries.length + 1);
    if (!children.ok) return children;
    for (const child of children.value) {
      if (entries.length >= limits.maxEntries) {
        return policyOk({ entries, truncated: true });
      }
      entries.push({ path: child.relativePath, kind: child.kind });
      if (child.kind === 'file') {
        continue;
      }
      if (next.depth + 1 < limits.maxDepth) {
        queue.push({
          canonicalPath: path.join(next.canonicalPath, child.name),
          relativePath: child.relativePath,
          depth: next.depth + 1,
        });
      } else {
        truncated = true;
      }
    }
  }
  return policyOk({ entries, truncated });
}

interface ListableChild {
  readonly name: string;
  readonly relativePath: string;
  readonly kind: 'file' | 'directory';
}

/** Agent discovery verifies the directory before and after scanning it and omits linked files. */
async function readFilteredChildren(
  root: WorkspaceRoot,
  directory: PendingDirectory,
  include: IncludeEntry,
  limit: number,
): Promise<PolicyResult<ListableChild[]>> {
  const checked = await resolveWorkspacePath(root, directory.relativePath || '.', 'list');
  if (!checked.ok) return checked.error.code === 'ROOT_CHANGED' ? checked : policyOk([]);
  if (checked.value.followedLink || checked.value.canonicalPath !== directory.canonicalPath) {
    return policyOk([]);
  }

  const included: ListableChild[] = [];
  for (const child of await readChildren(directory)) {
    if (!include(child.relativePath, child.kind)) continue;
    if (!(await isDiscoverableEntry(path.join(directory.canonicalPath, child.name), child.kind))) {
      continue;
    }
    included.push(child);
    if (included.length >= limit) break;
  }

  const current = await revalidateResolvedPath(root, checked.value);
  if (!current.ok) return current.error.code === 'ROOT_CHANGED' ? current : policyOk([]);
  return policyOk(current.value.followedLink ? [] : included);
}

async function isDiscoverableEntry(candidate: string, kind: ListedEntry['kind']): Promise<boolean> {
  try {
    const stats = await lstat(candidate);
    return kind === 'directory' ? stats.isDirectory() : stats.isFile() && stats.nlink === 1;
  } catch {
    return false;
  }
}

/** Listable children of one directory in deterministic (code unit) name order. */
async function readChildren(directory: PendingDirectory): Promise<ListableChild[]> {
  let children: Dirent[];
  try {
    children = await readdir(directory.canonicalPath, { withFileTypes: true });
  } catch {
    return []; // Unreadable or vanished directory: skip it, never fail the whole tree.
  }
  const listable: ListableChild[] = [];
  for (const child of children) {
    const relativePath =
      directory.relativePath === '' ? child.name : `${directory.relativePath}/${child.name}`;
    const kind = listableKind(child, relativePath);
    if (kind !== null) {
      listable.push({ name: child.name, relativePath, kind });
    }
  }
  return listable.sort(byName);
}

/** `null` for entries the tree never offers (links, special files, skipped or invalid names). */
function listableKind(child: Dirent, relativePath: string): 'file' | 'directory' | null {
  // A '\' inside a POSIX name would re-parse as a separator, so such names are not offered.
  if (
    child.isSymbolicLink() ||
    child.name.includes('\\') ||
    !parseWorkspaceRelativePath(relativePath).ok
  ) {
    return null;
  }
  if (child.isFile()) {
    return 'file';
  }
  if (child.isDirectory() && !SKIPPED_DIRECTORIES.has(child.name)) {
    return 'directory';
  }
  return null;
}

function byName(left: ListableChild, right: ListableChild): number {
  if (left.name === right.name) {
    return 0;
  }
  return left.name < right.name ? -1 : 1;
}
