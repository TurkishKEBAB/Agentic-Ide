import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerWorkspaceIpc } from '../../src/main/ipc/register-workspace-ipc';
import { isAuthorizedSender, type SenderPolicy } from '../../src/main/ipc/sender-guard';
import { WorkspaceBroker } from '../../src/main/ipc/workspace-broker';
import { resolveRendererSource } from '../../src/main/renderer-source';
import { IPC_CHANNELS } from '../../src/shared/ipc-contract';

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
  const broker = {
    chooseWorkspace: vi.fn(() => Promise.resolve({ ok: true as const, value: null })),
    listFiles: vi.fn(() =>
      Promise.resolve({ ok: true as const, value: { entries: [], truncated: false } }),
    ),
    readFile: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: { path: 'a.ts', content: '', sizeBytes: 0, readOnly: true as const },
      }),
    ),
  };

  it('registers exactly the three named S1 capabilities and can unregister them', () => {
    const { ipcMain, handlers } = fakeIpcMain();
    const unregister = registerWorkspaceIpc(ipcMain, broker, () => true);
    expect([...handlers.keys()].sort()).toEqual(Object.values(IPC_CHANNELS).sort());
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
  });

  it.each([
    [IPC_CHANNELS.chooseWorkspace, ['extra']],
    [IPC_CHANNELS.listFiles, ['extra']],
    [IPC_CHANNELS.readFile, []],
    [IPC_CHANNELS.readFile, ['a.ts', 'b.ts']],
    [IPC_CHANNELS.readFile, [42]],
    [IPC_CHANNELS.readFile, [{ path: 'a.ts' }]],
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

  it('requires an open workspace before listing or reading', async () => {
    const broker = new WorkspaceBroker(() => Promise.resolve(null));
    await expect(broker.listFiles()).resolves.toMatchObject({ error: { code: 'NO_WORKSPACE' } });
    await expect(broker.readFile('src/a.ts')).resolves.toMatchObject({
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

    await expect(broker.readFile('src/a.ts')).resolves.toEqual({
      ok: true,
      value: { path: 'src/a.ts', content: 'export const a = 1;\n', sizeBytes: 20, readOnly: true },
    });
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
});
