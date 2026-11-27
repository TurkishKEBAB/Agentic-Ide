import { expect, test } from '@playwright/test';

import { closeApp, launchApp, type LaunchedApp } from './electron-app';

let launched: LaunchedApp;

test.beforeEach(async () => {
  launched = await launchApp();
});

test.afterEach(async () => {
  if (typeof launched !== 'undefined') await closeApp(launched.app);
});

test('the desktop entry loads the shared welcome screen from the app:// origin', async () => {
  const { window, consoleErrors } = launched;
  await expect(window.getByTestId('open-folder')).toBeVisible();
  await expect(window.getByRole('button', { name: 'İlk Göreve başla', exact: true })).toBeVisible();
  await expect(window.locator('.brand img')).toHaveJSProperty('complete', true);
  expect(
    await window.locator('.brand img').evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  expect(await window.evaluate(() => location.href)).toBe('app://renderer/index.html');
  expect(
    consoleErrors.filter((text) => /Content Security Policy|Worker|Refused/i.test(text)),
  ).toEqual([]);
});

test('the renderer has no Node, Electron or process access', async () => {
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

test('the renderer cannot navigate away or open new windows', async () => {
  const { app, window: page } = launched;
  await expect(page.getByTestId('open-folder')).toBeVisible();
  await page.evaluate(() => {
    window.open('https://example.com', '_blank');
    location.href = 'https://example.com/';
  });
  await page.waitForTimeout(500);
  expect(app.windows()).toHaveLength(1);
  expect(await page.evaluate(() => location.href)).toBe('app://renderer/index.html');
});

test('an embedded app-origin frame cannot reach preload', async () => {
  const { window: page } = launched;
  await expect(page.getByTestId('open-folder')).toBeVisible();
  // The production CSP blocks app-origin frames; the sender guard also rejects child frames.
  const exposed = await page.evaluate(async () => {
    const frame = document.createElement('iframe');
    const loaded = new Promise<void>((resolve) => {
      frame.addEventListener(
        'load',
        () => {
          resolve();
        },
        { once: true },
      );
    });
    frame.src = 'app://renderer/index.html';
    document.body.append(frame);
    try {
      await loaded;
      return frame.contentWindow !== null && 'agentIde' in frame.contentWindow;
    } catch {
      return false;
    } finally {
      frame.remove();
    }
  });
  expect(exposed).toBe(false);
});
