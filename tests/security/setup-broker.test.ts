import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { IpcMainInvokeEvent } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerSetupIpc } from '../../src/main/ipc/register-setup-ipc';
import { SetupBroker } from '../../src/main/ipc/setup-broker';
import { SetupStore } from '../../src/main/ipc/setup-store';
import { WorkspaceBroker } from '../../src/main/ipc/workspace-broker';
import { SETUP_CHANNELS, type IpcResult } from '../../src/shared/ipc-contract';

const SAMPLE_KEY = 'synthetic-credential-for-testing';
const ENCRYPTED = Buffer.from([0, 132, 30, 125, 250]);

let directory: string;
let stateFile: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'agentic-ide-setup-'));
  stateFile = path.join(directory, 'onboarding.json');
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function createSetup(platform: NodeJS.Platform = 'win32') {
  const encryption = {
    isAsyncEncryptionAvailable: vi.fn().mockResolvedValue(true),
    encryptStringAsync: vi.fn().mockResolvedValue(Buffer.from(ENCRYPTED)),
  };
  const workspace = new WorkspaceBroker(() => Promise.resolve(directory));
  const store = new SetupStore(stateFile);
  const broker = new SetupBroker(store, encryption, workspace, platform);
  return { broker, encryption, store, workspace };
}

