import { policyFail, policyOk, type PolicyResult } from './policy-result';
import { resolveWorkspacePath } from './resolve-path';
import { readResolvedTextSnapshot } from './verified-read';
import type { WorkspaceRoot } from './workspace-root';

const IGNORE_FILE = '.agentignore';
const MAX_IGNORE_BYTES = 16 * 1024;
const MAX_RULES = 128;
const MAX_RULE_LENGTH = 256;
const PROTECTED_SEGMENT =
  /^(?:\.git|\.ssh|\.agentignore|\.npmrc|credentials\.json|secrets|private|keys)$/;
const SENSITIVE_NAME = /^(?:\.env(?:\..*)?|id_(?:rsa|dsa|ed25519|ecdsa)(?:\.pub)?)$/;
const SENSITIVE_EXTENSION = /\.(?:key|pem|p12|pfx|secret)$/;

interface IgnoreRule {
  readonly parts: readonly string[];
  readonly directoryOnly: boolean;
}

/** Checks the canonical path against immutable defaults and the current root .agentignore. */
export async function checkWriteProtection(
  root: WorkspaceRoot,
  canonicalRelativePath: string,
): Promise<PolicyResult<true>> {
  const parts = canonicalRelativePath.toLowerCase().split('/');
  if (
    parts.some(
      (part, index) =>
        PROTECTED_SEGMENT.test(part) ||
        SENSITIVE_NAME.test(part) ||
        SENSITIVE_EXTENSION.test(part) ||
        (part === 'credentials' && parts[index - 1] === '.aws'),
    )
  ) {
    return policyFail('PROTECTED_PATH');
  }

  // Use write-intent resolution even though the policy file is only read: configuration
  // through a link is ambiguous and must never weaken the protections.
  const resolved = await resolveWorkspacePath(root, IGNORE_FILE, 'write');
  if (!resolved.ok) {
    if (resolved.error.code === 'NOT_FOUND') return policyOk(true);
    return policyFail(
      resolved.error.code === 'ROOT_CHANGED' ? 'ROOT_CHANGED' : 'PROTECTION_UNAVAILABLE',
    );
  }
  const snapshot = await readResolvedTextSnapshot(resolved.value, MAX_IGNORE_BYTES);
  if (!snapshot.ok) return policyFail('PROTECTION_UNAVAILABLE');

  const rules = parseIgnoreRules(snapshot.value.content);
  if (rules === null) return policyFail('PROTECTION_UNAVAILABLE');
  return rules.some((rule) => matchesRule(parts, rule))
    ? policyFail('PROTECTED_PATH')
    : policyOk(true);
}

function parseIgnoreRules(content: string): IgnoreRule[] | null {
  const rules: IgnoreRule[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/[ \t]+$/, '').toLowerCase();
    // Ignore negations: users can add protections, never undo them with a pattern.
    if (line === '' || line.startsWith('#') || line.startsWith('!')) continue;
    if (rules.length >= MAX_RULES || line.length > MAX_RULE_LENGTH || /[\\[\]\p{Cc}]/u.test(line)) {
      return null;
    }
    const anchored = line.startsWith('/');
    const directoryOnly = line.endsWith('/');
    const parts = line.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.some((part) => part === '' || part === '.' || part === '..')) return null;
    if (!anchored && parts.length === 1) parts.unshift('**');
    rules.push({ parts, directoryOnly });
  }
  return rules;
}

/** A matched prefix also protects everything under it. No regular-expression backtracking. */
function matchesRule(path: readonly string[], rule: IgnoreRule): boolean {
  const limit = path.length - (rule.directoryOnly ? 1 : 0);
  const offsets = new Uint8Array(limit + 1);
  offsets[0] = 1;
  for (const part of rule.parts) {
    if (part === '**') {
      // A globstar can consume any number of segments after the first reachable offset.
      const first = offsets.indexOf(1);
      if (first === -1) return false;
      offsets.fill(1, first);
      continue;
    }
    for (let index = limit; index > 0; index -= 1) {
      const candidate = path[index - 1];
      offsets[index] =
        offsets[index - 1] === 1 && candidate !== undefined && matchesPart(candidate, part) ? 1 : 0;
    }
    offsets[0] = 0;
  }
  return offsets.includes(1);
}

function matchesPart(value: string, pattern: string): boolean {
  let offset = 0;
  let next = 0;
  let star = -1;
  let endOfStar = 0;
  while (offset < value.length) {
    const token = pattern[next];
    if (token === '*') {
      star = next++;
      endOfStar = offset;
    } else if (token === '?') {
      offset = nextCharacter(value, offset);
      next += 1;
    } else if (token === value[offset]) {
      offset += 1;
      next += 1;
    } else if (star !== -1) {
      endOfStar = nextCharacter(value, endOfStar);
      offset = endOfStar;
      next = star + 1;
    } else {
      return false;
    }
  }
  while (pattern[next] === '*') next += 1;
  return next === pattern.length;
}

function nextCharacter(value: string, offset: number): number {
  return offset + ((value.codePointAt(offset) ?? 0) > 0xffff ? 2 : 1);
}
