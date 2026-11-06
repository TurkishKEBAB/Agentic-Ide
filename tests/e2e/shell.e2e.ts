import { expect, test } from '@playwright/test';

import { launchApp, type LaunchedApp } from './electron-app';

let launched: LaunchedApp;

test.beforeEach(async () => {
  launched = await launchApp();
});

test.afterEach(async () => {
  await launched.app.close();
});

test('#33 shell loads Monaco from the app:// origin', async () => {
  const { window, consoleErrors } = launched;
  await expect(window.locator('.monaco-editor')).toBeVisible();
  expect(await window.evaluate(() => location.href)).toBe('app://renderer/index.html');
  // Monaco tokenised the welcome buffer: comment tokens get a non-default `mtkN` class.
  await expect(window.locator('.view-lines span[class*="mtk"]:not(.mtk1)').first()).toBeVisible();
  expect(
    consoleErrors.filter((text) => /Content Security Policy|Worker|Refused/i.test(text)),
  ).toEqual([]);
});

test('#33 renderer has no Node, Electron or process access', async () => {
  const { app, window } = launched;
  const exposed = await window.evaluate(() => ({
    require: Reflect.has(globalThis, 'require'),
    process: Reflect.has(globalThis, 'process'),
    module: Reflect.has(globalThis, 'module'),
    buffer: Reflect.has(globalThis, 'Buffer'),
    ipcRenderer: Reflect.has(globalThis, 'ipcRenderer'),
  }));
  expect(exposed).toEqual({
    require: false,
    process: false,
    module: false,
    buffer: false,
    ipcRenderer: false,
  });

  // The OS process hosting the window must be Chromium-sandboxed (reported on Windows/macOS).
  const rendererProcess = await app.evaluate(({ app: electronApp, BrowserWindow }) => {
    const [browserWindow] = BrowserWindow.getAllWindows();
    const pid = browserWindow?.webContents.getOSProcessId();
    const metric = electronApp.getAppMetrics().find((entry) => entry.pid === pid);
    return { type: metric?.type ?? null, sandboxed: metric?.sandboxed ?? null };
  });
  expect(rendererProcess.type).toBe('Tab');
  if (process.platform === 'win32' || process.platform === 'darwin') {
    expect(rendererProcess.sandboxed).toBe(true);
  }
});

test('#33 renderer cannot navigate away or open new windows', async () => {
  const { app, window: page } = launched;
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await page.evaluate(() => {
    window.open('https://example.com', '_blank');
    location.href = 'https://example.com/';
  });
  await page.waitForTimeout(500);
  expect(app.windows()).toHaveLength(1);
  expect(await page.evaluate(() => location.href)).toBe('app://renderer/index.html');
});

test('#33 editor buffer is read-only', async () => {
  const { window } = launched;
  const lines = window.locator('.view-lines');
  await expect(lines).toBeVisible();
  const before = await lines.innerText();
  await window.locator('.monaco-editor').click();
  await window.keyboard.type('agent write attempt');
  await window.keyboard.press('Enter');
  expect(await lines.innerText()).toBe(before);
});
