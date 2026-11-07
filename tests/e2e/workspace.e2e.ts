import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { MAIN_ENTRY, closeApp, launchApp, type LaunchedApp } from './electron-app';

const HELLO_PATH = 'src/hello.ts';
const HELLO_TS = "// Merhaba çalışma alanı — ğüşiöç\nexport const greeting = 'selam';\n";
const SESSION_PATH = 'src/auth/session.ts';
const NATIVE_SESSION = 'export interface AuthSession { realWorkspace: true; }\n';
const OUTSIDE_TEXT = 'OUTSIDE-SECRET\n';

interface Fixture {
  readonly base: string;
  readonly workspace: string;
  readonly outside: string;
  readonly hasEscapeLink: boolean;
  readonly hasHardLink: boolean;
}

/** Workspace with UTF-8 text, ignored directories and (when supported) escaping links. */
function createFixture(): Fixture {
  const base = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'agentic-ide-e2e-')));
  const workspace = path.join(base, 'demo-workspace');
  const outside = path.join(base, 'outside');
  fs.mkdirSync(path.join(workspace, 'src', 'auth'), { recursive: true });
  fs.mkdirSync(path.join(workspace, '.git'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'node_modules', 'pkg'), { recursive: true });
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(workspace, HELLO_PATH), HELLO_TS);
  fs.writeFileSync(path.join(workspace, SESSION_PATH), NATIVE_SESSION);
  fs.writeFileSync(path.join(workspace, 'README.md'), '# Demo\n');
  fs.writeFileSync(path.join(workspace, '.git', 'config'), '[core]\n');
  fs.writeFileSync(
    path.join(workspace, 'node_modules', 'pkg', 'index.js'),
    'module.exports = 1;\n',
  );
  fs.writeFileSync(path.join(outside, 'secret.txt'), OUTSIDE_TEXT);

  let hasEscapeLink = true;
  try {
    fs.symlinkSync(
      outside,
      path.join(workspace, 'escape-link'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } catch {
    hasEscapeLink = false;
  }
  let hasHardLink = true;
  try {
    fs.linkSync(path.join(outside, 'secret.txt'), path.join(workspace, 'hard.txt'));
  } catch {
    hasHardLink = false;
  }
  return { base, workspace, outside, hasEscapeLink, hasHardLink };
}

let fixture: Fixture;
let launched: LaunchedApp;

async function stubFolderPicker(workspace: string): Promise<void> {
  // Replace only the OS dialog, in the main process. The app still reads/writes real files.
  await launched.app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [folder] });
  }, workspace);
}

test.beforeEach(async () => {
  fixture = createFixture();
  launched = await launchApp();
  await stubFolderPicker(fixture.workspace);
});

test.afterEach(async () => {
  try {
    if (typeof launched !== 'undefined') await closeApp(launched.app);
  } finally {
    fs.rmSync(fixture.base, { recursive: true, force: true });
  }
});

async function chooseWorkspace(page: Page): Promise<void> {
  await page.getByTestId('open-folder').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('demo-workspace');
  await expect(page.getByTestId('status')).toHaveText('Yerel çalışma alanı');
}

function pickerFile(page: Page, relativePath: string) {
  return page.locator(`dialog[open] button[data-act="pick-file"][data-value="${relativePath}"]`);
}

async function openWithKeyboard(page: Page, relativePath: string): Promise<void> {
  await page.keyboard.press('ControlOrMeta+p');
  await page.getByLabel('Dosya adı veya yolu', { exact: true }).fill(relativePath);
  await pickerFile(page, relativePath).click();
  await expect(page.getByTestId('file-path')).toHaveText(relativePath);
}

async function replaceEditorText(page: Page, text: string): Promise<void> {
  await page.locator('.monaco-editor .view-lines').click({ position: { x: 15, y: 12 } });
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
}

