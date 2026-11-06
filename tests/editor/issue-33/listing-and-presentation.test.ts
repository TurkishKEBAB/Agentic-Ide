import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { listWorkspace } from '../../../src/main/workspace/list-workspace';
import { openWorkspaceRoot, type WorkspaceRoot } from '../../../src/main/workspace/workspace-root';
import { depthOf, languageForPath, messageForError } from '../../../src/renderer/src/presentation';
import type { IpcErrorCode } from '../../../src/shared/ipc-contract';

let base: string;
let root: WorkspaceRoot;

async function openRoot(dir: string): Promise<WorkspaceRoot> {
  const opened = await openWorkspaceRoot(dir);
  if (!opened.ok) {
    throw new Error(opened.error.code);
  }
  return opened.value;
}

beforeEach(async () => {
  base = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'listing-')));
  const ws = path.join(base, 'ws');
  fs.mkdirSync(path.join(ws, 'src', 'deep', 'deeper'), { recursive: true });
  fs.mkdirSync(path.join(ws, '.git'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'b.ts'), '');
  fs.writeFileSync(path.join(ws, 'a.ts'), '');
  fs.writeFileSync(path.join(ws, 'src', 'index.ts'), '');
  fs.writeFileSync(path.join(ws, 'src', 'deep', 'deeper', 'x.ts'), '');
  fs.writeFileSync(path.join(ws, '.git', 'HEAD'), '');
  fs.writeFileSync(path.join(ws, 'node_modules', 'pkg', 'index.js'), '');
  fs.writeFileSync(path.join(ws, '.gitignore'), '');
  root = await openRoot(ws);
});

afterEach(() => {
  fs.rmSync(base, { recursive: true, force: true });
});

describe('#33 workspace listing', () => {
  it('lists files breadth-first in name order, skipping .git and node_modules', async () => {
    const listing = await listWorkspace(root);
    expect(listing).toEqual({
      ok: true,
      value: {
        entries: [
          { path: '.gitignore', kind: 'file' },
          { path: 'a.ts', kind: 'file' },
          { path: 'b.ts', kind: 'file' },
          { path: 'src', kind: 'directory' },
          { path: 'src/deep', kind: 'directory' },
          { path: 'src/index.ts', kind: 'file' },
          { path: 'src/deep/deeper', kind: 'directory' },
          { path: 'src/deep/deeper/x.ts', kind: 'file' },
        ],
        truncated: false,
      },
    });
  });

  it('stops at the entry budget and reports truncation', async () => {
    const listing = await listWorkspace(root, { maxEntries: 2, maxDepth: 16 });
    expect(listing).toMatchObject({ ok: true, value: { truncated: true } });
    expect(listing.ok && listing.value.entries).toHaveLength(2);
  });

  it('stops at the depth budget and reports truncation', async () => {
    const listing = await listWorkspace(root, { maxEntries: 100, maxDepth: 1 });
    expect(listing.ok && listing.value.entries.map((entry) => entry.path)).toEqual([
      '.gitignore',
      'a.ts',
      'b.ts',
      'src',
    ]);
    expect(listing).toMatchObject({ ok: true, value: { truncated: true } });
  });

  it('never lists links (junctions on Windows, symlinks elsewhere)', async (ctx) => {
    const outside = path.join(base, 'outside');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');
    try {
      fs.symlinkSync(
        outside,
        path.join(root.canonicalPath, 'link'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    } catch {
      ctx.skip();
    }
    const listing = await listWorkspace(root);
    expect(listing.ok && listing.value.entries.some((entry) => entry.path.startsWith('link'))).toBe(
      false,
    );
  });

  it('fails closed when the root was swapped after opening', async () => {
    fs.renameSync(root.canonicalPath, path.join(base, 'moved'));
    fs.mkdirSync(root.canonicalPath);
    await expect(listWorkspace(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'ROOT_CHANGED' },
    });
  });
});

describe('#33 presentation helpers', () => {
  it.each([
    ['src/a.ts', 'typescript'],
    ['src/A.TSX', 'typescript'],
    ['index.mjs', 'javascript'],
    ['package.json', 'json'],
    ['README.md', 'markdown'],
    ['.gitignore', 'plaintext'],
    ['Makefile', 'plaintext'],
    ['archive.tar.unknown', 'plaintext'],
  ])('%s → %s', (file, language) => {
    expect(languageForPath(file)).toBe(language);
  });

  it('has a Turkish message for every error code', () => {
    const codes: IpcErrorCode[] = [
      'NO_WORKSPACE',
      'TRAVERSAL',
      'LINK_ESCAPE',
      'HARDLINK_UNSUPPORTED',
      'FILE_TOO_LARGE',
      'UNSUPPORTED_ENCODING',
    ];
    for (const code of codes) {
      expect(messageForError(code).length).toBeGreaterThan(0);
    }
  });

  it('computes tree depth from relative paths', () => {
    expect(depthOf('a.ts')).toBe(0);
    expect(depthOf('src/deep/x.ts')).toBe(2);
  });
});
