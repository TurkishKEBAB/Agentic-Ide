import { diffLines, patchCounts } from './patch.ts';
import { planChanges, type Change, type Plan } from './plan.ts';
import type { Files } from './project.ts';

type Rule = 'boundary' | 'protected' | 'secret' | 'anchor';

export interface Finding {
  rule: Rule;
  path: string;
  line?: number;
}

export interface SafetyReport {
  blocking: Finding[];
  files: number;
  lines: number;
  large: boolean;
}

const providerToken = /\b(sk_(?:test|live)_)[A-Za-z0-9_-]{8,}/;
const assignedSecret = /(\b(?:[A-Z0-9_]*(?:API|TEST|PRIVATE)[_-]?KEY|[A-Z0-9_]*SECRET)[ \t]*[:=][ \t]*["']?)([A-Za-z0-9_./+=-]{12,})/i;

export function redactSecrets(line: string): string {
  if (providerToken.test(line)) return line.replace(providerToken, '$1••••••••');
  return line.replace(assignedSecret, '$1••••••••');
}

function workspacePath(path: string, files: Files): boolean {
  return !/^[\\/]|^[a-z]:|\\|\0/i.test(path)
    && path.split('/').every(part => part && part !== '..' && part !== '.')
    && Object.hasOwn(files, path);
}

function protectedPath(path: string): boolean {
  return /(?:^|\/)(?:\.env(?:\.[^/]+)?|\.agentignore|id_(?:rsa|ed25519|ecdsa)(?:\.pub)?)$/i.test(path)
    || /\.(?:pem|key|p12|pfx)$/i.test(path)
    || /(?:^|\/)(?:secrets|private|keys)\//i.test(path);
}

function addedSecretLines(change: Change): number[] {
  const found: number[] = [];
  let line = 1;
  for (const part of diffLines(change.before, change.after)) {
    if (part.removed) continue;
    for (const value of part.value) {
      if (part.added && (providerToken.test(value) || assignedSecret.test(value))) found.push(line);
      line++;
    }
  }
  return found;
}

export function checkPlan(plan: Plan, files: Files, selected: Change[]): SafetyReport {
  const blocking: Finding[] = plan.anchorProblems.map(path => ({ rule: 'anchor', path }));
  for (const change of planChanges(plan)) {
    if (!workspacePath(change.path, files)) blocking.push({ rule: 'boundary', path: change.path });
    if (protectedPath(change.path)) blocking.push({ rule: 'protected', path: change.path });
    blocking.push(...addedSecretLines(change).map(line => ({ rule: 'secret' as const, path: change.path, line })));
  }
  const selectedFiles = new Set(selected.map(change => change.path)).size;
  const lines = selected.reduce((sum, change) => {
    const count = patchCounts(change.before, change.after);
    return sum + count.added + count.removed;
  }, 0);
  return { blocking, files: selectedFiles, lines, large: selectedFiles > 20 || lines > 500 };
}