test('the workspace tree opens UTF-8 files in the shared Monaco editor', async () => {
  const { window: page, consoleErrors } = launched;
  await chooseWorkspace(page);

  await page.getByRole('button', { name: 'Klasör ağacı', exact: true }).click();
  const tree = page.locator('#file-tree');
  await expect(tree.getByText('src', { exact: true })).toBeVisible();
  await expect(pickerFile(page, HELLO_PATH)).toBeVisible();
  await expect(pickerFile(page, 'README.md')).toBeVisible();
  // VCS/dependency folders and links are not offered.
  await expect(
    tree.locator('summary').filter({ hasText: /\.git|node_modules|escape-link/ }),
  ).toHaveCount(0);
  await expect(tree.locator('[data-path^=".git"]')).toHaveCount(0);
  await expect(tree.locator('[data-path^="node_modules"]')).toHaveCount(0);
  await expect(tree.locator('[data-path^="escape-link"]')).toHaveCount(0);

  await pickerFile(page, HELLO_PATH).click();
  await expect(page.getByTestId('file-path')).toHaveText(HELLO_PATH);
  const lines = page.locator('.view-lines');
  await expect(lines).toContainText('Merhaba çalışma alanı — ğüşiöç');
  await expect(lines).toContainText("export const greeting = 'selam';");
  await expect(lines.locator('span[class*="mtk"]:not(.mtk1)').first()).toBeVisible();
  expect(
    consoleErrors.filter((message) => /Content Security Policy|Worker|Refused/i.test(message)),
  ).toEqual([]);
});

test('drafts stay in the workset until explicitly saved with Ctrl+S', async () => {
  const { window: page } = launched;
  await chooseWorkspace(page);
  await openWithKeyboard(page, HELLO_PATH);
  const file = path.join(fixture.workspace, HELLO_PATH);
  const draft = "// Elle düzenlendi — Türkçe\nexport const greeting = 'merhaba';\n";
  const lines = page.locator('.view-lines');

  await replaceEditorText(page, draft);
  await expect(lines).toContainText('Elle düzenlendi — Türkçe');
  await expect(page.getByText('Kaydedilmedi', { exact: true })).toBeVisible();
  expect(fs.readFileSync(file, 'utf8')).toBe(HELLO_TS);

  await openWithKeyboard(page, 'README.md');
  await page.getByRole('button', { name: 'hello.ts', exact: true }).click();
  await expect(lines).toContainText('Elle düzenlendi — Türkçe');
  expect(fs.readFileSync(file, 'utf8')).toBe(HELLO_TS);

  await page.keyboard.press('ControlOrMeta+s');
  await expect.poll(() => fs.readFileSync(file, 'utf8')).toBe(draft);
  await expect(page.getByText('Kaydedilmedi', { exact: true })).toHaveCount(0);
});

