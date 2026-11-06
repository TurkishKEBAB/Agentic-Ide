import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { launchApp, type LaunchedApp } from './electron-app';

const HELLO_TS = "// Merhaba çalışma alanı — ğüşiöç\nexport const greeting = 'selam';\n";

interface Fixture {
  readonly base: string;
  readonly workspace: string;
  readonly hasEscapeLink: boolean;
  readonly hasHardLink: boolean;
}

/** Workspace with a nested file, ignored dirs, and (when creatable) a junction/symlink and hardlink to outside data. */
function createFixture(): Fixture {
  const base = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'agentic-ide-e2e-')));
  const workspace = path.join(base, 'demo-workspace');
  const outside = path.join(base, 'outside');
  fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
  fs.mkdirSync(path.join(workspace, '.git'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'node_modules', 'pkg'), { recursive: true });
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(workspace, 'src', 'hello.ts'), HELLO_TS);
  fs.writeFileSync(path.join(workspace, 'README.md'), '# Demo\n');
  fs.writeFileSync(path.join(workspace, '.git', 'config'), '[core]\n');
  fs.writeFileSync(
    path.join(workspace, 'node_modules', 'pkg', 'index.js'),
    'module.exports = 1;\n',
  );
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'OUTSIDE-SECRET\n');

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
  return { base, workspace, hasEscapeLink, hasHardLink };
}

let fixture: Fixture;
let launched: LaunchedApp;

test.beforeEach(async () => {
  fixture = createFixture();
  launched = await launchApp();
  // Stub the native folder dialog in the main process; no production test hook exists.
  await launched.app.evaluate(({ dialog }, workspace) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [workspace] });
  }, fixture.workspace);
});

test.afterEach(async () => {
  await launched.app.close();
  fs.rmSync(fixture.base, { recursive: true, force: true });
});

test('#33 smoke: choose workspace and display one UTF-8 file read-only', async () => {
  const { window: page } = launched;
  await page.getByTestId('open-folder').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('demo-workspace');

  const tree = page.getByTestId('file-tree');
  await expect(tree.locator('button[data-path="src/hello.ts"]')).toBeVisible();
  await expect(tree.locator('button[data-path="README.md"]')).toBeVisible();
  // VCS/dependency folders and links are not offered.
  await expect(tree.locator('[data-path^=".git"]')).toHaveCount(0);
  await expect(tree.locator('[data-path^="node_modules"]')).toHaveCount(0);
  await expect(tree.locator('[data-path^="escape-link"]')).toHaveCount(0);

  await tree.locator('button[data-path="src/hello.ts"]').click();
  await expect(page.getByTestId('file-path')).toHaveText('src/hello.ts');
  const lines = page.locator('.view-lines');
  await expect(lines).toContainText('Merhaba çalışma alanı — ğüşiöç');
  await expect(lines).toContainText("export const greeting = 'selam';");

  // Read-only: typing cannot change the buffer, and the file on disk is untouched.
  const before = await lines.innerText();
  await page.locator('.monaco-editor').click();
  await page.keyboard.type('agent write attempt');
  await page.keyboard.press('Enter');
  expect(await lines.innerText()).toBe(before);
  expect(fs.readFileSync(path.join(fixture.workspace, 'src', 'hello.ts'), 'utf8')).toBe(HELLO_TS);

  await page.screenshot({ path: test.info().outputPath('issue-33-workspace-read-only.png') });
});

test('#33/#49 renderer API exposes only read capabilities and the broker enforces the boundary', async () => {
  const { window: page } = launched;
  await page.getByTestId('open-folder').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('demo-workspace');

  const surface = await page.evaluate(() => ({
    keys: Object.keys(window.agentIde).sort(),
    frozen: Object.isFrozen(window.agentIde),
  }));
  expect(surface).toEqual({ keys: ['chooseWorkspace', 'listFiles', 'readFile'], frozen: true });

  const codes = await page.evaluate(
    async ({ absolute }) => {
      const api = window.agentIde;
      const code = async (request: Promise<{ ok: boolean; error?: { code: string } }>) => {
        const result = await request;
        return result.ok ? 'OK' : (result.error?.code ?? 'NO_CODE');
      };
      return {
        traversal: await code(api.readFile('../outside/secret.txt')),
        backslash: await code(api.readFile('src\\..\\..\\outside\\secret.txt')),
        encoded: await code(api.readFile('%2e%2e/outside/secret.txt')),
        absolute: await code(api.readFile(absolute)),
        ads: await code(api.readFile('README.md:stream')),
        directory: await code(api.readFile('src')),
        missing: await code(api.readFile('src/missing.ts')),
        // Type confusion: cloneable non-string payloads reach main and are rejected there
        // before the policy runs (objects with functions cannot even be cloned).
        arrayPayload: await code(
          (api.readFile as (value: unknown) => Promise<{ ok: boolean; error?: { code: string } }>)([
            'README.md',
          ]),
        ),
        objectPayload: await code(
          (api.readFile as (value: unknown) => Promise<{ ok: boolean; error?: { code: string } }>)({
            path: 'README.md',
          }),
        ),
        valid: await code(api.readFile('README.md')),
      };
    },
    { absolute: path.join(fixture.workspace, 'README.md') },
  );
  expect(codes).toEqual({
    traversal: 'TRAVERSAL',
    backslash: 'TRAVERSAL',
    encoded: 'ENCODED_TRAVERSAL',
    absolute: 'ABSOLUTE_PATH',
    ads: 'INVALID_SEGMENT',
    directory: 'UNSUPPORTED_FILE_TYPE',
    missing: 'NOT_FOUND',
    arrayPayload: 'INVALID_REQUEST',
    objectPayload: 'INVALID_REQUEST',
    valid: 'OK',
  });

  if (fixture.hasEscapeLink) {
    const escape = await page.evaluate(() => window.agentIde.readFile('escape-link/secret.txt'));
    expect(escape).toMatchObject({ ok: false, error: { code: 'LINK_ESCAPE' } });
  }
  if (fixture.hasHardLink) {
    const hard = await page.evaluate(() => window.agentIde.readFile('hard.txt'));
    expect(hard).toMatchObject({ ok: false, error: { code: 'HARDLINK_UNSUPPORTED' } });
  }
});

test('#33 broker rejects calls from an iframe even on the app origin', async () => {
  const { window: page } = launched;
  await expect(page.locator('.monaco-editor')).toBeVisible();
  // CSP frame-src 'none' blocks frames; even if one existed, the sender guard requires the main frame.
  const framed = await page.evaluate(async () => {
    const frame = document.createElement('iframe');
    frame.src = 'app://renderer/index.html';
    document.body.append(frame);
    await new Promise((resolve) => setTimeout(resolve, 500));
    let exposed: boolean;
    try {
      exposed = frame.contentWindow !== null && 'agentIde' in frame.contentWindow;
    } catch {
      exposed = false; // Blocked or opaque frame: the API is not reachable either.
    }
    frame.remove();
    return exposed;
  });
  expect(framed).toBe(false);
});
