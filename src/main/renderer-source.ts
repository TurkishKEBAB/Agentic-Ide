import { APP_HOST, APP_SCHEME } from './app-protocol-constants';

/** Where the renderer document is loaded from. */
export type RendererSource =
  | { readonly kind: 'bundled'; readonly url: string; readonly origin: string }
  | { readonly kind: 'dev-server'; readonly url: string; readonly origin: string };

export const BUNDLED_RENDERER_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
export const BUNDLED_RENDERER_URL = `${BUNDLED_RENDERER_ORIGIN}/index.html`;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Chooses the renderer entry. The electron-vite dev server URL is honoured only for
 * unpackaged runs and only when it is an http loopback URL, so an inherited environment
 * variable cannot point a privileged window (with the preload API) at a remote page.
 */
export function resolveRendererSource(input: {
  readonly isPackaged: boolean;
  readonly devServerUrl: string | undefined;
}): RendererSource {
  if (!input.isPackaged && input.devServerUrl !== undefined && input.devServerUrl !== '') {
    const parsed = safeParseUrl(input.devServerUrl);
    if (parsed?.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname)) {
      return { kind: 'dev-server', url: parsed.href, origin: parsed.origin };
    }
  }
  return { kind: 'bundled', url: BUNDLED_RENDERER_URL, origin: BUNDLED_RENDERER_ORIGIN };
}

/**
 * True only for URLs on the renderer's own origin. Used for navigation guards and for
 * authenticating IPC senders; anything unparsable is untrusted.
 */
export function isTrustedRendererUrl(candidate: string, source: RendererSource): boolean {
  const parsed = safeParseUrl(candidate);
  if (parsed === null) {
    return false;
  }
  if (source.kind === 'bundled') {
    // Custom standard schemes report origin "null" in WHATWG URL, so compare parts.
    return parsed.protocol === `${APP_SCHEME}:` && parsed.host === APP_HOST;
  }
  return parsed.origin === source.origin;
}

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
