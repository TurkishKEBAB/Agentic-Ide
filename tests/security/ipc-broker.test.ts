import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerWorkspaceIpc } from '../../src/main/ipc/register-workspace-ipc';
import { isAuthorizedSender, type SenderPolicy } from '../../src/main/ipc/sender-guard';
import { WorkspaceBroker } from '../../src/main/ipc/workspace-broker';
import { resolveRendererSource } from '../../src/main/renderer-source';
import { IPC_CHANNELS, type FileContent } from '../../src/shared/ipc-contract';

const BUNDLED = resolveRendererSource({ isPackaged: true, devServerUrl: undefined });
const POLICY: SenderPolicy = { source: BUNDLED, appWebContentsId: () => 7 };

function invokeEvent(options: {
  readonly senderId?: number;
  readonly url?: string;
  readonly frame?: 'main' | 'sub' | 'none';
}): IpcMainInvokeEvent {
  const frameKind = options.frame ?? 'main';
  const senderFrame =
    frameKind === 'none'
      ? null
      : {
          url: options.url ?? 'app://renderer/index.html',
          parent: frameKind === 'sub' ? {} : null,
        };
  return { sender: { id: options.senderId ?? 7 }, senderFrame } as unknown as IpcMainInvokeEvent;
}

describe('#33 IPC sender guard', () => {
  it('accepts only the main frame of the app window on the renderer origin', () => {
    expect(isAuthorizedSender(invokeEvent({}), POLICY)).toBe(true);
  });

  it.each([
    ['another webContents', { senderId: 8 }],
    ['a sub-frame', { frame: 'sub' as const }],
    ['a destroyed/navigated frame', { frame: 'none' as const }],
    ['a remote origin', { url: 'https://attacker.example/' }],
    ['a file:// page', { url: 'file:///C:/evil.html' }],
    ['another app host', { url: 'app://other/index.html' }],
  ])('rejects %s', (_label, options) => {
    expect(isAuthorizedSender(invokeEvent(options), POLICY)).toBe(false);
  });

  it('rejects everything before the app window exists', () => {
    expect(isAuthorizedSender(invokeEvent({}), { ...POLICY, appWebContentsId: () => null })).toBe(
      false,
    );
  });
});

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>;

