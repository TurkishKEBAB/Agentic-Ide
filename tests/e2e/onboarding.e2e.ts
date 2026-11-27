import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { closeApp, launchApp, type LaunchedApp } from './electron-app';

const firstName = 'demo-baslangic';
const secondName = "İkinci & deneme'si";
const diskText = 'export const first = true;\n';
const syntheticKey = 'agentic-ide-onboarding-test-key';

let base: string;
let profile: string;
let first: string;
let second: string;
let launched: LaunchedApp | undefined;

function currentApp(): LaunchedApp {
  if (!launched) throw new Error('Desktop app is not running');
  return launched;
}

async function launch(): Promise<Page> {
  launched = await launchApp(profile);
  return launched.window;
}

async function stop(): Promise<void> {
  const app = launched?.app;
  launched = undefined;
  if (app) await closeApp(app);
}

async function setFolderPicker(folder: string): Promise<void> {
  await currentApp().app.evaluate(({ dialog }, location) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [location] });
  }, folder);
}

async function openSetup(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Model ve gizlilik', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Model ve gizlilik', exact: true })).toBeVisible();
}

async function readOnboarding() {
  const raw = await readFile(path.join(profile, 'onboarding.json'), 'utf8');
  return {
    raw,
    state: JSON.parse(raw) as {
      version: number;
      config: { profile: string; apiKeyRef?: string | null };
      credentials: { id: string; encryptedKey: string } | null;
    },
  };
}

test.beforeEach(async () => {
  base = await mkdtemp(path.join(os.tmpdir(), 'agentic-ide-onboarding-'));
  profile = path.join(base, 'isolated-profile');
  first = path.join(base, firstName);
  second = path.join(base, secondName);
  await Promise.all([mkdir(profile), mkdir(first), mkdir(second)]);
  await Promise.all([
    writeFile(path.join(first, 'index.ts'), diskText),
    writeFile(path.join(second, 'README.md'), '# Another fixture\n'),
  ]);
});

test.afterEach(async () => {
  try {
    await stop();
  } finally {
    await rm(base, { recursive: true, force: true, maxRetries: 3, retryDelay: 75 });
  }
});