describe('#52 safe setup and recent workspaces', () => {
  it('starts local-only and does not write credentials without explicit consent', async () => {
    const { broker, encryption } = createSetup();
    expect(await broker.getSetup()).toEqual({
      ok: true,
      value: {
        profile: 'local-only',
        cloudAvailable: true,
        cloudConfigured: false,
        recentWorkspaces: [],
      },
    });

    for (const [key, consent] of [
      [SAMPLE_KEY, false],
      [SAMPLE_KEY, 'true'],
      ['', true],
      ['contains whitespace', true],
      ['x'.repeat(4097), true],
      ['bad\nkey', true],
    ]) {
      expect(await broker.configureCloud(key, consent)).toMatchObject({
        ok: false,
        error: { code: 'INVALID_REQUEST' },
      });
    }
    expect(encryption.encryptStringAsync).not.toHaveBeenCalled();
    await expect(readFile(stateFile)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('atomically persists only an opaque reference and encrypted bytes, then removes both', async () => {
    const { broker, encryption, store } = createSetup();
    const configured = await broker.configureCloud(SAMPLE_KEY, true);
    expect(configured).toMatchObject({
      ok: true,
      value: { profile: 'manual-hybrid', cloudConfigured: true },
    });
    expect(encryption.encryptStringAsync).toHaveBeenCalledWith(SAMPLE_KEY);
    expect(JSON.stringify(configured)).not.toContain(SAMPLE_KEY);
    const saved = await store.read();
    expect(saved.config.apiKeyRef).toBe(saved.credentials?.id);
    expect(saved.credentials?.encryptedKey).toBe(ENCRYPTED.toString('base64'));
    expect(await readFile(stateFile, 'utf8')).not.toContain(SAMPLE_KEY);

    const restarted = createSetup().broker;
    expect(await restarted.getSetup()).toEqual(configured);
    expect(await restarted.selectLocalProfile()).toMatchObject({
      ok: true,
      value: { profile: 'local-only', cloudConfigured: true },
    });
    expect((await store.read()).credentials).toEqual(saved.credentials);
    expect(await restarted.removeCloudKey()).toMatchObject({
      ok: true,
      value: { profile: 'local-only', cloudConfigured: false },
    });
    expect(await store.read()).toMatchObject({
      config: { profile: 'local-only', apiKeyRef: null },
      credentials: null,
    });
  });

  it.each(['unsupported', 'unavailable', 'probe-error', 'encrypt-error', 'empty'] as const)(
    'fails closed with %s credential storage',
    async (scenario) => {
      const { broker, encryption } = createSetup(scenario === 'unsupported' ? 'linux' : 'win32');
      if (scenario === 'unavailable')
        encryption.isAsyncEncryptionAvailable.mockResolvedValue(false);
      if (scenario === 'probe-error') {
        encryption.isAsyncEncryptionAvailable.mockRejectedValue(new Error(SAMPLE_KEY));
      }
      if (scenario === 'encrypt-error') {
        encryption.encryptStringAsync.mockRejectedValue(new Error(SAMPLE_KEY));
      }
      if (scenario === 'empty') encryption.encryptStringAsync.mockResolvedValue(Buffer.alloc(0));
      const result = await broker.configureCloud(SAMPLE_KEY, true);
      expect(result).toMatchObject({
        ok: false,
        error: { code: 'SECURE_STORAGE_UNAVAILABLE' },
      });
      expect(JSON.stringify(result)).not.toContain(SAMPLE_KEY);
      await expect(readFile(stateFile)).rejects.toMatchObject({ code: 'ENOENT' });
    },
  );

  it('serializes key operations and workspace history without dropping unrelated state', async () => {
    const { broker, store, workspace } = createSetup();
    const configured = broker.configureCloud(SAMPLE_KEY, true);
    await workspace.chooseWorkspace((root) => broker.rememberWorkspace(root));
    await configured;
    const summary = await broker.getSetup();
    if (!summary.ok) throw new Error('Expected saved settings');
    expect(summary.value.recentWorkspaces).toHaveLength(1);
    expect(JSON.stringify(summary)).not.toContain(directory);
    const [recent] = summary.value.recentWorkspaces;
    if (recent === undefined) throw new Error('Expected a recent workspace');
    expect(recent.name).toBe(path.basename(directory));
    expect(await createSetup().broker.openRecentWorkspace(recent.id)).toEqual({
      ok: true,
      value: { name: path.basename(directory) },
    });
    expect(await broker.openRecentWorkspace(directory)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_REQUEST' },
    });
    expect(await broker.openRecentWorkspace(randomUUID())).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    await broker.removeCloudKey();
    expect((await store.read()).recentWorkspaces).toHaveLength(1);
  });

  it('preserves existing state when disk persistence fails and retries normally', async () => {
    const { broker, store } = createSetup();
    const configured = await broker.configureCloud(SAMPLE_KEY, true);
    const original = await store.read();
    vi.spyOn(store, 'write').mockRejectedValueOnce(new Error('write failed'));
    await expect(broker.removeCloudKey()).rejects.toThrow('write failed');
    expect(await store.read()).toEqual(original);
    expect(await broker.getSetup()).toEqual(configured);
    expect(await broker.removeCloudKey()).toMatchObject({
      ok: true,
      value: { profile: 'local-only', cloudConfigured: false },
    });
  });

  it('requires a new native selection when the folder at a recent path has changed', async () => {
    const { broker, workspace } = createSetup();
    const folder = path.join(directory, 'project');
    await mkdir(folder);
    await workspace.openWorkspaceFolder(folder, {
      onOpened: (root) => broker.rememberWorkspace(root),
    });
    const summary = await broker.getSetup();
    if (!summary.ok) throw new Error('Expected saved settings');
    const [recent] = summary.value.recentWorkspaces;
    if (recent === undefined) throw new Error('Expected a recent workspace');

    await rename(folder, path.join(directory, 'previous-project'));
    await mkdir(folder);
    expect(await broker.openRecentWorkspace(recent.id)).toMatchObject({
      ok: false,
      error: { code: 'ROOT_CHANGED' },
    });
    await workspace.openWorkspaceFolder(folder, {
      onOpened: (root) => broker.rememberWorkspace(root),
    });
    const updated = await broker.getSetup();
    if (!updated.ok) throw new Error('Expected saved settings');
    expect(updated.value.recentWorkspaces).toHaveLength(1);
    expect(updated.value.recentWorkspaces[0]?.id).not.toBe(recent.id);
  });

  it('allows one workspace opening at a time while its history is recorded', async () => {
    const { workspace } = createSetup();
    let markStarted!: () => void;
    let finishOpening!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const complete = new Promise<void>((resolve) => {
      finishOpening = resolve;
    });
    const first = workspace.chooseWorkspace(() => {
      markStarted();
      return complete;
    });
    await started;
    try {
      const expected = { ok: false, error: { code: 'WORKSPACE_OPEN_IN_PROGRESS' } };
      expect(await workspace.chooseWorkspace()).toMatchObject(expected);
      expect(await workspace.openWorkspaceFolder(directory)).toMatchObject(expected);
    } finally {
      finishOpening();
      await first;
    }
  });

  it('keeps an unrecognized existing setup file intact', async () => {
    const { broker, workspace } = createSetup();
    const unsupported = '{"version":2}';
    await writeFile(stateFile, unsupported, 'utf8');
    await expect(broker.getSetup()).rejects.toThrow('Invalid desktop setup state');
    expect(await workspace.chooseWorkspace((root) => broker.rememberWorkspace(root))).toMatchObject(
      { ok: true, value: { name: path.basename(directory) } },
    );
    expect(await readFile(stateFile, 'utf8')).toBe(unsupported);
  });

  it('rejects unexpected configuration fields instead of copying them on update', async () => {
    const { broker } = createSetup();
    const legacy = JSON.stringify({
      version: 1,
      config: { profile: 'local-only', apiKeyRef: null, unexpected: 'extra field' },
      credentials: null,
      recentWorkspaces: [],
    });
    await writeFile(stateFile, legacy, 'utf8');
    await expect(broker.configureCloud(SAMPLE_KEY, true)).rejects.toThrow(
      'Invalid desktop setup state',
    );
    expect(await readFile(stateFile, 'utf8')).toBe(legacy);
  });
});

describe('#52 credential IPC', () => {
  it('rejects unauthorized and malformed requests before invoking setup operations', async () => {
    type Listener = (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<IpcResult<unknown>>;
    const handlers = new Map<string, Listener>();
    const authorized = {} as IpcMainInvokeEvent;
    const { broker, encryption } = createSetup();
    registerSetupIpc(
      {
        handle: (channel, listener) => handlers.set(channel, listener as Listener),
        removeHandler: vi.fn(),
      },
      broker,
      (event) => event === authorized,
    );
    expect([...handlers.keys()].sort()).toEqual(Object.values(SETUP_CHANNELS).sort());
    for (const listener of handlers.values()) {
      expect(await listener({} as IpcMainInvokeEvent, SAMPLE_KEY, true)).toMatchObject({
        ok: false,
        error: { code: 'UNAUTHORIZED_SENDER' },
      });
    }
    const configure = handlers.get(SETUP_CHANNELS.configureCloud);
    if (configure === undefined) throw new Error('Expected a credential handler');
    for (const arguments_ of [[{ key: SAMPLE_KEY }, true], [SAMPLE_KEY], [SAMPLE_KEY, true, 3]]) {
      expect(await configure(authorized, ...arguments_)).toMatchObject({
        ok: false,
        error: { code: 'INVALID_REQUEST' },
      });
    }
    expect(encryption.encryptStringAsync).not.toHaveBeenCalled();
    const response = await configure(authorized, SAMPLE_KEY, true);
    expect(response).toMatchObject({ ok: true, value: { cloudConfigured: true } });
    expect(JSON.stringify(response)).not.toContain(SAMPLE_KEY);
  });
});
