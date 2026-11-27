export const paths = {
  session: 'src/auth/session.ts',
  login: 'src/auth/login.ts',
  token: 'src/auth/token.ts',
  middleware: 'src/http/middleware.ts',
  env: '.env',
  readme: 'README.md',
} as const;

export type Files = Record<string, string>;

export function projectFiles(): Files {
  return {
    [paths.session]: `// The authenticated state carried across requests.

export interface AuthSession {
  userId: string;
  token: string;
}

export type SessionResult = AuthSession | null;
`,
    [paths.login]: `import type { AuthSession } from './session';
import { createToken } from './token';

type User = { id: string; active: boolean };

export function login(user: User): AuthSession | null {
  if (!user.active) return null;
  const token = createToken(user.id);
  return { userId: user.id, token };
}
`,
    [paths.token]: `export const SESSION_TTL_MS = 30 * 60 * 1000;

export function createToken(userId: string): string {
  return \`demo.\${userId}.\${crypto.randomUUID()}\`;
}
`,
    [paths.middleware]: `import type { AuthSession } from '../auth/session';

export function isAuthenticated(
  session: AuthSession | null,
): session is AuthSession {
  if (!session) return false;
  return session.token.length > 0;
}
`,
    [paths.readme]: '# auth-lab\n\nPractice workspace for session and token management.\n',
    [paths.env]: `# Synthetic workspace configuration
NODE_ENV=development
SESSION_TTL_MINUTES=30
`,
  };
}

export const defaultWorkset = [paths.session, paths.login, paths.middleware];
export const WORKSET_LIMIT = 5;

export function syntax(text: string, escape: (value: string) => string): string {
  const tokens = /(\/\/.*$|#[^\n]*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`)|(\b(?:export|interface|type|import|from|const|let|function|return|if|new|null|false|true|is)\b)|(\b(?:string|boolean|number|Date|AuthSession|SessionResult|User)\b)|(\b\d+\b)/g;
  let output = '';
  let offset = 0;
  for (const match of text.matchAll(tokens)) {
    const start = match.index;
    const kind = match[1] ? 'comment' : match[2] ? 'string' : match[3] ? 'keyword' : match[4] ? 'type' : 'number';
    output += escape(text.slice(offset, start)) + `<span class="tok-${kind}">${escape(match[0])}</span>`;
    offset = start + match[0].length;
  }
  return output + escape(text.slice(offset));
}
