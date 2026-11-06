import path from 'node:path';

import { app, BrowserWindow, net, protocol, session } from 'electron';

import { buildContentSecurityPolicy } from '../shared/csp';
import { APP_PROTOCOL_PRIVILEGES, registerAppProtocol } from './app-protocol';
import { APP_SCHEME } from './app-protocol-constants';
import { isTrustedRendererUrl, resolveRendererSource } from './renderer-source';
import { hardenSession, hardenWebContents } from './security';
import { createMainWindow } from './window';

protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: APP_PROTOCOL_PRIVILEGES }]);
app.enableSandbox();

const rendererSource = resolveRendererSource({
  isPackaged: app.isPackaged,
  devServerUrl: process.env.ELECTRON_RENDERER_URL,
});

function bootstrap(): void {
  hardenSession(session.defaultSession);
  registerAppProtocol(protocol, net, {
    rendererRoot: path.join(__dirname, '../renderer'),
    csp: buildContentSecurityPolicy({
      dev: rendererSource.kind === 'dev-server',
      delivery: 'header',
    }),
  });
  createMainWindow({
    preloadPath: path.join(__dirname, '../preload/index.js'),
    source: rendererSource,
    allowDevTools: !app.isPackaged,
  });
}

if (app.requestSingleInstanceLock()) {
  app.on('web-contents-created', (_event, contents) => {
    hardenWebContents(contents, (url) => isTrustedRendererUrl(url, rendererSource));
  });
  app.on('second-instance', () => {
    const [existing] = BrowserWindow.getAllWindows();
    if (existing !== undefined) {
      if (existing.isMinimized()) {
        existing.restore();
      }
      existing.focus();
    }
  });
  app.on('window-all-closed', () => {
    app.quit();
  });
  app
    .whenReady()
    .then(bootstrap)
    .catch((error: unknown) => {
      console.error('Agentic IDE failed to start', error);
      app.exit(1);
    });
} else {
  app.quit();
}
