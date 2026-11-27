import { link, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceBroker } from '../../../src/main/ipc/workspace-broker';

const SYNTHETIC_PROTECTED_CONTENT = 'synthetic-private-fixture';
const PUBLIC_CONTENT = 'export const sample = 1;';

describe('#45 protected agent content', () => {
  let fixture: string;
  let workspace: string;
  let applicationData: string;

  beforeEach(async () => {
    fixture = await mkdtemp(path.join(os.tmpdir(), 'agent-ide-protection-'));
    workspace = path.join(fixture, 'workspace');
    applicationData = path.join(workspace, 'app-storage');
    await mkdir(workspace);
  });

  afterEach(async () => {
    await rm(fixture, { recursive: true, force: true });
  });

  async function addFile(relative: string, content = SYNTHETIC_PROTECTED_CONTENT): Promise<void> {
    const destination = path.join(workspace, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }

  async function openBroker(folder = workspace): Promise<WorkspaceBroker> {
    const broker = new WorkspaceBroker(() => Promise.resolve(folder), undefined, [applicationData]);
    expect(await broker.chooseWorkspace()).toMatchObject({ ok: true });
    return broker;
  }

  it('omits explicit and discovered protected sources before handing content to consumers', async () => {
    const protectedPaths = [
      '.env',
      'config/.ENV.local',
      'config/client.PEM',
      'config/leaf.key',
      'config/id_rsa',
      'config/test.secret',
      'config/client.p12',
      'config/client.pfx',
      '.aws/credentials',
      'notes/private/controls.txt',
      '.agentide/audit.jsonl',
      '.agentbackup/before.txt',
      'src/.agentide-save-fixture',
      'app-storage/session/fixture.json',
      'drafts/design.md',
      'src/local-only.txt',
    ];
    await Promise.all(protectedPaths.map((relative) => addFile(relative)));
    await addFile(
      '.agentignore',
      'drafts/\n**/local-*.txt\n!.env\n!drafts/design.md\n!src/local-only.txt\n',
    );
    await addFile('src/main.ts', PUBLIC_CONTENT);
    const broker = await openBroker();

    const listing = await broker.listAgentFiles();
    expect(listing).toEqual({
      ok: true,
      value: {
        entries: [
          { kind: 'directory', path: '.aws' },
          { kind: 'directory', path: 'config' },
          { kind: 'directory', path: 'notes' },
          { kind: 'directory', path: 'src' },
          { kind: 'file', path: 'src/main.ts' },
        ],
        truncated: false,
      },
    });
    if (!listing.ok) throw new Error(listing.error.code);

    // Stand-ins check what the boundary would supply to the downstream consumers.
    const provider = vi.fn<(content: string) => void>();
    const embedding = vi.fn<(content: string) => void>();
    const audit = vi.fn<(entry: string) => void>();
    for (const entry of listing.value.entries) {
      if (entry.kind !== 'file') continue;
      const file = await broker.readAgentFile(entry.path);
      if (file.ok) embedding(file.value.content);
    }
    const protectedRequests = [...protectedPaths, '.agentignore', 'config\\.\\.ENV.local'];
    for (const source of [...protectedRequests, './src/main.ts']) {
      const file = await broker.readAgentFile(source);
      if (file.ok) provider(file.value.content);
      else audit(file.error.message);
    }

    expect(provider).toHaveBeenCalledExactlyOnceWith(PUBLIC_CONTENT);
    expect(embedding).toHaveBeenCalledExactlyOnceWith(PUBLIC_CONTENT);
    expect(audit).toHaveBeenCalledTimes(protectedRequests.length);
    expect(audit.mock.calls.flat()).toEqual(
      Array<string>(protectedRequests.length).fill(
        'The workspace policy prevents this operation on the path.',
      ),
    );
  });

  it('keeps protected content readable by the local editor and rejects manual writes', async () => {
    await addFile('notes.txt');
    await addFile('secret.key');
    await addFile('app-storage/session/fixture.json');
    await addFile('.agentignore', 'notes.txt\n!secret.key\n');
    const broker = await openBroker();
    for (const relative of ['notes.txt', 'secret.key', 'app-storage/session/fixture.json']) {
      const opened = await broker.readFile(relative);
      expect(opened).toMatchObject({
        ok: true,
        value: { content: SYNTHETIC_PROTECTED_CONTENT, readOnly: true },
      });
      if (!opened.ok) throw new Error(opened.error.code);
      await expect(
        broker.saveFile(relative, PUBLIC_CONTENT, opened.value.revision),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: 'PROTECTED_PATH' },
      });
      await expect(broker.readAgentFile(relative)).resolves.toMatchObject({
        ok: false,
        error: { code: 'PROTECTED_PATH' },
      });
    }
  });

  it('rechecks changes to the ignore file even after prior discovery and reads', async () => {
    await addFile('src/main.ts', PUBLIC_CONTENT);
    const broker = await openBroker();
    await expect(broker.readAgentFile('src/main.ts')).resolves.toMatchObject({ ok: true });
    await expect(broker.listAgentFiles()).resolves.toMatchObject({
      ok: true,
      value: {
        entries: [
          { kind: 'directory', path: 'src' },
          { kind: 'file', path: 'src/main.ts' },
        ],
      },
    });

    await addFile('.agentignore', 'src/\n');
    await expect(broker.readAgentFile('src/main.ts')).resolves.toMatchObject({
      ok: false,
      error: { code: 'PROTECTED_PATH' },
    });
    await expect(broker.listAgentFiles()).resolves.toMatchObject({
      ok: true,
      value: { entries: [] },
    });
  });

  it('fails closed when the ignore policy cannot be parsed', async () => {
    await addFile('src/main.ts', PUBLIC_CONTENT);
    await addFile('.agentignore', 'src/[a-z].ts\n');
    const broker = await openBroker();
    const unavailable = { ok: false, error: { code: 'PROTECTION_UNAVAILABLE' } };
    await expect(broker.listAgentFiles()).resolves.toMatchObject(unavailable);
    await expect(broker.readAgentFile('src/main.ts')).resolves.toMatchObject(unavailable);
  });

  it('applies directory-only and whole-workspace patterns without exposing excluded paths', async () => {
    await addFile('drafts/note.txt');
    await addFile('src/drafts', PUBLIC_CONTENT);
    await addFile('.agentignore', 'drafts/\n');
    const broker = await openBroker();
    await expect(broker.listAgentFiles()).resolves.toMatchObject({
      ok: true,
      value: {
        entries: [
          { kind: 'directory', path: 'src' },
          { kind: 'file', path: 'src/drafts' },
        ],
      },
    });
    await expect(broker.readAgentFile('src/drafts')).resolves.toMatchObject({ ok: true });
    await addFile('.agentignore', '**\n');
    await expect(broker.listAgentFiles()).resolves.toMatchObject({
      ok: true,
      value: { entries: [] },
    });
  });

  it('protects app data even when a folder inside the data store was explicitly opened', async () => {
    await addFile('app-storage/session/fixture.json');
    const broker = await openBroker(path.join(applicationData, 'session'));
    const denied = { ok: false, error: { code: 'PROTECTED_PATH' } };
    await expect(broker.listAgentFiles()).resolves.toMatchObject(denied);
    await expect(broker.readAgentFile('fixture.json')).resolves.toMatchObject(denied);
  });

  it('protects backup data when a folder inside the backup namespace is opened', async () => {
    await addFile('.agentbackup/run/before.txt');
    const broker = await openBroker(path.join(workspace, '.agentbackup', 'run'));
    const denied = { ok: false, error: { code: 'PROTECTED_PATH' } };
    await expect(broker.listAgentFiles()).resolves.toMatchObject(denied);
    await expect(broker.readAgentFile('before.txt')).resolves.toMatchObject(denied);
  });

  it('refuses to traverse a linked directory for discovery or explicit reads', async () => {
    await addFile('private/fixture.txt');
    await symlink(path.join(workspace, 'private'), path.join(workspace, 'alias'), 'junction');
    const broker = await openBroker();
    await expect(broker.listAgentFiles()).resolves.toMatchObject({
      ok: true,
      value: { entries: [] },
    });
    await expect(broker.readAgentFile('alias/fixture.txt')).resolves.toMatchObject({
      ok: false,
      error: { code: 'LINK_NOT_ALLOWED' },
    });
  });

  it('omits hard-linked file names and refuses to read their contents', async () => {
    await addFile('.env');
    await addFile('source.ts', PUBLIC_CONTENT);
    await link(path.join(workspace, '.env'), path.join(workspace, 'linked.ts'));
    const broker = await openBroker();
    await expect(broker.listAgentFiles()).resolves.toMatchObject({
      ok: true,
      value: { entries: [{ kind: 'file', path: 'source.ts' }] },
    });
    await expect(broker.readAgentFile('linked.ts')).resolves.toMatchObject({
      ok: false,
      error: { code: 'HARDLINK_UNSUPPORTED' },
    });
  });

  it('requires a workspace for both main-process capabilities', async () => {
    const broker = new WorkspaceBroker(() => Promise.resolve(null));
    const noWorkspace = { ok: false, error: { code: 'NO_WORKSPACE' } };
    await expect(broker.listAgentFiles()).resolves.toMatchObject(noWorkspace);
    await expect(broker.readAgentFile('src/main.ts')).resolves.toMatchObject(noWorkspace);
  });
});
