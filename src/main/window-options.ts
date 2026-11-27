import type { BrowserWindowConstructorOptions, WebPreferences } from 'electron';

/**
 * Renderer hardening required by #33: no Node integration, isolated context, Chromium
 * sandbox and no webview/insecure content. Kept free of runtime Electron imports so the
 * policy can be asserted in unit tests.
 */
export function buildSecureWebPreferences(input: {
  readonly preloadPath: string;
  readonly allowDevTools: boolean;
}): WebPreferences {
  return {
    preload: input.preloadPath,
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
    safeDialogs: true,
    spellcheck: false,
    devTools: input.allowDevTools,
  };
}

/** Main window options; the window stays hidden until the first paint is ready. */
export function buildMainWindowOptions(input: {
  readonly preloadPath: string;
  readonly allowDevTools: boolean;
}): BrowserWindowConstructorOptions {
  return {
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: 'Agentic IDE',
    backgroundColor: '#1e1e1e',
    autoHideMenuBar: true,
    webPreferences: buildSecureWebPreferences(input),
  };
}