test('an external edit preserves the draft and disk until reload is confirmed', async () => {
  const { window: page } = launched;
  await chooseWorkspace(page);
  await openWithKeyboard(page, HELLO_PATH);
  const file = path.join(fixture.workspace, HELLO_PATH);
  const disk = '// Diskteki yeni sürüm\nexport const external = true;\n';
  const draft = '// Kaydedilmemiş yerel taslak\nexport const local = true;\n';
  const lines = page.locator('.view-lines');
  const save = page.getByRole('button', { name: 'Kaydet', exact: true });

  await replaceEditorText(page, draft);
  fs.writeFileSync(file, disk);
  await save.click();
  await expect(page.getByRole('heading', { name: 'Dosya değişti', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Taslağa dön', exact: true }).click();
  await expect(lines).toContainText('Kaydedilmemiş yerel taslak');
  expect(fs.readFileSync(file, 'utf8')).toBe(disk);

  await save.click();
  await page.getByRole('button', { name: 'Diskteki sürümü yükle', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Dosyayı yeniden yükle', exact: true }),
  ).toBeVisible();
  await expect(lines).toContainText('Kaydedilmemiş yerel taslak');
  await page.getByRole('button', { name: 'Taslağı bırak ve yükle', exact: true }).click();
  await expect(lines).toContainText('Diskteki yeni sürüm');
  await expect(page.getByTestId('status')).toContainText('Diskteki sürüm yüklendi.');

  const afterReload = `${disk}// Yeni sürümden düzenlendi\n`;
  await replaceEditorText(page, afterReload);
  await save.click();
  await expect.poll(() => fs.readFileSync(file, 'utf8')).toBe(afterReload);
});

test('the frozen renderer API rejects path escapes and malformed capabilities', async () => {
  const { window: page } = launched;
  await chooseWorkspace(page);

  const surface = await page.evaluate(() => ({
    keys: Object.keys(window.agentIde).sort(),
    frozen: Object.isFrozen(window.agentIde),
  }));
  expect(surface).toEqual({
    keys: ['chooseWorkspace', 'listFiles', 'readFile', 'saveFile'],
    frozen: true,
  });

  const codes = await page.evaluate(
    async ({ absolute, hasEscapeLink, hasHardLink }) => {
      const api = window.agentIde;
      const code = async (request: Promise<{ ok: boolean; error?: { code: string } }>) => {
        const result = await request;
        return result.ok ? 'OK' : (result.error?.code ?? 'NO_CODE');
      };
      const valid = await api.readFile('README.md');
      if (!valid.ok) throw new Error('Could not read a fixture file through preload');
      const { revision } = valid.value;
      const save = (target: string) => api.saveFile(target, 'untrusted edit', revision);
      return {
        traversal: await code(api.readFile('../outside/secret.txt')),
        backslash: await code(api.readFile('src\\..\\..\\outside\\secret.txt')),
        encoded: await code(api.readFile('%2e%2e/outside/secret.txt')),
        absolute: await code(api.readFile(absolute)),
        ads: await code(api.readFile('README.md:stream')),
        directory: await code(api.readFile('src')),
        missing: await code(api.readFile('src/missing.ts')),
        // Cloneable values can cross preload even if the TypeScript interface forbids them.
        invalidRead: await code(
          (api.readFile as (value: unknown) => ReturnType<typeof api.readFile>)(['README.md']),
        ),
        invalidSave: await code(
          (api.saveFile as (...args: unknown[]) => ReturnType<typeof api.saveFile>)(
            'README.md',
            { text: 'bad' },
            revision,
          ),
        ),
        traversalSave: await code(save('../outside/secret.txt')),
        absoluteSave: await code(save(absolute)),
        escapeRead: hasEscapeLink ? await code(api.readFile('escape-link/secret.txt')) : null,
        escapeSave: hasEscapeLink ? await code(save('escape-link/secret.txt')) : null,
        hardRead: hasHardLink ? await code(api.readFile('hard.txt')) : null,
        hardSave: hasHardLink ? await code(save('hard.txt')) : null,
      };
    },
    {
      absolute: path.join(fixture.workspace, 'README.md'),
      hasEscapeLink: fixture.hasEscapeLink,
      hasHardLink: fixture.hasHardLink,
    },
  );
  expect(codes).toEqual({
    traversal: 'TRAVERSAL',
    backslash: 'TRAVERSAL',
    encoded: 'ENCODED_TRAVERSAL',
    absolute: 'ABSOLUTE_PATH',
    ads: 'INVALID_SEGMENT',
    directory: 'UNSUPPORTED_FILE_TYPE',
    missing: 'NOT_FOUND',
    invalidRead: 'INVALID_REQUEST',
    invalidSave: 'INVALID_REQUEST',
    traversalSave: 'TRAVERSAL',
    absoluteSave: 'ABSOLUTE_PATH',
    escapeRead: fixture.hasEscapeLink ? 'LINK_ESCAPE' : null,
    escapeSave: fixture.hasEscapeLink ? 'LINK_NOT_ALLOWED' : null,
    hardRead: fixture.hasHardLink ? 'HARDLINK_UNSUPPORTED' : null,
    hardSave: fixture.hasHardLink ? 'HARDLINK_UNSUPPORTED' : null,
  });
  expect(fs.readFileSync(path.join(fixture.outside, 'secret.txt'), 'utf8')).toBe(OUTSIDE_TEXT);
});

test('the broker rejects a real IPC call from another window on the same origin', async () => {
  const { app, window: page } = launched;
  await chooseWorkspace(page);
  const preload = path.resolve(path.dirname(MAIN_ENTRY), '../preload/index.js');
  const result = await app.evaluate(async ({ BrowserWindow }, preloadPath) => {
    const probe = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    try {
      await probe.loadURL('app://renderer/index.html');
      const replies: unknown = await probe.webContents.executeJavaScript(`Promise.all([
        window.agentIde.listFiles(),
        window.agentIde.saveFile('README.md', 'unauthorized', '0'.repeat(64))
      ])`);
      return replies;
    } finally {
      probe.destroy();
    }
  }, preload);
  const denied = expect.objectContaining({
    ok: false,
    error: expect.objectContaining({ code: 'UNAUTHORIZED_SENDER' }),
  });
  expect(result).toEqual([denied, denied]);
  expect(fs.readFileSync(path.join(fixture.workspace, 'README.md'), 'utf8')).toBe('# Demo\n');
});

test('switching workspaces requires explicit discard of local drafts', async () => {
  const { window: page } = launched;
  await chooseWorkspace(page);
  await openWithKeyboard(page, HELLO_PATH);
  await replaceEditorText(page, '// Bu taslak kaydedilmedi\n');

  const second = path.join(fixture.base, 'second-workspace');
  fs.mkdirSync(second);
  fs.writeFileSync(path.join(second, 'only.txt'), 'ikinci\n');
  await stubFolderPicker(second);

  await page.getByRole('button', { name: 'Klasör aç', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Kaydedilmemiş dosyalar', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Taslakları bırak ve klasör seç', exact: true }).click();
  await expect(page.getByTestId('workspace-name')).toHaveText('second-workspace');
  await expect(page.getByTestId('status')).toHaveText('Yerel çalışma alanı');
  await page.getByRole('button', { name: 'Klasör ağacı', exact: true }).click();
  await expect(pickerFile(page, 'only.txt')).toBeVisible();
  await expect(pickerFile(page, HELLO_PATH)).toHaveCount(0);
  expect(fs.readFileSync(path.join(fixture.workspace, HELLO_PATH), 'utf8')).toBe(HELLO_TS);
  // The old workspace is no longer reachable through IPC either.
  const stale = await page.evaluate(() => window.agentIde.readFile('src/hello.ts'));
  expect(stale).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
});

test('practice and local drafts remain separate even for the same path', async () => {
  const { window: page } = launched;
  await chooseWorkspace(page);
  await openWithKeyboard(page, SESSION_PATH);
  const localDraft = NATIVE_SESSION + '// Yerel taslak\n';
  const lines = page.locator('.view-lines');
  await replaceEditorText(page, localDraft);
  await expect(lines).toContainText('Yerel taslak');

  await page.getByRole('button', { name: 'Yardım', exact: true }).click();
  await page.getByRole('button', { name: 'İlk Göreve başla', exact: true }).click();
  await page.getByRole('button', { name: 'Dosya aç', exact: true }).click();
  await pickerFile(page, SESSION_PATH).click();
  await expect(lines).toContainText('The authenticated state carried across requests.');
  await expect(lines).not.toContainText('realWorkspace');
  await page.getByRole('button', { name: 'İleri', exact: true }).click();
  const draft =
    '// İlk görev notu\nexport interface AuthSession { userId: string; token: string; }\n';
  await replaceEditorText(page, draft);
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByText('Kendi yorumun kaydedildi.', { exact: true })).toBeVisible();

  const file = path.join(fixture.workspace, SESSION_PATH);
  expect(fs.readFileSync(file, 'utf8')).toBe(NATIVE_SESSION);
  await page.getByRole('button', { name: 'Başlangıç', exact: true }).click();
  await expect(page.getByText('Geçmiş · Salt okunur', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yerel projeye dön', exact: true }).click();
  await expect(page.getByTestId('workspace-name')).toHaveText('demo-workspace');
  await expect(lines).toContainText('Yerel taslak');
  await expect(lines).not.toContainText('İlk görev notu');
  await page.keyboard.press('ControlOrMeta+s');
  await expect.poll(() => fs.readFileSync(file, 'utf8')).toBe(localDraft);
});