function fakeIpcMain() {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: vi.fn((channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
  };
  const call = (channel: string, event: IpcMainInvokeEvent, ...args: unknown[]) => {
    const handler = handlers.get(channel);
    if (handler === undefined) {
      throw new Error(`no handler for ${channel}`);
    }
    return handler(event, ...args);
  };
  return { ipcMain: ipcMain as unknown as IpcMain, handlers, call };
}

describe('#33 IPC registration', () => {
  const saved = {
    ok: true as const,
    value: { path: 'a.ts', content: 'new', sizeBytes: 3, readOnly: false, revision: 'saved' },
  };
  const broker = {
    chooseWorkspace: vi.fn(() => Promise.resolve({ ok: true as const, value: null })),
    listFiles: vi.fn(() =>
      Promise.resolve({ ok: true as const, value: { entries: [], truncated: false } }),
    ),
    readFile: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: { path: 'a.ts', content: '', sizeBytes: 0, readOnly: false, revision: 'original' },
      }),
    ),
    saveFile: vi.fn<WorkspaceBroker['saveFile']>(() => Promise.resolve(saved)),
  };

  it('registers exactly the named capabilities and can unregister them', () => {
    const { ipcMain, handlers } = fakeIpcMain();
    const unregister = registerWorkspaceIpc(ipcMain, broker, () => true);
    expect([...handlers.keys()].sort()).toEqual(Object.values(IPC_CHANNELS).sort());
    expect(handlers.has('agent-ide:workspace/save-file')).toBe(true);
    unregister();
    expect(handlers.size).toBe(0);
  });

  it('rejects unauthorized senders before touching the broker', async () => {
    const { ipcMain, call } = fakeIpcMain();
    registerWorkspaceIpc(ipcMain, broker, () => false);
    for (const channel of Object.values(IPC_CHANNELS)) {
      await expect(call(channel, invokeEvent({}), 'a.ts')).resolves.toMatchObject({
        ok: false,
        error: { code: 'UNAUTHORIZED_SENDER' },
      });
    }
    expect(broker.chooseWorkspace).not.toHaveBeenCalled();
    expect(broker.listFiles).not.toHaveBeenCalled();
    expect(broker.readFile).not.toHaveBeenCalled();
    expect(broker.saveFile).not.toHaveBeenCalled();
  });

  it('validates the sender before saving and forwards the exact save arguments', async () => {
    const { ipcMain, call } = fakeIpcMain();
    registerWorkspaceIpc(ipcMain, broker, (event) => isAuthorizedSender(event, POLICY));
    await expect(
      call('agent-ide:workspace/save-file', invokeEvent({ frame: 'sub' }), 'a.ts', 'new', 'old'),
    ).resolves.toMatchObject({ error: { code: 'UNAUTHORIZED_SENDER' } });
    expect(broker.saveFile).not.toHaveBeenCalled();
    await expect(
      call('agent-ide:workspace/save-file', invokeEvent({}), 'a.ts', 'new', 'old'),
    ).resolves.toEqual(saved);
    expect(broker.saveFile).toHaveBeenCalledExactlyOnceWith('a.ts', 'new', 'old');
  });

  it.each([
    [IPC_CHANNELS.chooseWorkspace, ['extra']],
    [IPC_CHANNELS.listFiles, ['extra']],
    [IPC_CHANNELS.readFile, []],
    [IPC_CHANNELS.readFile, ['a.ts', 'b.ts']],
    [IPC_CHANNELS.readFile, [42]],
    [IPC_CHANNELS.readFile, [{ path: 'a.ts' }]],
    ['agent-ide:workspace/save-file', ['a.ts', 'new']],
    ['agent-ide:workspace/save-file', ['a.ts', 'new', 'revision', 'extra']],
    ['agent-ide:workspace/save-file', ['a.ts', Buffer.from('new'), 'revision']],
    ['agent-ide:workspace/save-file', ['a.ts', 'new', { revision: 'old' }]],
  ])('rejects malformed arguments on %s: %j', async (channel, args) => {
    const { ipcMain, call } = fakeIpcMain();
    registerWorkspaceIpc(ipcMain, broker, () => true);
    await expect(call(channel, invokeEvent({}), ...args)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REQUEST' },
    });
  });

  it('turns unexpected broker exceptions into a generic INTERNAL error', async () => {
    const { ipcMain, call } = fakeIpcMain();
    const failing = {
      ...broker,
      listFiles: vi.fn(() => Promise.reject(new Error('C:\\Users\\someone\\secret path'))),
    };
    registerWorkspaceIpc(ipcMain, failing, () => true);
    const result = await call(IPC_CHANNELS.listFiles, invokeEvent({}));
    expect(result).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'The operation failed unexpectedly.' },
    });
  });
});

