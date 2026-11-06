import { EventEmitter } from 'node:events';

import type { Session, WebContents } from 'electron';
import { describe, expect, it, vi } from 'vitest';

import { buildContentSecurityPolicy } from '../../src/shared/csp';
import {
  BUNDLED_RENDERER_URL,
  isTrustedRendererUrl,
  resolveRendererSource,
} from '../../src/main/renderer-source';
import { hardenSession, hardenWebContents } from '../../src/main/security';
import { buildMainWindowOptions, buildSecureWebPreferences } from '../../src/main/window-options';

describe('#33 BrowserWindow web preferences', () => {
  const preferences = buildSecureWebPreferences({
    preloadPath: '/app/preload.js',
    allowDevTools: false,
  });

  it('isolates the renderer from Node and enables the Chromium sandbox', () => {
    expect(preferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      navigateOnDragDrop: false,
    });
  });

  it('loads only the given preload and keeps devtools off when not allowed', () => {
    expect(preferences.preload).toBe('/app/preload.js');
    expect(preferences.devTools).toBe(false);
  });

  it('keeps the window hidden until ready and embeds the hardened preferences', () => {
    const options = buildMainWindowOptions({ preloadPath: '/p.js', allowDevTools: true });
    expect(options.show).toBe(false);
    expect(options.webPreferences).toEqual(
      buildSecureWebPreferences({ preloadPath: '/p.js', allowDevTools: true }),
    );
  });
});

describe('#33 renderer source selection', () => {
  it('uses the bundled app:// entry for packaged builds even if a dev URL is inherited', () => {
    const source = resolveRendererSource({
      isPackaged: true,
      devServerUrl: 'http://localhost:5173',
    });
    expect(source).toMatchObject({ kind: 'bundled', url: BUNDLED_RENDERER_URL });
  });

  it.each([
    'https://attacker.example/',
    'http://attacker.example:5173/',
    'file:///C:/evil/index.html',
    'http://localhost.attacker.example/',
    'not a url',
    '',
  ])('ignores a non-loopback or malformed dev server URL: %s', (devServerUrl) => {
    expect(resolveRendererSource({ isPackaged: false, devServerUrl }).kind).toBe('bundled');
  });

  it.each(['http://localhost:5173/', 'http://127.0.0.1:5173/', 'http://[::1]:5173/'])(
    'accepts a loopback dev server for unpackaged runs: %s',
    (devServerUrl) => {
      expect(resolveRendererSource({ isPackaged: false, devServerUrl }).kind).toBe('dev-server');
    },
  );

  it('trusts only the renderer origin', () => {
    const bundled = resolveRendererSource({ isPackaged: true, devServerUrl: undefined });
    expect(isTrustedRendererUrl('app://renderer/index.html', bundled)).toBe(true);
    expect(isTrustedRendererUrl('app://renderer/assets/x.js', bundled)).toBe(true);
    expect(isTrustedRendererUrl('app://other/index.html', bundled)).toBe(false);
    expect(isTrustedRendererUrl('https://renderer/index.html', bundled)).toBe(false);
    expect(isTrustedRendererUrl('file:///C:/index.html', bundled)).toBe(false);
    expect(isTrustedRendererUrl('::::', bundled)).toBe(false);

    const dev = resolveRendererSource({ isPackaged: false, devServerUrl: 'http://localhost:5173' });
    expect(isTrustedRendererUrl('http://localhost:5173/index.html', dev)).toBe(true);
    expect(isTrustedRendererUrl('http://localhost:5174/index.html', dev)).toBe(false);
    expect(isTrustedRendererUrl('app://renderer/index.html', dev)).toBe(false);
  });
});

describe('#33 content security policy', () => {
  const production = buildContentSecurityPolicy({ dev: false, delivery: 'header' });

  it('denies by default and allows scripts/workers only from the app origin', () => {
    expect(production).toContain("default-src 'none'");
    expect(production).toContain("script-src 'self'");
    expect(production).toContain("worker-src 'self'");
    expect(production).toContain("object-src 'none'");
    expect(production).toContain("frame-ancestors 'none'");
  });

  it('never allows inline/eval scripts or remote origins', () => {
    for (const policy of [
      production,
      buildContentSecurityPolicy({ dev: true, delivery: 'meta' }),
    ]) {
      const scriptSrc = /script-src ([^;]*)/.exec(policy)?.[1] ?? '';
      expect(scriptSrc).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
      expect(policy).not.toMatch(/https?:\/\//);
    }
  });

  it('allows the HMR websocket only in dev and omits frame-ancestors from <meta>', () => {
    expect(production).not.toContain('ws://');
    const devMeta = buildContentSecurityPolicy({ dev: true, delivery: 'meta' });
    expect(devMeta).toContain('ws://localhost:*');
    expect(devMeta).not.toContain('frame-ancestors');
  });
});

describe('#33 session and web contents hardening', () => {
  it('denies every permission request/check and blocks downloads', () => {
    const emitter = new EventEmitter();
    const session = Object.assign(emitter, {
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn(),
      setDevicePermissionHandler: vi.fn(),
    });
    hardenSession(session as unknown as Session);

    const requestHandler = session.setPermissionRequestHandler.mock.calls[0]?.[0] as (
      ...args: unknown[]
    ) => void;
    const callback = vi.fn();
    requestHandler({}, 'media', callback);
    expect(callback).toHaveBeenCalledWith(false);

    const checkHandler = session.setPermissionCheckHandler.mock.calls[0]?.[0] as () => boolean;
    expect(checkHandler()).toBe(false);
    const deviceHandler = session.setDevicePermissionHandler.mock.calls[0]?.[0] as () => boolean;
    expect(deviceHandler()).toBe(false);

    const download = { preventDefault: vi.fn() };
    emitter.emit('will-download', download);
    expect(download.preventDefault).toHaveBeenCalled();
  });

  it('blocks untrusted navigation/redirects, webviews and window.open', () => {
    const emitter = new EventEmitter();
    const contents = Object.assign(emitter, { setWindowOpenHandler: vi.fn() });
    hardenWebContents(contents as unknown as WebContents, (url) =>
      url.startsWith('app://renderer/'),
    );

    for (const event of ['will-navigate', 'will-redirect']) {
      const blocked = { preventDefault: vi.fn() };
      emitter.emit(event, blocked, 'https://attacker.example/');
      expect(blocked.preventDefault).toHaveBeenCalled();
      const allowed = { preventDefault: vi.fn() };
      emitter.emit(event, allowed, 'app://renderer/index.html');
      expect(allowed.preventDefault).not.toHaveBeenCalled();
    }

    const webview = { preventDefault: vi.fn() };
    emitter.emit('will-attach-webview', webview);
    expect(webview.preventDefault).toHaveBeenCalled();

    const openHandler = contents.setWindowOpenHandler.mock.calls[0]?.[0] as () => unknown;
    expect(openHandler()).toEqual({ action: 'deny' });
  });
});