test('#52 starts local, reopens a recent project and preserves unsaved work on cancellation', async () => {
  let page = await launch();
  await expect(page.getByText('Yalnızca yerel', { exact: true })).toBeVisible();
  await setFolderPicker(first);
  await page.getByTestId('open-folder').click();
  await expect(page.getByTestId('workspace-name')).toHaveText(firstName);

  await setFolderPicker(second);
  await page.getByRole('button', { name: 'Klasör aç', exact: true }).click();
  await expect(page.getByTestId('workspace-name')).toHaveText(secondName);
  const recent = await page.evaluate(() => window.agentIde.getSetup());
  if (!recent.ok) throw new Error('Could not load setup');
  expect(recent.value.recentWorkspaces.map(({ name }) => name)).toEqual([secondName, firstName]);
  for (const row of recent.value.recentWorkspaces) {
    expect(Object.keys(row).sort()).toEqual(['id', 'name']);
    expect(row.id).not.toContain(base);
  }

  await stop();
  page = await launch();
  await page
    .getByRole('region', { name: 'Son projeler' })
    .getByRole('button', { name: firstName })
    .click();
  await expect(page.getByTestId('workspace-name')).toHaveText(firstName);
  await expect(page.getByTestId('status')).toHaveText('Yerel çalışma alanı');
  await page.keyboard.press('ControlOrMeta+p');
  await page.getByRole('button', { name: /index\.ts/ }).click();
  await page.locator('.monaco-editor .view-lines').click({ position: { x: 15, y: 12 } });
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText('export const draft = true;');
  await expect(page.getByText('Kaydedilmedi', { exact: true })).toBeVisible();

  await openSetup(page);
  await page.getByRole('dialog').getByRole('button', { name: secondName, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kaydedilmemiş dosyalar' })).toBeVisible();
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await expect(page.locator('.view-lines')).toContainText('draft');
  await expect(page.getByTestId('workspace-name')).toHaveText(firstName);

  await openSetup(page);
  await page.getByRole('dialog').getByRole('button', { name: secondName, exact: true }).click();
  await page.getByRole('button', { name: 'Taslakları bırak ve projeyi aç' }).click();
  await expect(page.getByTestId('workspace-name')).toHaveText(secondName);
  expect(await readFile(path.join(first, 'index.ts'), 'utf8')).toBe(diskText);

  const moved = path.join(base, 'tasindi');
  await rename(first, moved);
  await openSetup(page);
  await page.getByRole('dialog').getByRole('button', { name: firstName, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Klasör açılamadı', exact: true })).toBeVisible();
  await expect(page.getByTestId('workspace-name')).toHaveText(secondName);
  await setFolderPicker(moved);
  await page.getByRole('button', { name: 'Klasör seç', exact: true }).click();
  await expect(page.getByTestId('workspace-name')).toHaveText('tasindi');
});

test('#52 stores only an OS-encrypted key after explicit consent and removes it independently', async () => {
  test.skip(process.platform !== 'win32', 'Cloud credential storage targets the Windows demo.');
  let page = await launch();
  await openSetup(page);
  const invalid = await page.evaluate(
    async (key) => window.agentIde.configureCloud(key, false),
    syntheticKey,
  );
  expect(invalid.ok).toBe(false);

  const keyInput = page.getByLabel('Anthropic API anahtarı', { exact: true });
  await expect(keyInput).toHaveAttribute('type', 'password');
  await keyInput.fill(syntheticKey);
  await page.getByRole('button', { name: 'Pencereyi kapat', exact: true }).click();
  await expect(page.locator('#setup-key')).toBeEmpty();
  await openSetup(page);
  await keyInput.fill(syntheticKey);
  await page.getByRole('button', { name: 'Bulut profilini etkinleştir', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Yalnızca yerel', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /bağlamının Anthropic’e gönderilmesine izin/ }).check();
  await page.getByRole('button', { name: 'Bulut profilini etkinleştir', exact: true }).click();
  await expect(page.getByText('Manuel hibrit profil etkinleştirildi.')).toBeVisible();
  await expect(page.getByLabel('Yeni Anthropic API anahtarı', { exact: true })).toBeEmpty();
  const summary = await page.evaluate(() => window.agentIde.getSetup());
  expect(summary).toEqual({
    ok: true,
    value: {
      profile: 'manual-hybrid',
      cloudAvailable: true,
      cloudConfigured: true,
      recentWorkspaces: [],
    },
  });

  const stored = await readOnboarding();
  expect(stored.raw.includes(syntheticKey)).toBe(false);
  expect(stored.state.version).toBe(1);
  expect(stored.state.config.profile).toBe('manual-hybrid');
  expect(stored.state.config.apiKeyRef).toBe(stored.state.credentials?.id);
  const encryptedKey = stored.state.credentials?.encryptedKey;
  if (!encryptedKey) throw new Error('Encrypted key is missing');

  await stop();
  page = await launch();
  await expect(page.getByText('Manuel hibrit', { exact: true })).toBeVisible();
  await openSetup(page);
  await expect(page.getByText('API anahtarı kayıtlı.')).toBeVisible();
  const decryptedAfterRestart = await currentApp().app.evaluate(
    async ({ safeStorage }, { encrypted, key }) =>
      (await safeStorage.decryptStringAsync(Buffer.from(encrypted, 'base64'))).result === key,
    { encrypted: encryptedKey, key: syntheticKey },
  );
  expect(decryptedAfterRestart).toBe(true);

  await page.getByRole('button', { name: 'Yalnızca yerele geç', exact: true }).click();
  await expect(page.getByText('Yalnızca yerel profil seçildi.')).toBeVisible();
  expect((await readOnboarding()).state.credentials?.id).toBe(stored.state.credentials?.id);
  const audit = path.join(profile, 'audit-fixture.json');
  const index = path.join(profile, 'index-fixture.txt');
  await Promise.all([writeFile(audit, '{}'), writeFile(index, 'index fixture')]);
  await page.getByRole('button', { name: 'Bulut anahtarını kaldır', exact: true }).click();
  await expect(page.getByText('Bulut anahtarı kaldırıldı.')).toBeVisible();
  const removed = await readOnboarding();
  expect(removed.state.credentials).toBeNull();
  expect(removed.state.config.apiKeyRef ?? null).toBeNull();
  expect(await readFile(audit, 'utf8')).toBe('{}');
  expect(await readFile(index, 'utf8')).toBe('index fixture');
});

test('#52 keeps local setup available when secure storage cannot start', async () => {
  const page = await launch();
  if (process.platform === 'win32') {
    await currentApp().app.evaluate(({ safeStorage }) => {
      safeStorage.isAsyncEncryptionAvailable = () => Promise.resolve(false);
    });
    await page.reload();
  }
  await openSetup(page);
  await expect(page.getByRole('dialog').getByText('Yalnızca yerel', { exact: true })).toBeVisible();
  await expect(page.getByText(/Güvenli depolama kullanılamıyor/)).toBeVisible();
  await expect(page.getByLabel('Anthropic API anahtarı', { exact: true })).toHaveCount(0);
  const result = await page.evaluate(
    (key) => window.agentIde.configureCloud(key, true),
    syntheticKey,
  );
  expect(result).toMatchObject({ ok: false, error: { code: 'SECURE_STORAGE_UNAVAILABLE' } });
  await page.getByRole('button', { name: 'Pencereyi kapat', exact: true }).click();
  await setFolderPicker(first);
  await page.getByTestId('open-folder').click();
  await expect(page.getByTestId('workspace-name')).toHaveText(firstName);
});

test('#52 keeps app-managed setup state inside the main process', async () => {
  const page = await launch();
  await setFolderPicker(base);
  await page.getByTestId('open-folder').click();
  await expect(page.getByTestId('workspace-name')).toHaveText(path.basename(base));
  const result = await page.evaluate(() =>
    window.agentIde.readFile('isolated-profile/onboarding.json'),
  );
  expect(result).toMatchObject({ ok: false, error: { code: 'PROTECTED_PATH' } });
});

test('#52 disables the cloud form if encryption fails during setup', async () => {
  test.skip(process.platform !== 'win32', 'Cloud credential storage targets the Windows demo.');
  const page = await launch();
  await openSetup(page);
  const keyInput = page.getByLabel('Anthropic API anahtarı', { exact: true });
  await expect(keyInput).toBeVisible();
  await currentApp().app.evaluate(({ safeStorage }) => {
    safeStorage.encryptStringAsync = () => Promise.reject(new Error('Test storage failure'));
  });
  await keyInput.fill(syntheticKey);
  await page.getByRole('checkbox', { name: /bağlamının Anthropic’e gönderilmesine izin/ }).check();
  await page.getByRole('button', { name: 'Bulut profilini etkinleştir', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Güvenli depolama kullanılamıyor.');
  await expect(keyInput).toHaveCount(0);
  await expect(page.getByRole('dialog').getByText('Yalnızca yerel', { exact: true })).toBeVisible();
});
