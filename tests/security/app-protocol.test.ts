import path from 'node:path';

import type { Net } from 'electron';
import { describe, expect, it, vi } from 'vitest';

import {
  APP_PROTOCOL_PRIVILEGES,
  buildAppResponseHeaders,
  registerAppProtocol,
  resolveAppAssetPath,
} from '../../src/main/app-protocol';

const ROOT = path.resolve('/opt/agentic-ide/out/renderer');

describe('#33 app:// asset resolution', () => {
  it('maps the root and asset paths inside the renderer directory', () => {
    expect(resolveAppAssetPath(ROOT, 'app://renderer/')).toBe(path.join(ROOT, 'index.html'));
    expect(resolveAppAssetPath(ROOT, 'app://renderer/index.html')).toBe(
      path.join(ROOT, 'index.html'),
    );
    expect(resolveAppAssetPath(ROOT, 'app://renderer/assets/index-abc.js')).toBe(
      path.join(ROOT, 'assets', 'index-abc.js'),
    );
    expect(resolveAppAssetPath(ROOT, 'app://renderer/assets/x.js?v=1#frag')).toBe(
      path.join(ROOT, 'assets', 'x.js'),
    );
  });

  it.each([
    'app://renderer/../main/index.js',
    'app://renderer/%2e%2e/main/index.js',
    'app://renderer/assets/%2e%2e/%2e%2e/secret.txt',
  ])('URL parsing clamps dot segments at the renderer root: %s', (url) => {
    // WHATWG URL resolves (also percent-encoded) dot segments before we see the path,
    // so these stay inside ROOT rather than escaping it.
    const resolved = resolveAppAssetPath(ROOT, url);
    expect(resolved?.startsWith(ROOT + path.sep)).toBe(true);
  });

  it.each([
    'app://renderer/..%2f..%2fsecret.txt',
    'app://renderer/..%5c..%5csecret.txt',
    'app://renderer/%00index.html',
    'app://renderer/C:%5cWindows%5cwin.ini',
    'app://renderer/C:/Windows/win.ini',
    'app://renderer/index.html:stream',
    'app://renderer/%E0%A4%A',
    'app://other/index.html',
    'file:///etc/passwd',
    'https://renderer/index.html',
    'not a url',
  ])('rejects %s', (url) => {
    expect(resolveAppAssetPath(ROOT, url)).toBeNull();
  });

  it('grants no CSP bypass, service workers or CORS relaxation', () => {
    expect(APP_PROTOCOL_PRIVILEGES).toMatchObject({
      standard: true,
      secure: true,
      bypassCSP: false,
      allowServiceWorkers: false,
      corsEnabled: false,
    });
  });

  it('adds CSP and nosniff headers to every response', () => {
    const headers = buildAppResponseHeaders(new Headers({ 'content-type': 'text/html' }), "x 'y'");
    expect(headers.get('content-security-policy')).toBe("x 'y'");
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('content-type')).toBe('text/html');
  });
});

describe('#33 app:// protocol handler', () => {
  function setup(fetchImpl: Net['fetch']) {
    let handler: ((request: Request) => Promise<Response>) | undefined;
    const protocolModule = {
      handle: vi.fn((_scheme: string, fn: (request: Request) => Promise<Response>) => {
        handler = fn;
      }),
    };
    registerAppProtocol(
      protocolModule,
      { fetch: fetchImpl },
      {
        rendererRoot: ROOT,
        csp: "default-src 'none'",
      },
    );
    if (handler === undefined) {
      throw new Error('handler not registered');
    }
    return handler;
  }

  it('serves files with security headers', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(new Response('ok', { headers: { 'content-type': 'text/html' } })),
    );
    const handler = setup(fetchImpl);
    const response = await handler(new Request('app://renderer/index.html'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('never touches the filesystem for escaping or non-GET requests', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response('secret')));
    const handler = setup(fetchImpl);
    expect((await handler(new Request('app://renderer/..%5c..%5csecret.txt'))).status).toBe(404);
    expect((await handler(new Request('app://renderer/..%2f..%2fsecret.txt'))).status).toBe(404);
    expect(
      (await handler(new Request('app://renderer/index.html', { method: 'POST', body: 'x' })))
        .status,
    ).toBe(405);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns 404 when the bundled file is missing', async () => {
    const handler = setup(() => Promise.resolve(new Response('', { status: 404 })));
    expect((await handler(new Request('app://renderer/missing.js'))).status).toBe(404);
  });
});
