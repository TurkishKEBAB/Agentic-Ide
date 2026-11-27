import assert from 'node:assert/strict';
import test from 'node:test';
import { NativeFiles, type NativeFileContent, type NativeResult, type NativeWorkspaceApi } from '../src/native-files.ts';

const filePath = 'src/main.ts';

function ok<T>(value: T): NativeResult<T> {
  return { ok: true, value };
}

function error(code: string): NativeResult<never> {
  return { ok: false, error: { code, message: 'The request failed.' } };
}

function diskFile(content: string, revision: string, path = filePath, readOnly = false): NativeFileContent {
  return { path, content, sizeBytes: Buffer.byteLength(content), readOnly, revision };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function bridge(overrides: Partial<NativeWorkspaceApi> = {}): NativeWorkspaceApi {
  return {
    chooseWorkspace: async () => ok({ name: 'project' }),
    listFiles: async () => ok({ entries: [{ path: filePath, kind: 'file' }], truncated: false }),
    readFile: async path => ok(diskFile('on disk', 'r1', path)),
    saveFile: async (path, content, revision) => ok(diskFile(content, revision + '-next', path)),
    ...overrides,
  };
}

async function workspace(overrides?: Partial<NativeWorkspaceApi>): Promise<NativeFiles> {
  const state = new NativeFiles(bridge(overrides));
  assert.equal((await state.choose()).ok, true);
  return state;
}

test('reopening a dirty file preserves the draft and a save advances its disk revision', async () => {
  const state = await workspace({
    saveFile: async (path, content, revision) => {
      if (path !== filePath || content !== 'local draft' || revision !== 'r1') return error('INVALID_REQUEST');
      return ok(diskFile('local draft', 'r2'));
    },
  });
  assert.equal((await state.open(filePath)).ok, true);
  assert.equal(state.status(filePath), 'clean');
  assert.equal(state.edit(filePath, 'local draft'), true);
  assert.equal((await state.open(filePath)).ok, true);
  assert.equal(state.files[filePath], 'local draft');
  assert.equal(state.status(filePath), 'dirty');
  assert.deepEqual(state.dirtyPaths(), [filePath]);

  assert.equal((await state.save(filePath)).ok, true);
  assert.equal(state.status(filePath), 'clean');
  assert.deepEqual(state.dirtyPaths(), []);
  assert.equal(state.metadata(filePath)?.revision, 'r2');
  assert.equal(state.metadata(filePath)?.sizeBytes, 11);
});

test('a pending save rejects a duplicate and leaves newer typing dirty', async () => {
  const firstSave = deferred<NativeResult<NativeFileContent>>();
  let saves = 0;
  const state = await workspace({
    saveFile: async (path, content, revision) => {
      saves++;
      if (saves === 1 && content === 'sent draft' && revision === 'r1') return firstSave.promise;
      if (saves === 2 && content === 'typed while saving' && revision === 'r2') return ok(diskFile(content, 'r3', path));
      return error('INVALID_REQUEST');
    },
  });
  await state.open(filePath);
  state.edit(filePath, 'sent draft');
  const pending = state.save(filePath);
  assert.equal(state.status(filePath), 'saving');
  assert.equal(state.busy, true);
  assert.equal(state.writable(filePath), true);
  assert.equal(state.edit(filePath, 'typed while saving'), true);

  const duplicate = await state.save(filePath);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error.code, 'BUSY');
  const reload = await state.reload(filePath);
  assert.equal(reload.ok, false);
  if (!reload.ok) assert.equal(reload.error.code, 'BUSY');
  state.close(filePath);
  assert.equal(state.files[filePath], 'typed while saving');
  assert.equal((await state.choose()).ok, false);

  firstSave.resolve(ok(diskFile('sent draft', 'r2')));
  assert.equal((await pending).ok, true);
  assert.equal(state.busy, false);
  assert.equal(state.files[filePath], 'typed while saving');
  assert.equal(state.status(filePath), 'dirty');
  assert.equal((await state.save(filePath)).ok, true);
  assert.equal(state.status(filePath), 'clean');
  assert.equal(state.metadata(filePath)?.revision, 'r3');
});

