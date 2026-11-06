import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { CustomScheme, Net, Protocol } from 'electron';

import { APP_HOST, APP_SCHEME } from './app-protocol-constants';

/**
 * `standard` gives the scheme an origin and relative URL resolution, `secure` makes it a
 * secure context. No CSP bypass, service workers or CORS relaxations are granted.
 */
export const APP_PROTOCOL_PRIVILEGES: NonNullable<CustomScheme['privileges']> = {
  standard: true,
  secure: true,
  supportFetchAPI: true,
  bypassCSP: false,
  allowServiceWorkers: false,
  corsEnabled: false,
  stream: false,
};

/**
 * Maps an `app://renderer/...` request to a file inside the bundled renderer directory.
 * Returns `null` for any other scheme/host, encoded separators, NUL bytes, drive/stream
 * syntax or paths that would leave `rendererRoot`.
 */
export function resolveAppAssetPath(rendererRoot: string, requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== APP_HOST) {
    return null;
  }
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (/[\0\\:]/.test(pathname)) {
    return null;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (relative === '' || relative.split('/').some((segment) => segment === '..')) {
    return null;
  }
  const root = path.resolve(rendererRoot);
  const target = path.resolve(root, relative);
  const fromRoot = path.relative(root, target);
  if (
    fromRoot === '' ||
    fromRoot === '..' ||
    fromRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(fromRoot)
  ) {
    return null;
  }
  return target;
}

/** Security headers added to every bundled renderer response. */
export function buildAppResponseHeaders(base: Headers, csp: string): Headers {
  const headers = new Headers(base);
  headers.set('Content-Security-Policy', csp);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Referrer-Policy', 'no-referrer');
  return headers;
}

/** Serves the bundled renderer over `app://renderer/` instead of `file://`. */
export function registerAppProtocol(
  protocolModule: Pick<Protocol, 'handle'>,
  netModule: Pick<Net, 'fetch'>,
  options: { readonly rendererRoot: string; readonly csp: string },
): void {
  protocolModule.handle(APP_SCHEME, async (request) => {
    if (request.method !== 'GET') {
      return new Response(null, { status: 405 });
    }
    const assetPath = resolveAppAssetPath(options.rendererRoot, request.url);
    if (assetPath === null) {
      return new Response('Not found', { status: 404 });
    }
    const fileResponse = await netModule.fetch(pathToFileURL(assetPath).toString());
    if (!fileResponse.ok) {
      return new Response('Not found', { status: 404 });
    }
    return new Response(fileResponse.body, {
      status: 200,
      headers: buildAppResponseHeaders(fileResponse.headers, options.csp),
    });
  });
}
