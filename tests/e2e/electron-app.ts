import path from 'node:path';

import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

// Playwright loads specs as CommonJS (the package has no "type": "module").
const REPO_ROOT = path.resolve(__dirname, '../..');
export const MAIN_ENTRY = path.join(REPO_ROOT, 'out/main/index.js');

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
export async function launchApp(): Promise<LaunchedApp> {
  const app = await electron.launch({ args: [MAIN_ENTRY], env: electronEnvironment() });
  const window = await app.firstWindow();
  const consoleErrors: string[] = [];
  window.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  window.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });
  return { app, window, consoleErrors };
}
