import { paths, type Files } from './project.ts';
import type { TaskRequest } from './state.ts';

export const documentationRequest = 'Oturum süre sabitinin kullanımını belgele';

export type GroupId = 'core' | 'notes' | 'env' | 'boundary' | 'large';
export type PlanVariant = 'initial' | 'clean' | 'outside' | 'large';

export interface Change {
  path: string;
  title: string;
  reason: string;
  before: string;
  after: string;
}

export interface ChangeGroup {
  id: GroupId;
  title: string;
  detail: string;
  linked: boolean;
  changes: Change[];
}

export interface Source {
  path: string;
  from: number;
  to: number;
  reason: string;
  lines: string[];
  focus: number;
}

export interface Plan {
  request: TaskRequest;
  revision: number;
  baseVersion: number;
  variant: PlanVariant;
  groups: ChangeGroup[];
  sources: Source[];
  anchorProblems: string[];
}

const coreSpecs = [
  {
    path: paths.session,
    title: 'Oturum sözleşmesi',
    reason: 'Oturum tipine zorunlu bitiş alanını ekle.',
    context: 'AuthSession sözleşmesi burada tanımlanıyor.',
    anchor: 'interface AuthSession',
    span: 3,
    edit(text: string): string | null {
      const expression = /(^export interface AuthSession\s*\{)([^}]*)(^\})/m;
      if (!expression.test(text)) return null;
      return text.replace(expression, (_match, start: string, body: string, end: string) => {
        const field = /(^[ \t]*expiresAt\??:\s*)[^;\n]+;/m;
        const updated = field.test(body)
          ? body.replace(field, (match, prefix: string) => match === '  expiresAt: Date;' ? match : `${prefix.replace('?:', ':')}Date;`)
          : `${body}  expiresAt: Date;\n`;
        return start + updated + end;
      });
    },
  },
  {
    path: paths.login,
    title: 'Oturumun üretildiği yer',
    reason: 'Girişte süre sabitinden bitiş tarihi üret.',
    context: 'Giriş başarılı olduğunda oturum nesnesi burada kuruluyor.',
    anchor: 'return {',
    span: 0,
    edit(text: string): string | null {
      if (/return\s*\{[^}]*\bexpiresAt\b/m.test(text)) return text;
      const tokenImport = /(import\s*\{\s*)([^}]*?)(\s*\}\s*from\s*['"]\.\/token['"])/;
      const returnedSession = /^([ \t]*)return\s*\{\s*userId:\s*user\.id,\s*token\s*\};/m;
      if (!tokenImport.test(text) || !returnedSession.test(text)) return null;
      return text
        .replace(tokenImport, (match, start: string, names: string, end: string) =>
          names.includes('SESSION_TTL_MS') ? match : `${start}${names.trimEnd()}, SESSION_TTL_MS${end}`)
        .replace(returnedSession, (_match, indent: string) =>
          `${indent}const expiresAt = new Date(Date.now() + SESSION_TTL_MS);\n${indent}return { userId: user.id, token, expiresAt };`);
    },
  },
  {
    path: paths.middleware,
    title: 'İstek denetimi',
    reason: 'Süresi dolan oturumu istekte reddet.',
    context: 'Ara katman oturumun geçerli olup olmadığına burada karar veriyor.',
    anchor: 'session.token.length',
    span: 0,
    edit(text: string): string | null {
      if (/session\.expiresAt\.getTime\(/.test(text)) return text;
      const guard = /^([ \t]*)return session\.token\.length > 0;/m;
      if (!guard.test(text)) return null;
      return text.replace(guard, (_match, indent: string) =>
        `${indent}const isCurrent = session.expiresAt.getTime() > Date.now();\n${indent}return isCurrent && session.token.length > 0;`);
    },
  },
] as const;

function sourceFor(spec: typeof coreSpecs[number], files: Files): Source {
  const lines = (files[spec.path] ?? '').split('\n');
  const index = lines.findIndex(line => line.includes(spec.anchor));
  const focus = index < 0 ? 0 : index;
  const from = spec.span ? focus : Math.max(0, focus - 2);
  const to = Math.min(lines.length - 1, focus + spec.span);
  return { path: spec.path, from: from + 1, to: to + 1, focus: focus + 1, lines: lines.slice(from, to + 1), reason: spec.context };
}

export function makePlan(request: TaskRequest, files: Files, revision: number, baseVersion: number, variant: PlanVariant): Plan {
  const anchorProblems: string[] = [];
  const documentationOnly = request.text === documentationRequest;
  const changes = (documentationOnly ? [] : coreSpecs).flatMap(spec => {
    const before = files[spec.path] ?? '';
    const after = spec.edit(before);
    if (after === null) {
      anchorProblems.push(spec.path);
      return [];
    }
    return after === before ? [] : [{ path: spec.path, title: spec.title, reason: spec.reason, before, after }];
  });
  const token = files[paths.token];
  const environment = files[paths.env];
  const note = '// This lifetime is used when a login creates a session.';
  const groups: ChangeGroup[] = [{
    id: 'core', title: 'Oturum bütünlüğü', detail: 'Arayüz ve iki kullanımı birlikte değişir.', linked: true, changes,
  }];
  if (token && !token.includes(note) && (documentationOnly || variant !== 'large')) groups.push({
    id: 'notes', title: 'Süre sabitinin açıklaması', detail: 'İsteğe bağlı kaynak kodu notu.', linked: false,
    changes: [{ path: paths.token, title: 'Süre sabitini açıkla', reason: 'Sabitin giriş akışındaki amacını tek satırla belgele.', before: token, after: `${note}\n${token}` }],
  });
  if (!documentationOnly && variant === 'initial' && environment !== undefined) groups.push({
    id: 'env', title: 'Ortam ayarı', detail: 'Sentetik test anahtarı içeren engelli adım.', linked: false,
    changes: [{
      path: paths.env, title: 'Test ayarını ekle', reason: 'Ajanın test ortamı için önerdiği ek ayar.',
      before: environment, after: environment + 'AUTH_TEST_KEY=sk_test_DEMO_FAKE_KEY_123456\n',
    }],
  });
  if (!documentationOnly && variant === 'outside') groups.push({
    id: 'boundary', title: 'Çalışma alanı dışı ayar', detail: 'Sentetik sınır ihlali örneği.', linked: false,
    changes: [{
      path: '../shared/auth.ts', title: 'Paylaşılan ayarı düzenle', reason: 'Öneri, çalışma alanının üst dizinine erişmeye çalışıyor.',
      before: '', after: 'export const defaultSessionMinutes = 30;\n',
    }],
  });
  if (!documentationOnly && variant === 'large' && token !== undefined) groups.push({
    id: 'large', title: 'Geniş örnek kataloğu', detail: 'Büyük düzenleme incelemesini tetikler.', linked: false,
    changes: [{
      path: paths.token, title: '501 örnek satır ekle', reason: 'Ayrı büyük düzenleme kararını göstermek için sentetik veri ekle.',
      before: token, after: token + Array.from({ length: 501 }, (_, i) => `// Session test fixture ${i + 1}\n`).join(''),
    }],
  });
  const sources: Source[] = documentationOnly
    ? token === undefined ? [] : [{ path: paths.token, from: 1, to: 1, focus: 1, reason: 'Oturumun ömrünü belirleyen süre sabiti burada tanımlanıyor.', lines: [token.split('\n')[0] ?? ''] }]
    : coreSpecs.map(spec => sourceFor(spec, files));
  return { request, revision, baseVersion, variant, groups: groups.filter(group => group.changes.length > 0), sources, anchorProblems };
}

export function planChanges(plan: Plan): Change[] {
  return plan.groups.flatMap(group => group.changes);
}
