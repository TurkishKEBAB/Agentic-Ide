import { listWorkspace, type ListLimits, type WorkspaceListing } from './list-workspace';
import { policyFail, policyOk, type PolicyResult } from './policy-result';
import { checkWorkspaceProtection, loadWorkspaceProtection } from './protected-paths';
import { revalidateResolvedPath, resolveWorkspacePath } from './resolve-path';
import {
  matchesFileVersion,
  readResolvedTextSnapshot,
  type VerifiedTextFile,
} from './verified-read';
import type { WorkspaceRoot } from './workspace-root';

/** Main-process source discovery for context trees and index jobs. */
export async function listAgentWorkspace(
  root: WorkspaceRoot,
  limits: ListLimits,
  privateRoots: readonly string[],
): Promise<PolicyResult<WorkspaceListing>> {
  const excludes = await loadWorkspaceProtection(root, privateRoots);
  if (!excludes.ok) return excludes;
  if (excludes.value('', 'directory')) return policyFail('PROTECTED_PATH');
  const listing = await listWorkspace(
    root,
    limits,
    (relativePath, kind) => !excludes.value(relativePath, kind),
  );
  if (!listing.ok) return listing;

  // Re-read the policy before publishing paths. Protected paths cannot be recovered from
  // a stale listing if the user adds exclusions while discovery is running.
  const current = await loadWorkspaceProtection(root, privateRoots);
  if (!current.ok) return current;
  if (current.value('', 'directory')) return policyFail('PROTECTED_PATH');
  const { entries, truncated } = listing.value;
  return policyOk({
    entries: entries.filter(({ path: relative, kind }) => !current.value(relative, kind)),
    truncated,
  });
}

/** All agent content sources use this check, including explicit, active-file and pinned requests. */
export async function readAgentWorkspaceFile(
  root: WorkspaceRoot,
  input: unknown,
  privateRoots: readonly string[],
): Promise<PolicyResult<VerifiedTextFile>> {
  const resolved = await resolveWorkspacePath(root, input, 'read');
  if (!resolved.ok) return resolved;
  if (resolved.value.followedLink) return policyFail('LINK_NOT_ALLOWED');

  const { relativePath } = resolved.value;
  const allowed = await checkWorkspaceProtection(root, relativePath, privateRoots);
  if (!allowed.ok) return allowed;

  const snapshot = await readResolvedTextSnapshot(resolved.value);
  if (!snapshot.ok) return snapshot;
  const current = await checkWorkspaceProtection(root, relativePath, privateRoots);
  if (!current.ok) return current;
  const checked = await revalidateResolvedPath(root, resolved.value);
  if (!checked.ok) return checked;
  if (checked.value.followedLink || !matchesFileVersion(snapshot.value.stats, checked.value)) {
    return policyFail('TARGET_CHANGED');
  }
  const { content, sizeBytes } = snapshot.value;
  return policyOk({ relativePath, content, sizeBytes });
}