describe('#33/#49 workspace broker', () => {
  let base: string;
  let workspace: string;

  beforeEach(() => {
    base = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'broker-')));
    workspace = path.join(base, 'ws');
    fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workspace, 'src', 'a.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(base, 'outside.txt'), 'secret');
  });

  afterEach(() => {
    fs.rmSync(base, { recursive: true, force: true });
  });

  it('requires an open workspace before accessing files', async () => {
    const broker = new WorkspaceBroker(() => Promise.resolve(null));
    await expect(broker.listFiles()).resolves.toMatchObject({ error: { code: 'NO_WORKSPACE' } });
    await expect(broker.readFile('src/a.ts')).resolves.toMatchObject({
      error: { code: 'NO_WORKSPACE' },
    });
    await expect(broker.saveFile('src/a.ts', 'new', 'old')).resolves.toMatchObject({
      error: { code: 'NO_WORKSPACE' },
    });
  });

  it('treats a cancelled picker as a no-op', async () => {
    const broker = new WorkspaceBroker(() => Promise.resolve(null));
    await expect(broker.chooseWorkspace()).resolves.toEqual({ ok: true, value: null });
  });

  it('opens a folder, exposes only its name, lists and reads through the policy', async () => {
    const broker = new WorkspaceBroker(() => Promise.resolve(workspace));
    const chosen = await broker.chooseWorkspace();
    expect(chosen).toEqual({ ok: true, value: { name: 'ws' } });
    expect(JSON.stringify(chosen)).not.toContain(base);

    const listing = await broker.listFiles();
    expect(listing).toEqual({
      ok: true,
      value: {
        entries: [
          { path: 'src', kind: 'directory' },
          { path: 'src/a.ts', kind: 'file' },
        ],
        truncated: false,
      },
    });

    const opened = await broker.readFile('src/a.ts');
    expect(opened).toMatchObject({
      ok: true,
      value: {
        path: 'src/a.ts',
        content: 'export const a = 1;\n',
        sizeBytes: 20,
        readOnly: false,
      },
    });
    if (!opened.ok) throw new Error(`Fixture read failed: ${opened.error.code}`);
    expect(typeof opened.value.revision).toBe('string');
    const escape = await broker.readFile('../outside.txt');
    expect(escape).toMatchObject({ ok: false, error: { code: 'TRAVERSAL' } });
    expect(JSON.stringify(escape)).not.toContain(base);
    await expect(broker.readFile(7)).resolves.toMatchObject({ error: { code: 'INVALID_REQUEST' } });
  });

  it('keeps the previous workspace when a new choice is rejected', async () => {
    const choices = [workspace, path.join(workspace, 'src', 'a.ts')];
    const broker = new WorkspaceBroker(() => Promise.resolve(choices.shift() ?? null));
    await broker.chooseWorkspace();
    await expect(broker.chooseWorkspace()).resolves.toMatchObject({
      ok: false,
      error: { code: 'ROOT_UNSUPPORTED' },
    });
    await expect(broker.readFile('src/a.ts')).resolves.toMatchObject({ ok: true });
  });

  async function openBroker(): Promise<WorkspaceBroker> {
    const broker = new WorkspaceBroker(() => Promise.resolve(workspace));
    await broker.chooseWorkspace();
    return broker;
  }

  async function readFile(
    broker: WorkspaceBroker,
    relativePath = 'src/a.ts',
  ): Promise<FileContent> {
    const file = await broker.readFile(relativePath);
    if (!file.ok) {
      throw new Error(`Fixture read failed: ${file.error.code}`);
    }
    return file.value;
  }

  it('saves UTF-8 through a new revision while preserving BOM, CRLF, and mode', async () => {
    const target = path.join(workspace, 'src', 'a.ts');
    fs.writeFileSync(target, '\uFEFFconst değer = 1;\r\n');
    if (process.platform !== 'win32') fs.chmodSync(target, 0o750);
    const originalMode = fs.statSync(target).mode;
    const broker = await openBroker();
    const original = await readFile(broker);
    expect(original.content).toBe('const değer = 1;\r\n');
    const saved = await broker.saveFile(original.path, 'const değer = 2;\n', original.revision);
    expect(saved).toMatchObject({
      ok: true,
      value: { path: 'src/a.ts', content: 'const değer = 2;\r\n', sizeBytes: 22, readOnly: false },
    });
    if (!saved.ok) throw new Error('Fixture save failed');
    expect(saved.value.revision).not.toBe(original.revision);
    expect(await readFile(broker)).toEqual(saved.value);
    await expect(broker.saveFile(original.path, '', saved.value.revision)).resolves.toMatchObject({
      ok: true,
      value: { sizeBytes: 3, content: '' },
    });
    expect(fs.readFileSync(target)).toEqual(Buffer.from('\uFEFF'));
    expect(fs.statSync(target).mode).toBe(originalMode);
    expect(fs.readdirSync(path.dirname(target))).toEqual(['a.ts']);
  });

  it('does not overwrite a same-size external edit', async () => {
    const broker = await openBroker();
    const { path: relative, revision } = await readFile(broker);
    const target = path.join(workspace, relative);
    const { atime, mtime } = fs.statSync(target);
    fs.writeFileSync(target, 'export const a = 2;\n');
    fs.utimesSync(target, atime, mtime);
    await expect(broker.saveFile(relative, 'user edit', revision)).resolves.toMatchObject({
      error: { code: 'TARGET_CHANGED' },
    });
    expect(fs.readFileSync(target, 'utf8')).toBe('export const a = 2;\n');
  });

  it('does not overwrite a replacement file with the same bytes', async () => {
    const broker = await openBroker();
    const { path: relative, content, revision } = await readFile(broker);
    const target = path.join(workspace, relative);
    fs.writeFileSync(`${target}.other`, content);
    fs.renameSync(`${target}.other`, target);
    await expect(broker.saveFile(relative, 'user edit', revision)).resolves.toMatchObject({
      error: { code: 'TARGET_CHANGED' },
    });
    expect(fs.readFileSync(target, 'utf8')).toBe(content);
  });

  it('allows at most one competing save against the same revision', async () => {
    const broker = await openBroker();
    const { path: relative, revision } = await readFile(broker);
    const results = await Promise.all([
      broker.saveFile(relative, 'first', revision),
      broker.saveFile(relative, 'second', revision),
    ]);
    const written = results.flatMap((result) => (result.ok ? [result.value.content] : []));
    expect(written).toHaveLength(1);
    expect(results[1]).toMatchObject({ error: { code: 'SAVE_IN_PROGRESS' } });
    expect(fs.readFileSync(path.join(workspace, relative), 'utf8')).toBe(written[0]);
  });

  it('invalidates an open revision when the same workspace is reopened', async () => {
    const broker = await openBroker();
    const { path: relative, revision, content } = await readFile(broker);
    await broker.chooseWorkspace();
    await expect(broker.saveFile(relative, 'changed', revision)).resolves.toMatchObject({
      error: { code: 'TARGET_CHANGED' },
    });
    expect(fs.readFileSync(path.join(workspace, relative), 'utf8')).toBe(content);
  });

  it('refuses traversal, absolute paths, missing files, and linked ancestors', async () => {
    const broker = await openBroker();
    const { revision } = await readFile(broker);
    const outside = path.join(base, 'outside.txt');
    fs.symlinkSync(
      base,
      path.join(workspace, 'outside-link'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    fs.symlinkSync(
      path.join(workspace, 'src'),
      path.join(workspace, 'inside-link'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    for (const [input, code] of [
      ['../outside.txt', 'TRAVERSAL'],
      [outside, 'ABSOLUTE_PATH'],
      ['missing.txt', 'NOT_FOUND'],
      ['outside-link/outside.txt', 'LINK_NOT_ALLOWED'],
      ['inside-link/a.ts', 'LINK_NOT_ALLOWED'],
    ]) {
      await expect(broker.saveFile(input, 'replacement', revision), input).resolves.toMatchObject({
        error: { code },
      });
    }
    expect(fs.readFileSync(outside, 'utf8')).toBe('secret');
    expect(fs.existsSync(path.join(workspace, 'missing.txt'))).toBe(false);
    expect((await readFile(broker, 'inside-link/a.ts')).readOnly).toBe(true);
  });

  it.each([
    '.env.production',
    'src/.ENV',
    'src/key.PEM',
    'src/token.secret',
    'id_ed25519',
    '.npmrc',
    'credentials.json',
    '.aws/credentials',
    '.git/config',
    '.agentignore',
  ])('leaves the protected file %s read-only even if requested directly', async (relative) => {
    const target = path.join(workspace, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '# original');
    const broker = await openBroker();
    const { revision, readOnly } = await readFile(broker, relative);
    expect(readOnly).toBe(true);
    await expect(broker.saveFile(relative, 'changed', revision)).resolves.toMatchObject({
      error: { code: 'PROTECTED_PATH' },
    });
    expect(fs.readFileSync(target, 'utf8')).toBe('# original');
  });

  it('honors a .agentignore rule added after the file was opened', async () => {
    const broker = await openBroker();
    const { revision, readOnly } = await readFile(broker);
    expect(readOnly).toBe(false);
    fs.writeFileSync(path.join(workspace, '.agentignore'), '# keep local\n/src/**/*.ts\n');
    expect((await readFile(broker)).readOnly).toBe(true);
    await expect(broker.saveFile('src/a.ts', 'changed', revision)).resolves.toMatchObject({
      error: { code: 'PROTECTED_PATH' },
    });
    expect(fs.readFileSync(path.join(workspace, 'src', 'a.ts'), 'utf8')).toBe(
      'export const a = 1;\n',
    );
  });

  it('keeps ignore exclusions additive, with nested directories and hidden names covered', async () => {
    const broker = await openBroker();
    for (const name of ['notes.txt', '.hidden']) {
      fs.writeFileSync(path.join(workspace, 'src', name), 'original');
    }
    fs.writeFileSync(path.join(workspace, '.agentignore'), '*.txt\nsrc/.h?dden\n!src/notes.txt\n');
    for (const relative of ['src/notes.txt', 'src/.hidden']) {
      const { revision, readOnly } = await readFile(broker, relative);
      expect(readOnly).toBe(true);
      await expect(broker.saveFile(relative, 'changed', revision)).resolves.toMatchObject({
        error: { code: 'PROTECTED_PATH' },
      });
    }
    expect((await readFile(broker)).readOnly).toBe(false);
  });

  it('fails closed when .agentignore cannot be verified', async () => {
    const broker = await openBroker();
    const { path: relative, revision, content } = await readFile(broker);
    const outside = path.join(base, 'outside.txt');
    fs.linkSync(outside, path.join(workspace, '.agentignore'));
    expect((await readFile(broker)).readOnly).toBe(true);
    await expect(broker.saveFile(relative, 'changed', revision)).resolves.toMatchObject({
      error: { code: 'PROTECTION_UNAVAILABLE' },
    });
    expect(fs.readFileSync(path.join(workspace, relative), 'utf8')).toBe(content);
  });

  it('fails closed when .agentignore uses unsupported pattern syntax', async () => {
    const broker = await openBroker();
    const { path: relative, revision, content } = await readFile(broker);
    fs.writeFileSync(path.join(workspace, '.agentignore'), 'src/[ab].ts\n');
    expect((await readFile(broker)).readOnly).toBe(true);
    await expect(broker.saveFile(relative, 'changed', revision)).resolves.toMatchObject({
      error: { code: 'PROTECTION_UNAVAILABLE' },
    });
    expect(fs.readFileSync(path.join(workspace, relative), 'utf8')).toBe(content);
  });

  it.runIf(process.platform !== 'win32')(
    'never replaces a file with no write permission bits',
    async () => {
      const target = path.join(workspace, 'src', 'a.ts');
      fs.chmodSync(target, 0o444);
      const broker = await openBroker();
      const { path: relative, revision, content, readOnly } = await readFile(broker);
      expect(readOnly).toBe(true);
      await expect(broker.saveFile(relative, 'changed', revision)).resolves.toMatchObject({
        error: { code: 'READ_ONLY' },
      });
      expect(fs.readFileSync(target, 'utf8')).toBe(content);
    },
  );

  it('rejects invalid UTF-8 content and limits the number of bytes saved', async () => {
    const broker = await openBroker();
    const { path: relative, revision, content } = await readFile(broker);
    for (const invalid of ['embedded\0nul', '\uD800']) {
      await expect(broker.saveFile(relative, invalid, revision)).resolves.toMatchObject({
        error: { code: 'UNSUPPORTED_ENCODING' },
      });
    }
    await expect(broker.saveFile(relative, 'ğ'.repeat(524_289), revision)).resolves.toMatchObject({
      error: { code: 'FILE_TOO_LARGE' },
    });
    expect(fs.readFileSync(path.join(workspace, relative), 'utf8')).toBe(content);
  });

  it('does not replace an existing binary target', async () => {
    const broker = await openBroker();
    const { revision } = await readFile(broker);
    const binary = Buffer.from([0xff, 0xfe, 0, 0]);
    const target = path.join(workspace, 'raw.bin');
    fs.writeFileSync(target, binary);
    await expect(broker.saveFile('raw.bin', 'changed', revision)).resolves.toMatchObject({
      error: { code: 'UNSUPPORTED_ENCODING' },
    });
    expect(fs.readFileSync(target)).toEqual(binary);
  });
});