test('an external change preserves the draft until an explicit reload', async () => {
  let disk = diskFile('on disk', 'r1');
  const state = await workspace({
    readFile: async () => ok(disk),
    saveFile: async (path, content, revision) => revision === disk.revision
      ? ok(diskFile(content, 'r3', path))
      : error('TARGET_CHANGED'),
  });
  await state.open(filePath);
  state.edit(filePath, 'my work');
  disk = diskFile('external change', 'r2');

  const save = await state.save(filePath);
  assert.equal(save.ok, false);
  if (!save.ok) assert.equal(save.error.code, 'TARGET_CHANGED');
  assert.equal(state.status(filePath), 'conflict');
  assert.deepEqual(state.dirtyPaths(), [filePath]);
  await state.open(filePath);
  assert.equal(state.files[filePath], 'my work');
  assert.equal(state.metadata(filePath)?.revision, 'r1');

  assert.equal((await state.reload(filePath)).ok, true);
  assert.equal(state.files[filePath], 'external change');
  assert.equal(state.status(filePath), 'clean');
  assert.equal(state.metadata(filePath)?.revision, 'r2');
});

test('cancelling or failing a folder choice preserves drafts; a new folder with the same name resets them', async () => {
  let selection: NativeResult<{ name: string } | null> = ok({ name: 'project' });
  const state = await workspace({ chooseWorkspace: async () => selection });
  await state.list();
  await state.open(filePath);
  state.edit(filePath, 'my work');

  selection = ok(null);
  assert.deepEqual(await state.choose(), ok(null));
  selection = error('IO_ERROR');
  assert.equal((await state.choose()).ok, false);
  assert.equal(state.name, 'project');
  assert.deepEqual(state.entries, [{ path: filePath, kind: 'file' }]);
  assert.equal(state.files[filePath], 'my work');

  selection = ok({ name: 'project' });
  assert.equal((await state.choose()).ok, true);
  assert.equal(state.name, 'project');
  assert.deepEqual(state.entries, []);
  assert.equal(Object.hasOwn(state.files, filePath), false);
  assert.deepEqual(state.dirtyPaths(), []);
});

test('late listings and reads cannot populate a replacement workspace', async () => {
  const oldList = deferred<Awaited<ReturnType<NativeWorkspaceApi['listFiles']>>>();
  const oldRead = deferred<NativeResult<NativeFileContent>>();
  let selected = 0;
  const state = await workspace({
    chooseWorkspace: async () => ok({ name: selected++ === 0 ? 'old' : 'new' }),
    listFiles: async () => selected === 1 ? oldList.promise : ok({ entries: [{ path: filePath, kind: 'file' }], truncated: false }),
    readFile: async () => selected === 1 ? oldRead.promise : ok(diskFile('new workspace', 'new-revision')),
  });
  const pendingList = state.list();
  const pendingRead = state.open(filePath);
  assert.equal((await state.choose()).ok, true);
  assert.equal((await state.list()).ok, true);
  assert.equal((await state.open(filePath)).ok, true);

  oldList.resolve(ok({ entries: [{ path: 'old-only.ts', kind: 'file' }], truncated: true }));
  oldRead.resolve(ok(diskFile('old workspace', 'old-revision')));
  for (const result of await Promise.all([pendingList, pendingRead])) {
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'STALE');
  }
  assert.deepEqual(state.entries, [{ path: filePath, kind: 'file' }]);
  assert.equal(state.files[filePath], 'new workspace');
  assert.equal(state.metadata(filePath)?.revision, 'new-revision');
});

test('a pending folder choice keeps other workspace requests from crossing the switch', async () => {
  const selection = deferred<NativeResult<{ name: string } | null>>();
  let choices = 0;
  const state = await workspace({
    chooseWorkspace: async () => ++choices === 1 ? ok({ name: 'project' }) : selection.promise,
  });
  await state.open(filePath);
  state.edit(filePath, 'unsaved text');

  const choosing = state.choose();
  assert.equal(state.busy, true);
  const duplicate = state.choose();
  for (const result of await Promise.all([state.list(), state.open('other.ts'), state.save(filePath)])) {
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'BUSY');
  }
  selection.resolve(ok(null));
  assert.deepEqual(await choosing, ok(null));
  const result = await duplicate;
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'BUSY');
  assert.equal(state.busy, false);
  assert.equal(state.files[filePath], 'unsaved text');
});

