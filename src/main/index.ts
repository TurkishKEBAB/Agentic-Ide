import path from 'node:path';

import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { app, dialog, ipcMain, net, protocol, safeStorage, session } from 'electron';

import { buildContentSecurityPolicy } from '../shared/csp';
import { APP_PROTOCOL_PRIVILEGES, registerAppProtocol } from './app-protocol';
import { APP_SCHEME } from './app-protocol-constants';
import { registerSetupIpc } from './ipc/register-setup-ipc';
import { registerWorkspaceIpc } from './ipc/register-workspace-ipc';
import { isAuthorizedSender } from './ipc/sender-guard';
import { SetupBroker } from './ipc/setup-broker';
import { SetupStore } from './ipc/setup-store';
import { WorkspaceBroker } from './ipc/workspace-broker';
import { isTrustedRendererUrl, resolveRendererSource } from './renderer-source';
import { hardenSession, hardenWebContents } from './security';
import { createMainWindow } from './window';

protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: APP_PROTOCOL_PRIVILEGES }]);
app.enableSandbox();

const rendererSource = resolveRendererSource({
  isPackaged: app.isPackaged,
  devServerUrl: process.env.ELECTRON_RENDERER_URL,
});

let mainWindow: BrowserWindow | null = null;

/** Native folder picker owned by the main process; the renderer never sends a root path. */
async function pickWorkspaceFolder(): Promise<string | null> {
  const options = { title: 'Çalışma klasörünü seç', properties: ['openDirectory' as const] };
  const result =
    mainWindow === null
      ? await dialog.showOpenDialog(options)
      : await dialog.showOpenDialog(mainWindow, options);
  return result.canceled ? null : (result.filePaths[0] ?? null);
}

function bootstrap(): void {
  hardenSession(session.defaultSession);
  registerAppProtocol(protocol, net, {
    rendererRoot: path.join(__dirname, '../renderer'),
    csp: buildContentSecurityPolicy({
      dev: rendererSource.kind === 'dev-server',
      delivery: 'header',
    }),
  });
  const isAuthorized = (event: IpcMainInvokeEvent): boolean =>
    isAuthorizedSender(event, {
      source: rendererSource,
      appWebContentsId: () =>
        mainWindow === null || mainWindow.isDestroyed() ? null : mainWindow.webContents.id,
    });
  const workspace = new WorkspaceBroker(pickWorkspaceFolder);
  const setup = new SetupBroker(
    new SetupStore(path.join(app.getPath('userData'), 'onboarding.json')),
    safeStorage,
    workspace,
  );
  registerWorkspaceIpc(
    ipcMain,
    {
      chooseWorkspace: () => workspace.chooseWorkspace((root) => setup.rememberWorkspace(root)),
      listFiles: () => workspace.listFiles(),
      readFile: (relativePath) => workspace.readFile(relativePath),
      saveFile: (relativePath, content, revision) =>
        workspace.saveFile(relativePath, content, revision),
    },
    isAuthorized,
  );
  registerSetupIpc(ipcMain, setup, isAuthorized);
  mainWindow = createMainWindow({
    preloadPath: path.join(__dirname, '../preload/index.js'),
    source: rendererSource,
    allowDevTools: !app.isPackaged,
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

if (app.requestSingleInstanceLock()) {
  app.on('web-contents-created', (_event, contents) => {
    hardenWebContents(contents, (url) => isTrustedRendererUrl(url, rendererSource));
  });
  app.on('second-instance', () => {
    if (mainWindow !== null) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
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
