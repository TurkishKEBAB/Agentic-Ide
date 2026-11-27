import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

// Playwright loads specs as CommonJS (the package has no "type": "module").
const REPO_ROOT = path.resolve(__dirname, '../..');
export const MAIN_ENTRY = path.join(REPO_ROOT, 'out/main/index.js');
const temporaryProfiles = new WeakMap<ElectronApplication, string>();

/**
 * Environment for the Electron child. `ELECTRON_RUN_AS_NODE` (set by some IDE hosts) would
 * turn Electron into plain Node, and `ELECTRON_RENDERER_URL` must not redirect the window.
 */
function electronEnvironment(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE' && key !== 'ELECTRON_RENDERER_URL') {
      env[key] = value;
    }
  }
  return env;
}

export interface LaunchedApp {
  readonly app: ElectronApplication;
  readonly window: Page;
  readonly consoleErrors: string[];
}

/** Launches the built app and records renderer console errors (CSP violations surface here). */
export async function launchApp(userDataDir?: string): Promise<LaunchedApp> {
  const profile =
    userDataDir ?? (await mkdtemp(path.join(os.tmpdir(), 'agentic-ide-e2e-profile-')));
  let app: ElectronApplication | undefined;
  let window: Page;
  try {
    app = await electron.launch({
      args: [MAIN_ENTRY, `--user-data-dir=${profile}`],
      env: electronEnvironment(),
    });
    if (userDataDir === undefined) temporaryProfiles.set(app, profile);
    window = await app.firstWindow();
  } catch (error) {
    if (app) await closeApp(app);
    else if (userDataDir === undefined) await removeProfile(profile);
    throw error;
  }
  const consoleErrors: string[] = [];
  window.on('console', (message) => {
    if (
      message.type() === 'error' ||
      (message.type() === 'warning' && /worker/i.test(message.text()))
    ) {
      consoleErrors.push(message.text());
    }
  });
  window.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });
  return { app, window, consoleErrors };
}

/** Test teardown deliberately discards buffers without opening a native confirmation. */
export async function closeApp(app: ElectronApplication): Promise<void> {
  try {
    await app.evaluate(({ app: electronApp, BrowserWindow }) => {
      electronApp.removeAllListeners('window-all-closed');
      for (const window of BrowserWindow.getAllWindows()) {
        window.destroy();
      }
    });
  } finally {
    try {
      await app.close();
    } finally {
      const profile = temporaryProfiles.get(app);
      if (profile !== undefined) await removeProfile(profile);
    }
  }
}

async function removeProfile(profile: string): Promise<void> {
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 75 });
}