test('an older listing cannot replace a newer listing in the same workspace', async () => {
  type ListingResult = Awaited<ReturnType<NativeWorkspaceApi['listFiles']>>;
  const old = deferred<ListingResult>();
  let lists = 0;
  const state = await workspace({
    listFiles: async () => ++lists === 1 ? old.promise : ok({ entries: [{ path: 'new.ts', kind: 'file' }], truncated: false }),
  });
  const pending = state.list();
  assert.equal((await state.list()).ok, true);
  old.resolve(ok({ entries: [{ path: 'old.ts', kind: 'file' }], truncated: false }));

  const result = await pending;
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'STALE');
  assert.deepEqual(state.entries, [{ path: 'new.ts', kind: 'file' }]);
});

test('a reload that finishes after more typing leaves the latest draft in place', async () => {
  const pendingRead = deferred<NativeResult<NativeFileContent>>();
  let reads = 0;
  const state = await workspace({
    readFile: async () => ++reads === 1 ? ok(diskFile('on disk', 'r1')) : pendingRead.promise,
  });
  await state.open(filePath);
  state.edit(filePath, 'draft to discard');
  const reload = state.reload(filePath);
  state.edit(filePath, 'new work');
  pendingRead.resolve(ok(diskFile('replacement', 'r2')));

  assert.equal((await reload).ok, false);
  assert.equal(state.files[filePath], 'new work');
  assert.equal(state.status(filePath), 'dirty');
  assert.equal(state.metadata(filePath)?.revision, 'r1');
});

test('a closed pending file stays closed when its read finishes', async () => {
  const pendingRead = deferred<NativeResult<NativeFileContent>>();
  const state = await workspace({ readFile: async () => pendingRead.promise });
  const pending = state.open(filePath);
  state.close(filePath);
  pendingRead.resolve(ok(diskFile('closed file', 'r1')));
  const result = await pending;
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'STALE');
  assert.equal(Object.hasOwn(state.files, filePath), false);
});

test('a save supersedes an earlier reload of that draft', async () => {
  const pendingRead = deferred<NativeResult<NativeFileContent>>();
  let reads = 0;
  const state = await workspace({
    readFile: async () => ++reads === 1 ? ok(diskFile('on disk', 'r1')) : pendingRead.promise,
  });
  await state.open(filePath);
  state.edit(filePath, 'save this draft');
  const reload = state.reload(filePath);
  assert.equal((await state.save(filePath)).ok, true);
  pendingRead.resolve(ok(diskFile('obsolete read', 'r1')));

  const result = await reload;
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'STALE');
  assert.equal(state.files[filePath], 'save this draft');
  assert.equal(state.status(filePath), 'clean');
  assert.equal(state.metadata(filePath)?.revision, 'r1-next');
});

test('a rejected bridge save releases the lock and retains the draft for retry', async () => {
  let saves = 0;
  const state = await workspace({
    saveFile: async (path, content, revision) => {
      if (++saves === 1) throw new Error('IPC disconnected');
      return ok(diskFile(content, revision + '-next', path));
    },
  });
  await state.open(filePath);
  state.edit(filePath, 'keep this draft');

  const failed = await state.save(filePath);
  assert.equal(failed.ok, false);
  assert.equal(state.busy, false);
  assert.equal(state.files[filePath], 'keep this draft');
  assert.equal(state.status(filePath), 'dirty');
  assert.equal((await state.save(filePath)).ok, true);
  assert.equal(state.status(filePath), 'clean');
});

test('a read-only file with a prototype-like name stays read-only', async () => {
  const state = await workspace({ readFile: async path => ok(diskFile('protected', 'r1', path, true)) });
  assert.equal(Object.hasOwn(state.files, '__proto__'), false);
  assert.equal((await state.open('__proto__')).ok, true);
  assert.equal(state.files['__proto__'], 'protected');
  assert.equal(state.status('__proto__'), 'readonly');
  assert.equal(state.writable('__proto__'), false);
  assert.equal(state.edit('__proto__', 'should not change'), false);
  const save = await state.save('__proto__');
  assert.equal(save.ok, false);
  if (!save.ok) assert.equal(save.error.code, 'READ_ONLY');
  assert.equal(state.files['__proto__'], 'protected');
});
