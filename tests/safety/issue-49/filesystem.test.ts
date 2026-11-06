/**
 * #49 workspace boundary: REAL filesystem behaviour of openWorkspaceRoot, verifyWorkspaceRoot,
 * resolveWorkspacePath, revalidateResolvedPath and readVerifiedTextFile.
 *
 * Every fixture lives in a fresh `ws49-*` directory under os.tmpdir() and is removed after each
 * test. Directory links are junctions on Windows (no privilege needed) and symlinks elsewhere;
 * when a link type cannot be created on this machine the test is skipped, never silently passed.
 * All link targets stay inside the fixture directory.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, type TestContext } from 'vitest';

import type { PolicyResult, WorkspacePolicyCode } from '../../../src/main/workspace/policy-result';
import {
  resolveWorkspacePath,
  revalidateResolvedPath,
  type AccessIntent,
} from '../../../src/main/workspace/resolve-path';
import { MAX_DISPLAY_BYTES, readVerifiedTextFile } from '../../../src/main/workspace/verified-read';
import {
  openWorkspaceRoot,
  verifyWorkspaceRoot,
  type WorkspaceRoot,
} from '../../../src/main/workspace/workspace-root';

const IS_WINDOWS = process.platform === 'win32';
const INTENTS: readonly AccessIntent[] = ['read', 'list', 'write'];
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

interface Fixture {
  /** mkdtemp result spelled through os.tmpdir() (may be non-canonical, e.g. RUNNER~1). */
  readonly tmp: string;
  /** Canonical (`realpath`) spelling of `tmp`. */
  readonly base: string;
  /** The workspace root: base/ws. */
  readonly ws: string;
  /** Sibling-prefix directory: base/ws-evil. */
  readonly evil: string;
  /** Unrelated directory outside the workspace: base/outside. */
  readonly outside: string;
}

/** Fixture tree (paths relative to the fixture base). Contents are fake markers, not secrets. */
const FIXTURE_FILES: Readonly<Record<string, string>> = {
  'ws/src/a.ts': 'export const a = 1;\n',
  'ws/src/nested/deep/b.ts': 'export const b = 2;\n',
  'ws/docs/readme.md': '# readme\n',
  'ws/other/a.ts': 'export const other = 3;\n',
  'ws-evil/secret.txt': 'FIXTURE_SIBLING_PREFIX_MARKER',
  'ws-evil/src/a.ts': 'FIXTURE_SIBLING_SRC_MARKER',
  'outside/secret.txt': 'FIXTURE_OUTSIDE_MARKER',
  'outside/a.ts': 'FIXTURE_OUTSIDE_A_MARKER',
  'outside/src/a.ts': 'FIXTURE_OUTSIDE_SRC_MARKER',
};

let tempDirs: string[] = [];
let createdLinks: string[] = [];
let fx: Fixture;
let root: WorkspaceRoot;

function makeFixture(): Fixture {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws49-'));
  tempDirs.push(tmp);
  const base = fs.realpathSync.native(tmp);
  for (const [relative, content] of Object.entries(FIXTURE_FILES)) {
    const target = path.join(base, ...relative.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  fs.mkdirSync(path.join(base, 'ws', 'empty'));
  return {
    tmp,
    base,
    ws: path.join(base, 'ws'),
    evil: path.join(base, 'ws-evil'),
    outside: path.join(base, 'outside'),
  };
}

function removeLinkQuietly(linkPath: string): void {
  try {
    if (fs.lstatSync(linkPath).isSymbolicLink()) {
      fs.unlinkSync(linkPath);
    }
  } catch {
    // Already removed (or replaced) by the test itself.
  }
}

beforeEach(async () => {
  fx = makeFixture();
  root = expectOk(await openWorkspaceRoot(fx.ws));
});

afterEach(() => {
  // Unlink links first so cleanup never has to decide whether to traverse them.
  for (const link of createdLinks.reverse()) {
    removeLinkQuietly(link);
  }
  createdLinks = [];
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
  tempDirs = [];
});

// ---------------------------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------------------------

type Outcome = WorkspacePolicyCode | 'OK';

function outcome(result: PolicyResult<unknown>): Outcome {
  return result.ok ? 'OK' : result.error.code;
}

function expectOk<T>(result: PolicyResult<T>): T {
  expect(outcome(result)).toBe('OK');
  if (!result.ok) {
    throw new Error('unreachable: expected an ok policy result');
  }
  return result.value;
}

/** Fragments that would reveal the local temp path if they appeared in an error. */
function sensitiveFragments(): string[] {
  return [
    fx.tmp,
    fx.base,
    fx.base.split(path.sep).join('/'),
    path.basename(fx.tmp),
    path.basename(fx.base),
  ];
}

function expectNoPathLeak(result: PolicyResult<unknown>): void {
  if (result.ok) {
    return;
  }
  const text = `${result.error.code}\n${result.error.message}\n${JSON.stringify(result.error)}`;
  for (const fragment of sensitiveFragments()) {
    expect(text).not.toContain(fragment);
  }
}

/** Asserts a failure with exactly `codes[0]`, or one of `codes` when several are acceptable. */
function expectCode(
  result: PolicyResult<unknown>,
  ...codes: [WorkspacePolicyCode, ...WorkspacePolicyCode[]]
): void {
  if (codes.length === 1) {
    expect(outcome(result)).toBe(codes[0]);
  } else {
    expect(codes).toContain(outcome(result));
  }
  expectNoPathLeak(result);
}

// ---------------------------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------------------------

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
}

function isPrivilegeError(error: unknown): boolean {
  const code = errorCode(error);
  return code === 'EPERM' || code === 'EACCES' || code === 'ENOSYS' || code === 'ENOTSUP';
}

/** Directory link: junction on Windows, symbolic link elsewhere. Skips when not creatable. */
function linkDir(ctx: TestContext, target: string, linkPath: string): void {
  try {
    fs.symlinkSync(target, linkPath, IS_WINDOWS ? 'junction' : 'dir');
  } catch (error) {
    if (isPrivilegeError(error)) {
      ctx.skip('directory links cannot be created on this machine');
    }
    throw error;
  }
  createdLinks.push(linkPath);
}

/** File symbolic link. Windows without Developer Mode cannot create these: the test skips. */
function linkFile(ctx: TestContext, target: string, linkPath: string): void {
  try {
    fs.symlinkSync(target, linkPath, 'file');
  } catch (error) {
    if (isPrivilegeError(error)) {
      ctx.skip('file symbolic links need a privilege this machine does not grant');
    }
    throw error;
  }
  createdLinks.push(linkPath);
}

function hardLink(ctx: TestContext, existing: string, newPath: string): void {
  try {
    fs.linkSync(existing, newPath);
  } catch (error) {
    if (isPrivilegeError(error) || errorCode(error) === 'EXDEV') {
      ctx.skip('hard links cannot be created here');
    }
    throw error;
  }
}

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

/** rename with retries for transient Windows sharing violations (indexer / AV scanners). */
function renameWithRetry(from: string, to: string): void {
  for (let attempt = 1; ; attempt += 1) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (error) {
      const code = errorCode(error);
      if (attempt >= 20 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) {
        throw error;
      }
      sleepSync(50);
    }
  }
}

/** Atomically replaces `target` with a NEW file (new inode / file id), like an editor save. */
function replaceFileAtomically(target: string, content: string): void {
  const staging = `${target}.staging`;
  fs.writeFileSync(staging, content);
  renameWithRetry(staging, target);
}

function isCaseInsensitiveFs(dir: string): boolean {
  const probe = path.join(dir, 'CaseProbe.tmp');
  fs.writeFileSync(probe, '');
  try {
    return fs.existsSync(path.join(dir, 'caseprobe.tmp'));
  } finally {
    fs.rmSync(probe, { force: true });
  }
}

/** Full 8.3 short spelling of an existing path (Windows only), or null when unavailable. */
function shortPathOf(fullPath: string): string | null {
  if (!IS_WINDOWS) {
    return null;
  }
  const result = spawnSync(
    'cmd.exe',
    ['/d', '/s', '/c', `"for %I in ("${fullPath}") do @echo %~sI"`],
    {
      encoding: 'utf8',
      windowsVerbatimArguments: true,
      timeout: 10_000,
    },
  );
  if (result.status !== 0) {
    return null;
  }
  const shortPath = result.stdout.trim();
  return shortPath === '' || shortPath === fullPath ? null : shortPath;
}

/** 8.3 alias of the last component only, or null when the volume generates none for it. */
function shortAliasOf(fullPath: string): string | null {
  const shortPath = shortPathOf(fullPath);
  if (shortPath === null) {
    return null;
  }
  const alias = path.win32.basename(shortPath);
  return alias.toLowerCase() === path.basename(fullPath).toLowerCase() ? null : alias;
}

function inWs(...segments: string[]): string {
  return path.join(fx.ws, ...segments);
}

// =============================================================================================
// openWorkspaceRoot
// =============================================================================================

describe('#49 openWorkspaceRoot on a real filesystem', () => {
  it('#49 opens a directory: canonicalPath is its realpath, displayName its basename', async () => {
    const opened = expectOk(await openWorkspaceRoot(fx.ws));
    expect(opened.canonicalPath).toBe(fs.realpathSync.native(fx.ws));
    expect(opened.displayName).toBe('ws');
    expect(opened.displayName).not.toMatch(/[\\/]/);
    const stats = fs.lstatSync(fx.ws, { bigint: true });
    expect(opened.identity).toEqual({ dev: stats.dev, ino: stats.ino });
  });

  it('#49 canonicalizes the os.tmpdir() spelling, trailing separators and dot segments', async () => {
    const spellings = [
      path.join(fx.tmp, 'ws'),
      `${fx.ws}${path.sep}`,
      `${fx.ws}${path.sep}.${path.sep}`,
      `${fx.ws}${path.sep}src${path.sep}..`,
    ];
    for (const spelling of spellings) {
      const opened = expectOk(await openWorkspaceRoot(spelling));
      expect(opened.canonicalPath).toBe(fx.ws);
      expect(opened.displayName).toBe('ws');
      expect(opened.identity).toEqual(root.identity);
    }
  });

  it.each(['ws', './ws', '.', '..', 'relative/dir', 'ws\\src'])(
    '#49 rejects the relative path %j with ROOT_UNSUPPORTED',
    async (input) => {
      expectCode(await openWorkspaceRoot(input), 'ROOT_UNSUPPORTED');
    },
  );

  it('#49 rejects a relative path even when it would resolve to a real directory', async () => {
    const relative = relativeExistingDirectory();
    expect(path.isAbsolute(relative)).toBe(false);
    expect(fs.existsSync(relative)).toBe(true);
    expectCode(await openWorkspaceRoot(relative), 'ROOT_UNSUPPORTED');
  });

  it.runIf(IS_WINDOWS)('#49 rejects a drive-relative path (C:ws) on Windows', async () => {
    const drive = path.parse(fx.base).root.slice(0, 2);
    expectCode(await openWorkspaceRoot(`${drive}ws`), 'ROOT_UNSUPPORTED');
  });

  it('#49 rejects the empty string and NUL-containing paths with ROOT_UNSUPPORTED', async () => {
    expectCode(await openWorkspaceRoot(''), 'ROOT_UNSUPPORTED');
    expectCode(await openWorkspaceRoot(`${fx.ws}\0`), 'ROOT_UNSUPPORTED');
    expectCode(await openWorkspaceRoot(`${fx.ws}\0${path.sep}src`), 'ROOT_UNSUPPORTED');
    expectCode(await openWorkspaceRoot(`\0${fx.ws}`), 'ROOT_UNSUPPORTED');
  });

  it('#49 rejects non-string selections, including Buffer and file: URL forms fs would accept', async () => {
    const inputs: unknown[] = [
      undefined,
      null,
      42,
      true,
      {},
      [fx.ws],
      Buffer.from(fx.ws),
      pathToFileURL(fx.ws),
      { toString: () => fx.ws },
    ];
    for (const input of inputs) {
      expectCode(await openWorkspaceRoot(input), 'ROOT_UNSUPPORTED');
    }
  });

  it('#49 rejects a regular file with ROOT_UNSUPPORTED', async () => {
    expectCode(await openWorkspaceRoot(inWs('src', 'a.ts')), 'ROOT_UNSUPPORTED');
  });

  it('#49 reports a missing path (or a file used as a directory) as NOT_FOUND', async () => {
    expectCode(await openWorkspaceRoot(path.join(fx.base, 'does-not-exist')), 'NOT_FOUND');
    expectCode(await openWorkspaceRoot(inWs('src', 'a.ts', 'child')), 'NOT_FOUND');
  });

  it('#49 rejects the filesystem root, also when reached through ".." segments', async () => {
    const fsRoot = path.parse(fx.base).root;
    expectCode(await openWorkspaceRoot(fsRoot), 'ROOT_UNSUPPORTED');
    const depth = fx.base.split(path.sep).filter((segment) => segment !== '').length;
    const climbing = [fx.base, ...Array.from({ length: depth + 2 }, () => '..')].join(path.sep);
    expectCode(await openWorkspaceRoot(climbing), 'ROOT_UNSUPPORTED');
  });

  it('#49 rejects a link whose target is the filesystem root (checked after realpath)', async (ctx: TestContext) => {
    const link = path.join(fx.base, 'fsroot-link');
    linkDir(ctx, path.parse(fx.base).root, link);
    try {
      expectCode(await openWorkspaceRoot(link), 'ROOT_UNSUPPORTED');
    } finally {
      removeLinkQuietly(link);
    }
  });

  it.each([
    '\\\\server\\share\\ws',
    '//server/share/ws',
    '\\\\localhost\\c$\\Windows',
    '\\\\?\\C:\\Windows',
    '\\\\.\\C:\\Windows',
    '//?/C:/Windows',
    '//./C:/Windows',
    '\\\\?\\UNC\\server\\share',
    '\\\\.\\PhysicalDrive0',
  ])('#49 rejects the UNC/device-looking path %j with ROOT_UNSUPPORTED', async (input) => {
    expectCode(await openWorkspaceRoot(input), 'ROOT_UNSUPPORTED');
  });

  it('#49 rejects extended-length and device spellings of a real workspace directory', async () => {
    const forward = fx.ws.split(path.sep).join('/');
    for (const input of [`\\\\?\\${fx.ws}`, `\\\\.\\${fx.ws}`, `//?/${forward}`]) {
      expectCode(await openWorkspaceRoot(input), 'ROOT_UNSUPPORTED');
    }
  });

  it.runIf(!IS_WINDOWS)('#49 rejects a character device (/dev/null) as a root', async () => {
    expectCode(await openWorkspaceRoot('/dev/null'), 'ROOT_UNSUPPORTED');
  });

  it.runIf(IS_WINDOWS)(
    '#49 DOS device names inside a real directory are not usable roots',
    async () => {
      for (const device of ['NUL', 'CON', 'aux.txt']) {
        expectCode(
          await openWorkspaceRoot(path.join(fx.base, device)),
          'ROOT_UNSUPPORTED',
          'NOT_FOUND',
        );
      }
    },
  );

  it('#49 resolves a link in the selected path once: the target becomes the boundary', async (ctx: TestContext) => {
    const link = path.join(fx.base, 'ws-link');
    linkDir(ctx, fx.ws, link);
    const opened = expectOk(await openWorkspaceRoot(link));
    expect(opened.canonicalPath).toBe(fx.ws);
    expect(opened.displayName).toBe('ws');
    expect(opened.identity).toEqual(root.identity);

    // Retargeting the originally selected link later does not move the boundary.
    fs.unlinkSync(link);
    linkDir(ctx, fx.outside, link);
    const read = expectOk(await resolveWorkspacePath(opened, 'src/a.ts', 'read'));
    expect(read.canonicalPath).toBe(inWs('src', 'a.ts'));
    expectCode(await resolveWorkspacePath(opened, 'secret.txt', 'read'), 'NOT_FOUND');
  });

  it('#49 a case-variant spelling of the root canonicalizes to the on-disk name', async (ctx: TestContext) => {
    if (!isCaseInsensitiveFs(fx.base)) {
      ctx.skip('case-sensitive filesystem: no case-variant spelling exists');
    }
    const opened = expectOk(await openWorkspaceRoot(path.join(fx.base, 'WS')));
    expect(opened.canonicalPath).toBe(fx.ws);
    expect(opened.displayName).toBe('ws');
  });

  it.runIf(IS_WINDOWS)(
    '#49 an 8.3 short spelling of the root canonicalizes to the long name',
    async (ctx: TestContext) => {
      const longDir = path.join(fx.base, 'workspace-with-a-long-name');
      fs.mkdirSync(longDir);
      const shortPath = shortPathOf(longDir);
      if (shortPath === null) {
        ctx.skip('8.3 short names are not available on this volume');
      }
      const opened = expectOk(await openWorkspaceRoot(shortPath));
      expect(opened.canonicalPath).toBe(longDir);
      expect(opened.displayName).toBe('workspace-with-a-long-name');
    },
  );

  it('#49 a dangling selected link is NOT_FOUND and a link loop fails closed', async (ctx: TestContext) => {
    const dangling = path.join(fx.base, 'dangling-root');
    linkDir(ctx, path.join(fx.base, 'missing-target'), dangling);
    expectCode(await openWorkspaceRoot(dangling), 'NOT_FOUND');

    const loopA = path.join(fx.base, 'loop-a');
    const loopB = path.join(fx.base, 'loop-b');
    linkDir(ctx, loopB, loopA);
    linkDir(ctx, loopA, loopB);
    // README only names ROOT_UNSUPPORTED/NOT_FOUND for roots; ELOOP maps to LINK_ESCAPE.
    expectCode(await openWorkspaceRoot(loopA), 'ROOT_UNSUPPORTED', 'NOT_FOUND', 'LINK_ESCAPE');
  });
});

// =============================================================================================
// verifyWorkspaceRoot and root swaps
// =============================================================================================

describe('#49 verifyWorkspaceRoot detects a swapped root', () => {
  it('#49 an untouched root verifies ok (also after in-root changes)', async () => {
    expectOk(await verifyWorkspaceRoot(root));
    fs.writeFileSync(inWs('new-file.txt'), 'x');
    fs.rmSync(inWs('docs'), { recursive: true });
    expectOk(await verifyWorkspaceRoot(root));
  });

  it('#49 a deleted root is ROOT_CHANGED', async () => {
    fs.rmSync(fx.ws, { recursive: true });
    expectCode(await verifyWorkspaceRoot(root), 'ROOT_CHANGED');
  });

  it('#49 a root moved away is ROOT_CHANGED', async () => {
    renameWithRetry(fx.ws, path.join(fx.base, 'ws-moved'));
    expectCode(await verifyWorkspaceRoot(root), 'ROOT_CHANGED');
  });

  it('#49 a root renamed to a case variant is ROOT_CHANGED (realpath differs)', async () => {
    renameWithRetry(fx.ws, path.join(fx.base, 'WS'));
    expectCode(await verifyWorkspaceRoot(root), 'ROOT_CHANGED');
  });

  it('#49 a root replaced by a link to an outside directory is ROOT_CHANGED', async (ctx: TestContext) => {
    renameWithRetry(fx.ws, path.join(fx.base, 'ws-moved'));
    linkDir(ctx, fx.outside, fx.ws);
    expectCode(await verifyWorkspaceRoot(root), 'ROOT_CHANGED');
  });

  it('#49 a root replaced by a link back to the moved original directory is ROOT_CHANGED', async (ctx: TestContext) => {
    const moved = path.join(fx.base, 'ws-moved');
    renameWithRetry(fx.ws, moved);
    linkDir(ctx, moved, fx.ws);
    expectCode(await verifyWorkspaceRoot(root), 'ROOT_CHANGED');
  });

  it('#49 a root replaced by a new directory with the same name and content is ROOT_CHANGED', async () => {
    renameWithRetry(fx.ws, path.join(fx.base, 'ws-old'));
    fs.mkdirSync(inWs('src'), { recursive: true });
    fs.writeFileSync(inWs('src', 'a.ts'), 'export const a = 1;\n');
    expectCode(await verifyWorkspaceRoot(root), 'ROOT_CHANGED');
  });

  it('#49 a root replaced by a regular file is ROOT_CHANGED', async () => {
    renameWithRetry(fx.ws, path.join(fx.base, 'ws-old'));
    fs.writeFileSync(fx.ws, 'not a directory');
    expectCode(await verifyWorkspaceRoot(root), 'ROOT_CHANGED');
  });

  it('#49 an ANCESTOR of the root swapped for a link is ROOT_CHANGED (same root identity)', async (ctx: TestContext) => {
    const level = path.join(fx.base, 'level');
    fs.mkdirSync(path.join(level, 'inner-ws', 'src'), { recursive: true });
    fs.writeFileSync(path.join(level, 'inner-ws', 'src', 'a.ts'), 'inner\n');
    const inner = expectOk(await openWorkspaceRoot(path.join(level, 'inner-ws')));
    const moved = path.join(fx.base, 'level-moved');
    renameWithRetry(level, moved);
    linkDir(ctx, moved, level);
    // The very same directory is still reachable under the old spelling through the link.
    expect(fs.existsSync(path.join(level, 'inner-ws', 'src', 'a.ts'))).toBe(true);
    expectCode(await verifyWorkspaceRoot(inner), 'ROOT_CHANGED');
    expectCode(await resolveWorkspacePath(inner, 'src/a.ts', 'read'), 'ROOT_CHANGED');
  });
});

describe('#49 every operation re-checks the root (root swap after open)', () => {
  it('#49 resolve/list/write/revalidate/read all fail with ROOT_CHANGED after a link swap', async (ctx: TestContext) => {
    const firstRead = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    const firstList = expectOk(await resolveWorkspacePath(root, '.', 'list'));
    renameWithRetry(fx.ws, path.join(fx.base, 'ws-moved'));
    // The attacker directory offers the same relative path src/a.ts.
    linkDir(ctx, fx.outside, fx.ws);

    for (const intent of INTENTS) {
      expectCode(
        await resolveWorkspacePath(root, intent === 'list' ? 'src' : 'src/a.ts', intent),
        'ROOT_CHANGED',
      );
    }
    expectCode(await resolveWorkspacePath(root, '.', 'list'), 'ROOT_CHANGED');
    expectCode(await revalidateResolvedPath(root, firstRead), 'ROOT_CHANGED');
    expectCode(await revalidateResolvedPath(root, firstList), 'ROOT_CHANGED');
    const read = await readVerifiedTextFile(root, 'src/a.ts');
    expectCode(read, 'ROOT_CHANGED');
    expect(JSON.stringify(read)).not.toContain('FIXTURE_OUTSIDE_SRC_MARKER');
  });

  it('#49 a deleted root makes resolve and read fail with ROOT_CHANGED', async () => {
    fs.rmSync(fx.ws, { recursive: true });
    expectCode(await resolveWorkspacePath(root, '.', 'list'), 'ROOT_CHANGED');
    expectCode(await resolveWorkspacePath(root, 'src/a.ts', 'read'), 'ROOT_CHANGED');
    expectCode(await readVerifiedTextFile(root, 'src/a.ts'), 'ROOT_CHANGED');
  });

  it('#49 a same-named fresh directory replacing the root is ROOT_CHANGED for resolve', async () => {
    renameWithRetry(fx.ws, path.join(fx.base, 'ws-old'));
    fs.mkdirSync(inWs('src'), { recursive: true });
    fs.writeFileSync(inWs('src', 'a.ts'), 'FIXTURE_REPLACED_ROOT_MARKER');
    expectCode(await resolveWorkspacePath(root, 'src/a.ts', 'read'), 'ROOT_CHANGED');
    expectCode(await readVerifiedTextFile(root, 'src/a.ts'), 'ROOT_CHANGED');
  });
});

// =============================================================================================
// resolveWorkspacePath: accepted paths
// =============================================================================================

describe('#49 resolveWorkspacePath accepts canonical in-root paths', () => {
  it('#49 read returns canonical relative/absolute paths, kind, identity and size', async () => {
    const file = inWs('src', 'a.ts');
    const stats = fs.lstatSync(file, { bigint: true });
    const value = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    expect(value).toEqual({
      intent: 'read',
      relativePath: 'src/a.ts',
      canonicalPath: file,
      kind: 'file',
      identity: { dev: stats.dev, ino: stats.ino },
      sizeBytes: stats.size,
      followedLink: false,
    });
    expect(typeof value.sizeBytes).toBe('bigint');
  });

  it.each(['src/a.ts', 'src\\a.ts', './src//a.ts', 'src/./a.ts', '.\\src\\\\a.ts', 'src/a.ts/'])(
    '#49 separator/dot spelling %j resolves to the canonical src/a.ts',
    async (input) => {
      const value = expectOk(await resolveWorkspacePath(root, input, 'read'));
      expect(value.relativePath).toBe('src/a.ts');
      expect(value.canonicalPath).toBe(inWs('src', 'a.ts'));
    },
  );

  it.each(['.', './', '.\\', './/.'])('#49 list %j denotes the root itself', async (input) => {
    const value = expectOk(await resolveWorkspacePath(root, input, 'list'));
    expect(value.relativePath).toBe('');
    expect(value.canonicalPath).toBe(fx.ws);
    expect(value.kind).toBe('directory');
    expect(value.identity).toEqual(root.identity);
    expect(value.followedLink).toBe(false);
  });

  it('#49 list resolves nested and empty directories', async () => {
    for (const [input, relative] of [
      ['src', 'src'],
      ['src/nested', 'src/nested'],
      ['src\\nested\\deep', 'src/nested/deep'],
      ['empty', 'empty'],
    ] as const) {
      const value = expectOk(await resolveWorkspacePath(root, input, 'list'));
      expect(value.relativePath).toBe(relative);
      expect(value.kind).toBe('directory');
      expect(value.canonicalPath).toBe(path.join(fx.ws, ...relative.split('/')));
    }
  });

  it('#49 write accepts a regular in-root file without links', async () => {
    const value = expectOk(await resolveWorkspacePath(root, 'src/nested/deep/b.ts', 'write'));
    expect(value).toMatchObject({
      intent: 'write',
      relativePath: 'src/nested/deep/b.ts',
      canonicalPath: inWs('src', 'nested', 'deep', 'b.ts'),
      kind: 'file',
      followedLink: false,
    });
  });

  it('#49 Turkish and other non-ASCII names round-trip exactly', async () => {
    const segments = ['belgeler', 'çalışma ağacı', 'İĞÜŞÖÇ-ığüşöç.md'];
    fs.mkdirSync(inWs(...segments.slice(0, -1)), { recursive: true });
    fs.writeFileSync(inWs(...segments), 'Merhaba dünya\n');
    const value = expectOk(await resolveWorkspacePath(root, segments.join('/'), 'read'));
    expect(value.relativePath).toBe(segments.join('/'));
    expect(value.canonicalPath).toBe(inWs(...segments));
    const listed = expectOk(await resolveWorkspacePath(root, 'belgeler/çalışma ağacı', 'list'));
    expect(listed.relativePath).toBe('belgeler/çalışma ağacı');
  });

  it('#49 literal "%" and "~" in real file names are accepted (not encodings or 8.3 aliases)', async () => {
    fs.writeFileSync(inWs('100%.txt'), 'percent');
    fs.writeFileSync(inWs('backup~1.txt'), 'tilde');
    expect(expectOk(await resolveWorkspacePath(root, '100%.txt', 'read')).relativePath).toBe(
      '100%.txt',
    );
    expect(expectOk(await resolveWorkspacePath(root, 'backup~1.txt', 'read')).relativePath).toBe(
      'backup~1.txt',
    );
  });

  it('#49 paths longer than MAX_PATH (260) resolve with their canonical relative path', async () => {
    const segments = Array.from({ length: 6 }, (_, index) => `${'d'.repeat(50)}${index}`);
    fs.mkdirSync(inWs(...segments), { recursive: true });
    fs.writeFileSync(inWs(...segments, 'deep.txt'), 'deep\n');
    const relative = [...segments, 'deep.txt'].join('/');
    expect(inWs(...segments, 'deep.txt').length).toBeGreaterThan(260);
    const value = expectOk(await resolveWorkspacePath(root, relative, 'read'));
    expect(value.relativePath).toBe(relative);
    expect(value.canonicalPath).toBe(inWs(...segments, 'deep.txt'));
    const verified = expectOk(await readVerifiedTextFile(root, relative));
    expect(verified.content).toBe('deep\n');
  });
});

// =============================================================================================
// resolveWorkspacePath: lexical rejections against a real tree
// =============================================================================================

describe('#49 lexical rejections never reach existing files', () => {
  const cases: [string, WorkspacePolicyCode][] = [
    ['..', 'TRAVERSAL'],
    ['../ws-evil/secret.txt', 'TRAVERSAL'],
    ['..\\outside\\secret.txt', 'TRAVERSAL'],
    ['src/../../outside/secret.txt', 'TRAVERSAL'],
    ['src/nested/../a.ts', 'TRAVERSAL'],
    ['%2e%2e/ws-evil/secret.txt', 'ENCODED_TRAVERSAL'],
    ['..%2fws-evil%2fsecret.txt', 'ENCODED_TRAVERSAL'],
    ['src%5ca.ts', 'ENCODED_TRAVERSAL'],
    ['src./a.ts', 'INVALID_SEGMENT'],
    ['src /a.ts', 'INVALID_SEGMENT'],
    ['src/a.ts.', 'INVALID_SEGMENT'],
    ['src/a.ts ', 'INVALID_SEGMENT'],
    ['src/a.ts::$DATA', 'INVALID_SEGMENT'],
    ['src/a.ts:alt', 'INVALID_SEGMENT'],
    ['src/a*.ts', 'INVALID_SEGMENT'],
    ['src/con', 'INVALID_SEGMENT'],
    ['', 'INVALID_INPUT'],
    ['src/a.ts\0', 'INVALID_INPUT'],
  ];

  it.each(cases)('#49 %j is %s for read, list and write', async (input, code) => {
    for (const intent of INTENTS) {
      expectCode(await resolveWorkspacePath(root, input, intent), code);
    }
  });

  it('#49 absolute paths are ABSOLUTE_PATH even when they point inside the workspace', async () => {
    const inputs = [
      path.join(fx.outside, 'secret.txt'),
      path.join(fx.evil, 'secret.txt'),
      inWs('src', 'a.ts'),
      fx.ws,
      inWs('src', 'a.ts').split(path.sep).join('/'),
      `\\\\?\\${inWs('src', 'a.ts')}`,
    ];
    for (const input of inputs) {
      for (const intent of INTENTS) {
        expectCode(await resolveWorkspacePath(root, input, intent), 'ABSOLUTE_PATH');
      }
    }
  });
});

// =============================================================================================
// Links (junctions on Windows, symlinks on POSIX)
// =============================================================================================

describe('#49 links that escape the workspace', () => {
  it('#49 a link to an outside directory is LINK_ESCAPE for read/list, LINK_NOT_ALLOWED for write', async (ctx: TestContext) => {
    linkDir(ctx, fx.outside, inWs('out'));
    expectCode(await resolveWorkspacePath(root, 'out/secret.txt', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'out', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'out', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'out/src', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'out/secret.txt', 'write'), 'LINK_NOT_ALLOWED');
    const read = await readVerifiedTextFile(root, 'out/secret.txt');
    expectCode(read, 'LINK_ESCAPE');
    expect(JSON.stringify(read)).not.toContain('FIXTURE_OUTSIDE_MARKER');
  });

  it('#49 a link to the sibling-prefix directory (ws-evil) is LINK_ESCAPE', async (ctx: TestContext) => {
    linkDir(ctx, fx.evil, inWs('evil'));
    linkDir(ctx, path.join(fx.evil, 'src'), inWs('evil-src'));
    expectCode(await resolveWorkspacePath(root, 'evil/secret.txt', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'evil', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'evil-src/a.ts', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'evil-src', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'evil/secret.txt', 'write'), 'LINK_NOT_ALLOWED');
    expectCode(await readVerifiedTextFile(root, 'evil/secret.txt'), 'LINK_ESCAPE');
  });

  it('#49 links to trailing-dot / trailing-space siblings ("ws." and "ws ") are LINK_ESCAPE', async (ctx: TestContext) => {
    // Node uses namespaced paths on Windows, so these literal names can exist next to "ws".
    for (const [name, link] of [
      ['ws.', 'dot-sibling'],
      ['ws ', 'space-sibling'],
    ] as const) {
      const sibling = path.join(fx.base, name);
      fs.mkdirSync(sibling);
      fs.writeFileSync(path.join(sibling, 'secret.txt'), 'FIXTURE_TRAILING_SIBLING_MARKER');
      linkDir(ctx, sibling, inWs(link));
      expectCode(await resolveWorkspacePath(root, `${link}/secret.txt`, 'read'), 'LINK_ESCAPE');
      expectCode(await resolveWorkspacePath(root, link, 'list'), 'LINK_ESCAPE');
      expectCode(await readVerifiedTextFile(root, `${link}/secret.txt`), 'LINK_ESCAPE');
      // Opening the sibling itself yields a distinct boundary, never the original workspace.
      const opened = expectOk(await openWorkspaceRoot(sibling));
      expect(opened.canonicalPath).not.toBe(fx.ws);
      expect(opened.identity).not.toEqual(root.identity);
    }
  });

  it('#49 a link to an outside directory that is also named "ws" is LINK_ESCAPE', async (ctx: TestContext) => {
    const decoy = path.join(fx.outside, 'ws');
    fs.mkdirSync(path.join(decoy, 'src'), { recursive: true });
    fs.writeFileSync(path.join(decoy, 'src', 'a.ts'), 'FIXTURE_DECOY_MARKER');
    linkDir(ctx, decoy, inWs('decoy'));
    expectCode(await resolveWorkspacePath(root, 'decoy/src/a.ts', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'decoy', 'list'), 'LINK_ESCAPE');
  });

  it('#49 a link to the workspace parent is LINK_ESCAPE, even for paths that lead back inside', async (ctx: TestContext) => {
    linkDir(ctx, fx.base, inWs('up'));
    expectCode(await resolveWorkspacePath(root, 'up', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'up/outside/secret.txt', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'up/ws-evil/secret.txt', 'read'), 'LINK_ESCAPE');
    // Each traversed link must itself resolve inside the root (README step 3).
    expectCode(await resolveWorkspacePath(root, 'up/ws/src/a.ts', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'up/ws/src/a.ts', 'write'), 'LINK_NOT_ALLOWED');
  });

  it('#49 a link chain (in-root link -> in-root link -> outside) is LINK_ESCAPE', async (ctx: TestContext) => {
    linkDir(ctx, fx.outside, inWs('hop2'));
    linkDir(ctx, inWs('hop2'), inWs('hop1'));
    expectCode(await resolveWorkspacePath(root, 'hop1/secret.txt', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'hop1', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'hop2', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'hop1/secret.txt', 'write'), 'LINK_NOT_ALLOWED');
    expectCode(await readVerifiedTextFile(root, 'hop1/secret.txt'), 'LINK_ESCAPE');
  });

  it('#49 an escaping link deep inside the tree is caught at its own component', async (ctx: TestContext) => {
    linkDir(ctx, fx.outside, inWs('src', 'nested', 'deep', 'vendor'));
    expectCode(
      await resolveWorkspacePath(root, 'src/nested/deep/vendor/secret.txt', 'read'),
      'LINK_ESCAPE',
    );
    expectCode(await resolveWorkspacePath(root, 'src/nested/deep/vendor', 'list'), 'LINK_ESCAPE');
    // The non-link ancestors themselves remain listable.
    expectOk(await resolveWorkspacePath(root, 'src/nested/deep', 'list'));
  });

  it('#49 a dangling link fails closed (LINK_ESCAPE or NOT_FOUND; write: LINK_NOT_ALLOWED)', async (ctx: TestContext) => {
    linkDir(ctx, path.join(fx.outside, 'not-created-yet'), inWs('dangling-out'));
    linkDir(ctx, inWs('not-created-either'), inWs('dangling-in'));
    for (const name of ['dangling-out', 'dangling-in']) {
      // policy-result.ts documents LINK_ESCAPE for links that "cannot be resolved"; README
      // step 3 names NOT_FOUND for missing components. Either is a closed failure.
      expectCode(
        await resolveWorkspacePath(root, `${name}/x.txt`, 'read'),
        'LINK_ESCAPE',
        'NOT_FOUND',
      );
      expectCode(await resolveWorkspacePath(root, name, 'list'), 'LINK_ESCAPE', 'NOT_FOUND');
      expectCode(await resolveWorkspacePath(root, `${name}/x.txt`, 'write'), 'LINK_NOT_ALLOWED');
    }
    // The dangling target must not have been created as a side effect.
    expect(fs.existsSync(path.join(fx.outside, 'not-created-yet'))).toBe(false);
  });

  it('#49 a link loop is LINK_ESCAPE for read/list and LINK_NOT_ALLOWED for write', async (ctx: TestContext) => {
    linkDir(ctx, inWs('loop-b'), inWs('loop-a'));
    linkDir(ctx, inWs('loop-a'), inWs('loop-b'));
    expectCode(await resolveWorkspacePath(root, 'loop-a/x.txt', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'loop-a', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'loop-b', 'list'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'loop-a/x.txt', 'write'), 'LINK_NOT_ALLOWED');
    expectCode(await readVerifiedTextFile(root, 'loop-a/x.txt'), 'LINK_ESCAPE');
  });

  it('#49 a file symbolic link to an outside file is LINK_ESCAPE (write: LINK_NOT_ALLOWED)', async (ctx: TestContext) => {
    linkFile(ctx, path.join(fx.outside, 'secret.txt'), inWs('secret-link.txt'));
    expectCode(await resolveWorkspacePath(root, 'secret-link.txt', 'read'), 'LINK_ESCAPE');
    expectCode(await resolveWorkspacePath(root, 'secret-link.txt', 'write'), 'LINK_NOT_ALLOWED');
    expectCode(await resolveWorkspacePath(root, 'secret-link.txt', 'list'), 'LINK_ESCAPE');
    expectCode(await readVerifiedTextFile(root, 'secret-link.txt'), 'LINK_ESCAPE');
  });

  it.runIf(!IS_WINDOWS)(
    '#49 relative symlinks are judged by their resolved target (POSIX)',
    async () => {
      fs.symlinkSync('../outside', inWs('rel-out'));
      createdLinks.push(inWs('rel-out'));
      fs.symlinkSync('../ws/src', inWs('rel-in'));
      createdLinks.push(inWs('rel-in'));
      fs.symlinkSync('../../ws-evil/secret.txt', inWs('src', 'rel-evil.txt'));
      createdLinks.push(inWs('src', 'rel-evil.txt'));
      expectCode(await resolveWorkspacePath(root, 'rel-out/secret.txt', 'read'), 'LINK_ESCAPE');
      expectCode(await resolveWorkspacePath(root, 'src/rel-evil.txt', 'read'), 'LINK_ESCAPE');
      const inside = expectOk(await resolveWorkspacePath(root, 'rel-in/a.ts', 'read'));
      expect(inside.relativePath).toBe('src/a.ts');
      expect(inside.followedLink).toBe(true);
    },
  );
});

describe('#49 links that stay inside the workspace', () => {
  it('#49 an in-root directory link is followed for read/list with canonical results', async (ctx: TestContext) => {
    linkDir(ctx, inWs('src'), inWs('alias'));
    const direct = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    const viaLink = expectOk(await resolveWorkspacePath(root, 'alias/a.ts', 'read'));
    expect(viaLink.followedLink).toBe(true);
    expect(viaLink.relativePath).toBe('src/a.ts');
    expect(viaLink.canonicalPath).toBe(inWs('src', 'a.ts'));
    expect(viaLink.identity).toEqual(direct.identity);
    expect(viaLink.kind).toBe('file');

    const listed = expectOk(await resolveWorkspacePath(root, 'alias', 'list'));
    expect(listed).toMatchObject({ relativePath: 'src', followedLink: true, kind: 'directory' });
    expect(listed.canonicalPath).toBe(inWs('src'));

    const nested = expectOk(await resolveWorkspacePath(root, 'alias/nested/deep/b.ts', 'read'));
    expect(nested.relativePath).toBe('src/nested/deep/b.ts');
  });

  it('#49 write through an in-root link is LINK_NOT_ALLOWED', async (ctx: TestContext) => {
    linkDir(ctx, inWs('src'), inWs('alias'));
    expectCode(await resolveWorkspacePath(root, 'alias/a.ts', 'write'), 'LINK_NOT_ALLOWED');
    expectCode(
      await resolveWorkspacePath(root, 'alias/nested/deep/b.ts', 'write'),
      'LINK_NOT_ALLOWED',
    );
    // The canonical spelling of the same file is still writable.
    expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'write'));
  });

  it('#49 readVerifiedTextFile through an in-root link reports the canonical path', async (ctx: TestContext) => {
    linkDir(ctx, inWs('src'), inWs('alias'));
    const verified = expectOk(await readVerifiedTextFile(root, 'alias/a.ts'));
    expect(verified).toEqual({
      relativePath: 'src/a.ts',
      content: 'export const a = 1;\n',
      sizeBytes: Buffer.byteLength('export const a = 1;\n'),
    });
  });

  it('#49 a nested in-root link pointing sideways resolves to the canonical target', async (ctx: TestContext) => {
    linkDir(ctx, inWs('docs'), inWs('src', 'nested', 'docs-link'));
    const value = expectOk(
      await resolveWorkspacePath(root, 'src/nested/docs-link/readme.md', 'read'),
    );
    expect(value.relativePath).toBe('docs/readme.md');
    expect(value.followedLink).toBe(true);
  });

  it('#49 a link to the workspace root itself stays inside (list gives the root)', async (ctx: TestContext) => {
    linkDir(ctx, fx.ws, inWs('self'));
    const listed = expectOk(await resolveWorkspacePath(root, 'self', 'list'));
    expect(listed.relativePath).toBe('');
    expect(listed.canonicalPath).toBe(fx.ws);
    expect(listed.followedLink).toBe(true);
    const read = expectOk(await resolveWorkspacePath(root, 'self/self/src/a.ts', 'read'));
    expect(read.relativePath).toBe('src/a.ts');
    expectCode(await resolveWorkspacePath(root, 'self/src/a.ts', 'write'), 'LINK_NOT_ALLOWED');
  });

  it('#49 an in-root file symbolic link is followed for read but never for write', async (ctx: TestContext) => {
    linkFile(ctx, inWs('src', 'a.ts'), inWs('a-link.ts'));
    const value = expectOk(await resolveWorkspacePath(root, 'a-link.ts', 'read'));
    expect(value.relativePath).toBe('src/a.ts');
    expect(value.followedLink).toBe(true);
    expectCode(await resolveWorkspacePath(root, 'a-link.ts', 'write'), 'LINK_NOT_ALLOWED');
  });

  it('#49 a link whose final target is inside is accepted even via an outside hop (by canonical target)', async (ctx: TestContext) => {
    // README step 3 judges each link by its realpath; the outside hop is not itself traversed
    // as a workspace component, so the canonical, contained target is what counts.
    linkDir(ctx, inWs('src'), path.join(fx.outside, 'back-in'));
    linkDir(ctx, path.join(fx.outside, 'back-in'), inWs('detour'));
    const value = expectOk(await resolveWorkspacePath(root, 'detour/a.ts', 'read'));
    expect(value.relativePath).toBe('src/a.ts');
    expect(value.canonicalPath).toBe(inWs('src', 'a.ts'));
    expect(value.followedLink).toBe(true);
    expectCode(await resolveWorkspacePath(root, 'detour/a.ts', 'write'), 'LINK_NOT_ALLOWED');
  });

  it('#49 an in-root link whose target is spelled in another case is judged by its canonical target', async (ctx: TestContext) => {
    if (!isCaseInsensitiveFs(fx.base)) {
      ctx.skip('needs a case-insensitive filesystem');
    }
    linkDir(ctx, path.join(fx.base, 'WS', 'SRC'), inWs('case-alias'));
    const value = expectOk(await resolveWorkspacePath(root, 'case-alias/a.ts', 'read'));
    expect(value.relativePath).toBe('src/a.ts');
    expect(value.canonicalPath).toBe(inWs('src', 'a.ts'));
    // A case-variant spelling of the sibling-prefix directory is still outside.
    linkDir(ctx, path.join(fx.base, 'WS-EVIL'), inWs('case-evil'));
    expectCode(await resolveWorkspacePath(root, 'case-evil/secret.txt', 'read'), 'LINK_ESCAPE');
  });
});

// =============================================================================================
// Hard links
// =============================================================================================

describe('#49 hard links fail closed', () => {
  it('#49 a hardlink inside the workspace to an outside file is HARDLINK_UNSUPPORTED', async (ctx: TestContext) => {
    hardLink(ctx, path.join(fx.outside, 'secret.txt'), inWs('src', 'alias.txt'));
    expectCode(await resolveWorkspacePath(root, 'src/alias.txt', 'read'), 'HARDLINK_UNSUPPORTED');
    expectCode(await resolveWorkspacePath(root, 'src/alias.txt', 'write'), 'HARDLINK_UNSUPPORTED');
    const read = await readVerifiedTextFile(root, 'src/alias.txt');
    expectCode(read, 'HARDLINK_UNSUPPORTED');
    expect(JSON.stringify(read)).not.toContain('FIXTURE_OUTSIDE_MARKER');
  });

  it('#49 two in-workspace names for one file are both rejected; removing one restores access', async (ctx: TestContext) => {
    hardLink(ctx, inWs('src', 'a.ts'), inWs('docs', 'a-copy.ts'));
    for (const name of ['src/a.ts', 'docs/a-copy.ts']) {
      expectCode(await resolveWorkspacePath(root, name, 'read'), 'HARDLINK_UNSUPPORTED');
      expectCode(await resolveWorkspacePath(root, name, 'write'), 'HARDLINK_UNSUPPORTED');
      expectCode(await readVerifiedTextFile(root, name), 'HARDLINK_UNSUPPORTED');
    }
    fs.unlinkSync(inWs('docs', 'a-copy.ts'));
    expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    expect(expectOk(await readVerifiedTextFile(root, 'src/a.ts')).content).toBe(
      'export const a = 1;\n',
    );
  });

  it('#49 listing a directory that contains a hardlinked file is still allowed', async (ctx: TestContext) => {
    hardLink(ctx, path.join(fx.outside, 'secret.txt'), inWs('src', 'alias.txt'));
    expectOk(await resolveWorkspacePath(root, 'src', 'list'));
    expectOk(await resolveWorkspacePath(root, '.', 'list'));
  });
});

// =============================================================================================
// Entry kinds and missing paths
// =============================================================================================

describe('#49 entry kinds and missing paths', () => {
  it('#49 read/write on a directory and list on a file are UNSUPPORTED_FILE_TYPE', async () => {
    expectCode(await resolveWorkspacePath(root, 'src', 'read'), 'UNSUPPORTED_FILE_TYPE');
    expectCode(await resolveWorkspacePath(root, 'src', 'write'), 'UNSUPPORTED_FILE_TYPE');
    expectCode(await resolveWorkspacePath(root, '.', 'read'), 'UNSUPPORTED_FILE_TYPE');
    expectCode(await resolveWorkspacePath(root, '.', 'write'), 'UNSUPPORTED_FILE_TYPE');
    expectCode(await resolveWorkspacePath(root, 'src/a.ts', 'list'), 'UNSUPPORTED_FILE_TYPE');
    expectCode(await readVerifiedTextFile(root, 'src'), 'UNSUPPORTED_FILE_TYPE');
  });

  it('#49 missing files and directories are NOT_FOUND for every intent', async () => {
    for (const intent of INTENTS) {
      expectCode(await resolveWorkspacePath(root, 'src/missing.ts', intent), 'NOT_FOUND');
      expectCode(await resolveWorkspacePath(root, 'missing-dir/a.ts', intent), 'NOT_FOUND');
      expectCode(await resolveWorkspacePath(root, 'missing-dir', intent), 'NOT_FOUND');
    }
    expectCode(await readVerifiedTextFile(root, 'src/missing.ts'), 'NOT_FOUND');
  });

  it('#49 a file used as a directory is NOT_FOUND for every intent', async () => {
    for (const intent of INTENTS) {
      expectCode(await resolveWorkspacePath(root, 'src/a.ts/child', intent), 'NOT_FOUND');
      expectCode(await resolveWorkspacePath(root, 'docs/readme.md/x/y', intent), 'NOT_FOUND');
    }
    expectCode(await readVerifiedTextFile(root, 'src/a.ts/child'), 'NOT_FOUND');
  });

  it.runIf(!IS_WINDOWS)(
    '#49 a FIFO is UNSUPPORTED_FILE_TYPE and is never opened',
    async (ctx: TestContext) => {
      const fifo = inWs('pipe');
      try {
        execFileSync('mkfifo', [fifo]);
      } catch {
        ctx.skip('mkfifo is not available');
      }
      for (const intent of INTENTS) {
        expectCode(await resolveWorkspacePath(root, 'pipe', intent), 'UNSUPPORTED_FILE_TYPE');
      }
      // Opening a FIFO for reading would block; the policy must refuse before open().
      expectCode(await readVerifiedTextFile(root, 'pipe'), 'UNSUPPORTED_FILE_TYPE');
    },
  );

  it.runIf(!IS_WINDOWS)('#49 a Unix domain socket is UNSUPPORTED_FILE_TYPE', async () => {
    const socketPath = inWs('agent.sock');
    const server = net.createServer();
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, () => {
        resolve();
      });
    });
    try {
      for (const intent of INTENTS) {
        expectCode(await resolveWorkspacePath(root, 'agent.sock', intent), 'UNSUPPORTED_FILE_TYPE');
      }
      expectCode(await readVerifiedTextFile(root, 'agent.sock'), 'UNSUPPORTED_FILE_TYPE');
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    }
  });
});

// =============================================================================================
// NON_CANONICAL_PATH
// =============================================================================================

describe('#49 non-canonical spellings', () => {
  it('#49 case-only variants are NON_CANONICAL_PATH on case-insensitive filesystems (else NOT_FOUND)', async () => {
    const expected: WorkspacePolicyCode = isCaseInsensitiveFs(fx.base)
      ? 'NON_CANONICAL_PATH'
      : 'NOT_FOUND';
    if (IS_WINDOWS) {
      expect(expected).toBe('NON_CANONICAL_PATH');
    }
    const cases: [string, AccessIntent][] = [
      ['SRC/a.ts', 'read'],
      ['src/A.TS', 'read'],
      ['Src/Nested/deep/b.ts', 'read'],
      ['SRC/a.ts', 'write'],
      ['src/A.ts', 'write'],
      ['SRC', 'list'],
      ['src/NESTED', 'list'],
    ];
    for (const [input, intent] of cases) {
      expectCode(await resolveWorkspacePath(root, input, intent), expected);
    }
    expectCode(await readVerifiedTextFile(root, 'SRC/a.ts'), expected);
  });

  it('#49 Turkish dotted/dotless i never alias a differently named file', async () => {
    fs.writeFileSync(inWs('i.txt'), 'i');
    expectOk(await resolveWorkspacePath(root, 'i.txt', 'read'));
    for (const input of ['İ.txt', 'ı.txt']) {
      expectCode(
        await resolveWorkspacePath(root, input, 'read'),
        'NOT_FOUND',
        'NON_CANONICAL_PATH',
      );
    }
    expectCode(
      await resolveWorkspacePath(root, 'I.txt', 'read'),
      isCaseInsensitiveFs(fx.base) ? 'NON_CANONICAL_PATH' : 'NOT_FOUND',
    );
  });

  it.runIf(IS_WINDOWS)(
    '#49 8.3 short aliases of directories and files are NON_CANONICAL_PATH',
    async (ctx: TestContext) => {
      const longDir = inWs('averylongdirectoryname');
      fs.mkdirSync(longDir);
      fs.writeFileSync(path.join(longDir, 'averylongfilename.txt'), 'long\n');
      const dirAlias = shortAliasOf(longDir);
      const fileAlias = shortAliasOf(path.join(longDir, 'averylongfilename.txt'));
      if (dirAlias === null || fileAlias === null) {
        ctx.skip('8.3 short names are not generated on this volume');
      }
      expect(fs.existsSync(path.join(fx.ws, dirAlias, fileAlias))).toBe(true);

      expectOk(
        await resolveWorkspacePath(root, 'averylongdirectoryname/averylongfilename.txt', 'read'),
      );
      expectCode(
        await resolveWorkspacePath(root, `${dirAlias}/averylongfilename.txt`, 'read'),
        'NON_CANONICAL_PATH',
      );
      expectCode(
        await resolveWorkspacePath(root, `averylongdirectoryname/${fileAlias}`, 'read'),
        'NON_CANONICAL_PATH',
      );
      expectCode(await resolveWorkspacePath(root, dirAlias, 'list'), 'NON_CANONICAL_PATH');
      expectCode(
        await resolveWorkspacePath(root, `${dirAlias}/${fileAlias}`, 'write'),
        'NON_CANONICAL_PATH',
      );
      expectCode(
        await readVerifiedTextFile(root, `${dirAlias}/averylongfilename.txt`),
        'NON_CANONICAL_PATH',
      );
    },
  );

  it('#49 after an in-root link, a case alias never yields a non-canonical result', async (ctx: TestContext) => {
    if (!isCaseInsensitiveFs(fx.base)) {
      ctx.skip('needs a case-insensitive filesystem');
    }
    linkDir(ctx, inWs('src'), inWs('alias'));
    const result = await resolveWorkspacePath(root, 'alias/A.TS', 'read');
    // README step 5 skips the name check once a link was followed; either way the result
    // must only ever carry the canonical on-disk spelling.
    if (result.ok) {
      expect(result.value.relativePath).toBe('src/a.ts');
      expect(result.value.canonicalPath).toBe(inWs('src', 'a.ts'));
    } else {
      expectCode(result, 'NON_CANONICAL_PATH');
    }
  });
});

// =============================================================================================
// revalidateResolvedPath (time-of-check / time-of-use)
// =============================================================================================

describe('#49 revalidateResolvedPath re-checks before use', () => {
  it('#49 unchanged targets revalidate ok with the same identity (read, write, list, root)', async () => {
    const cases: [string, AccessIntent][] = [
      ['src/a.ts', 'read'],
      ['src/a.ts', 'write'],
      ['src', 'list'],
      ['.', 'list'],
    ];
    for (const [input, intent] of cases) {
      const first = expectOk(await resolveWorkspacePath(root, input, intent));
      const again = expectOk(await revalidateResolvedPath(root, first));
      expect(again).toEqual(first);
    }
  });

  it('#49 an in-place content change keeps the identity: ok with the new size', async () => {
    const first = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'write'));
    fs.writeFileSync(inWs('src', 'a.ts'), 'export const a = 1234567890;\n');
    const again = expectOk(await revalidateResolvedPath(root, first));
    expect(again.identity).toEqual(first.identity);
    expect(again.canonicalPath).toBe(first.canonicalPath);
    expect(again.sizeBytes).toBe(BigInt(Buffer.byteLength('export const a = 1234567890;\n')));
  });

  it('#49 a file replaced by a different file with the same name is TARGET_CHANGED', async () => {
    const firstRead = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    const firstWrite = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'write'));
    replaceFileAtomically(inWs('src', 'a.ts'), 'export const a = 1;\n');
    expectCode(await revalidateResolvedPath(root, firstRead), 'TARGET_CHANGED');
    expectCode(await revalidateResolvedPath(root, firstWrite), 'TARGET_CHANGED');
  });

  it('#49 a deleted file is NOT_FOUND on revalidation', async () => {
    const first = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    fs.unlinkSync(inWs('src', 'a.ts'));
    expectCode(await revalidateResolvedPath(root, first), 'NOT_FOUND');
  });

  it('#49 a file replaced by a directory fails closed on revalidation', async () => {
    const first = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    fs.unlinkSync(inWs('src', 'a.ts'));
    fs.mkdirSync(inWs('src', 'a.ts'));
    expectCode(
      await revalidateResolvedPath(root, first),
      'UNSUPPORTED_FILE_TYPE',
      'TARGET_CHANGED',
    );
  });

  it('#49 a directory replaced by a different directory is TARGET_CHANGED (list)', async () => {
    const first = expectOk(await resolveWorkspacePath(root, 'docs', 'list'));
    renameWithRetry(inWs('docs'), inWs('docs-old'));
    fs.mkdirSync(inWs('docs'));
    expectCode(await revalidateResolvedPath(root, first), 'TARGET_CHANGED');
  });

  it('#49 parent swapped for a link to an outside dir with a same-named file fails closed', async (ctx: TestContext) => {
    const firstRead = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    const firstWrite = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'write'));
    const firstList = expectOk(await resolveWorkspacePath(root, 'src', 'list'));
    renameWithRetry(inWs('src'), inWs('src-old'));
    // outside/ contains a.ts, so src/a.ts exists again but outside the boundary.
    linkDir(ctx, fx.outside, inWs('src'));

    expectCode(await revalidateResolvedPath(root, firstRead), 'LINK_ESCAPE', 'TARGET_CHANGED');
    expectCode(await revalidateResolvedPath(root, firstWrite), 'LINK_NOT_ALLOWED');
    expectCode(await revalidateResolvedPath(root, firstList), 'LINK_ESCAPE', 'TARGET_CHANGED');
    const read = await readVerifiedTextFile(root, 'src/a.ts');
    expectCode(read, 'LINK_ESCAPE');
    expect(JSON.stringify(read)).not.toContain('FIXTURE_OUTSIDE_A_MARKER');
  });

  it('#49 parent swapped for an in-root link to another dir with a same-named file is TARGET_CHANGED', async (ctx: TestContext) => {
    const firstRead = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    const firstWrite = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'write'));
    renameWithRetry(inWs('src'), inWs('src-old'));
    linkDir(ctx, inWs('other'), inWs('src'));
    expectCode(await revalidateResolvedPath(root, firstRead), 'TARGET_CHANGED');
    expectCode(await revalidateResolvedPath(root, firstWrite), 'LINK_NOT_ALLOWED');
  });

  it('#49 parent swapped for an in-root link back to the moved original is TARGET_CHANGED', async (ctx: TestContext) => {
    const firstRead = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    renameWithRetry(inWs('src'), inWs('src-moved'));
    linkDir(ctx, inWs('src-moved'), inWs('src'));
    // Same file identity, but the canonical path moved: still TARGET_CHANGED.
    expectCode(await revalidateResolvedPath(root, firstRead), 'TARGET_CHANGED');
  });

  it('#49 a file replaced by a hardlink to an outside file is HARDLINK_UNSUPPORTED', async (ctx: TestContext) => {
    const first = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'write'));
    const staging = inWs('src', 'a.ts.staging');
    hardLink(ctx, path.join(fx.outside, 'a.ts'), staging);
    renameWithRetry(staging, inWs('src', 'a.ts'));
    expectCode(await revalidateResolvedPath(root, first), 'HARDLINK_UNSUPPORTED');
  });

  it('#49 a file replaced by a symbolic link to an outside file fails closed', async (ctx: TestContext) => {
    const firstRead = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    const firstWrite = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'write'));
    const staging = inWs('src', 'a.ts.staging');
    linkFile(ctx, path.join(fx.outside, 'a.ts'), staging);
    renameWithRetry(staging, inWs('src', 'a.ts'));
    createdLinks.push(inWs('src', 'a.ts'));
    expectCode(await revalidateResolvedPath(root, firstRead), 'LINK_ESCAPE', 'TARGET_CHANGED');
    expectCode(await revalidateResolvedPath(root, firstWrite), 'LINK_NOT_ALLOWED');
    expectCode(await readVerifiedTextFile(root, 'src/a.ts'), 'LINK_ESCAPE');
  });

  it('#49 revalidation keeps the original intent and is anchored to the canonical path', async (ctx: TestContext) => {
    linkDir(ctx, inWs('src'), inWs('alias'));
    const first = expectOk(await resolveWorkspacePath(root, 'alias/a.ts', 'read'));
    expect(first.relativePath).toBe('src/a.ts');
    // Retarget the alias outside: the canonical target src/a.ts is unchanged.
    fs.unlinkSync(inWs('alias'));
    linkDir(ctx, fx.outside, inWs('alias'));
    const again = expectOk(await revalidateResolvedPath(root, first));
    expect(again.intent).toBe('read');
    expect(again.canonicalPath).toBe(inWs('src', 'a.ts'));
    expect(again.identity).toEqual(first.identity);
  });

  it('#49 a case-only rename of the validated file fails closed (same identity, new name)', async () => {
    const first = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'write'));
    const caseInsensitive = isCaseInsensitiveFs(fx.base);
    renameWithRetry(inWs('src', 'a.ts'), inWs('src', 'A.ts'));
    expectCode(
      await revalidateResolvedPath(root, first),
      caseInsensitive ? 'NON_CANONICAL_PATH' : 'NOT_FOUND',
    );
  });
});

// =============================================================================================
// Property: whatever a request looks like, an accepted result is canonical and contained
// =============================================================================================

describe('#49 property: accepted results are always canonical and inside the root', () => {
  const SEGMENTS = [
    'src',
    'SRC',
    'a.ts',
    'A.TS',
    'nested',
    'deep',
    'b.ts',
    'docs',
    'readme.md',
    'other',
    'out',
    'up',
    'evil',
    'alias',
    'self',
    'hard.txt',
    'secret.txt',
    'ws',
    'ws-evil',
    'outside',
    '..',
    '.',
    '',
    '%2e%2e',
    'src.',
    'con',
    'missing',
  ];
  const FORBIDDEN_CONTENT = /FIXTURE_[A-Z_]+_MARKER/;

  it('#49 random requests over a tree with escaping, in-root and hard links', async (ctx: TestContext) => {
    linkDir(ctx, fx.outside, inWs('out'));
    linkDir(ctx, fx.base, inWs('up'));
    linkDir(ctx, fx.evil, inWs('evil'));
    linkDir(ctx, inWs('src'), inWs('alias'));
    linkDir(ctx, fx.ws, inWs('self'));
    hardLink(ctx, path.join(fx.outside, 'secret.txt'), inWs('hard.txt'));

    const request = fc.record({
      segments: fc.array(fc.constantFrom(...SEGMENTS), { minLength: 1, maxLength: 5 }),
      separator: fc.constantFrom('/', '\\'),
      intent: fc.constantFrom<AccessIntent>('read', 'list', 'write'),
    });

    await fc.assert(
      fc.asyncProperty(request, async ({ segments, separator, intent }) => {
        const input = segments.join(separator);
        const result = await resolveWorkspacePath(root, input, intent);
        if (!result.ok) {
          expectNoPathLeak(result);
          return;
        }
        const value = result.value;
        const relative = path.relative(fx.ws, value.canonicalPath);
        expect(relative === '' || relative.split(path.sep)[0] !== '..').toBe(true);
        expect(path.isAbsolute(relative)).toBe(false);
        expect(fs.realpathSync.native(value.canonicalPath)).toBe(value.canonicalPath);
        expect(value.relativePath).toBe(relative.split(path.sep).join('/'));
        const stats = fs.lstatSync(value.canonicalPath, { bigint: true });
        expect(value.identity).toEqual({ dev: stats.dev, ino: stats.ino });
        expect(value.intent).toBe(intent);
        if (intent === 'list') {
          expect(value.kind).toBe('directory');
        } else {
          expect(value.kind).toBe('file');
          expect(stats.nlink).toBe(1n);
          expect(fs.readFileSync(value.canonicalPath, 'utf8')).not.toMatch(FORBIDDEN_CONTENT);
        }
        if (intent === 'write') {
          expect(value.followedLink).toBe(false);
        }
        // Whatever was accepted must revalidate unchanged while nothing moves.
        const again = await revalidateResolvedPath(root, value);
        expect(outcome(again)).toBe('OK');
      }),
      { numRuns: 300 },
    );
  });
});

// =============================================================================================
// readVerifiedTextFile
// =============================================================================================

describe('#49 readVerifiedTextFile', () => {
  function writeWs(relative: string, data: string | Buffer): void {
    const target = path.join(fx.ws, ...relative.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
  }

  it('#49 reads UTF-8 without BOM: content, byte size and canonical relative path only', async () => {
    const value = expectOk(await readVerifiedTextFile(root, 'src\\a.ts'));
    expect(value).toEqual({
      relativePath: 'src/a.ts',
      content: 'export const a = 1;\n',
      sizeBytes: Buffer.byteLength('export const a = 1;\n'),
    });
    // What is sent to the renderer carries no absolute path.
    const serialized = JSON.stringify(value);
    for (const fragment of sensitiveFragments()) {
      expect(serialized).not.toContain(fragment);
    }
  });

  it('#49 strips a leading UTF-8 BOM (size still counts the BOM bytes)', async () => {
    writeWs('bom.txt', Buffer.concat([UTF8_BOM, Buffer.from('hello\n')]));
    const value = expectOk(await readVerifiedTextFile(root, 'bom.txt'));
    expect(value.content).toBe('hello\n');
    expect(value.sizeBytes).toBe(UTF8_BOM.length + 6);
  });

  it('#49 a BOM-only file is empty text; only the first of two BOMs is stripped', async () => {
    writeWs('bom-only.txt', UTF8_BOM);
    expect(expectOk(await readVerifiedTextFile(root, 'bom-only.txt')).content).toBe('');
    writeWs('double-bom.txt', Buffer.concat([UTF8_BOM, UTF8_BOM, Buffer.from('x')]));
    expect(expectOk(await readVerifiedTextFile(root, 'double-bom.txt')).content).toBe('\uFEFFx');
  });

  it('#49 an empty file reads as empty text with size 0', async () => {
    writeWs('empty.txt', '');
    expect(expectOk(await readVerifiedTextFile(root, 'empty.txt'))).toEqual({
      relativePath: 'empty.txt',
      content: '',
      sizeBytes: 0,
    });
    expect(expectOk(await readVerifiedTextFile(root, 'empty.txt', 0)).content).toBe('');
  });

  it('#49 Turkish text round-trips and sizeBytes counts UTF-8 bytes', async () => {
    const text = 'Çalışma ağacı: ğüşıöç İĞÜŞÖÇ — dosya içeriği\n';
    writeWs('türkçe/metin.txt', text);
    const value = expectOk(await readVerifiedTextFile(root, 'türkçe/metin.txt'));
    expect(value.content).toBe(text);
    expect(value.sizeBytes).toBe(Buffer.byteLength(text, 'utf8'));
    expect(value.relativePath).toBe('türkçe/metin.txt');
  });

  it('#49 CRLF, lone CR and mixed line endings are preserved byte-for-byte', async () => {
    const text = 'line1\r\nline2\r\n\r\nlast\rcr-only\nlf-only\n';
    writeWs('crlf.txt', text);
    expect(expectOk(await readVerifiedTextFile(root, 'crlf.txt')).content).toBe(text);
  });

  it.each([
    ['lone 0xFF', [0x61, 0xff, 0x62]],
    ['invalid continuation', [0xc3, 0x28]],
    ['overlong slash', [0xc0, 0xaf]],
    ['encoded surrogate', [0xed, 0xa0, 0x80]],
    ['truncated sequence at EOF', [0x61, 0xe2, 0x82]],
    ['code point above U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
    ['UTF-16LE with BOM', [0xff, 0xfe, 0x68, 0x00, 0x69, 0x00]],
    ['Latin-1 text', [0x67, 0xfc, 0x6c]],
  ])('#49 invalid UTF-8 (%s) is UNSUPPORTED_ENCODING', async (_label, bytes) => {
    writeWs('bad.txt', Buffer.from(bytes));
    expectCode(await readVerifiedTextFile(root, 'bad.txt'), 'UNSUPPORTED_ENCODING');
  });

  it('#49 NUL bytes are UNSUPPORTED_ENCODING (binary), wherever they appear', async () => {
    const samples = [
      Buffer.from('abc\0def'),
      Buffer.from([0]),
      Buffer.concat([UTF8_BOM, Buffer.from([0])]),
      Buffer.from('trailing NUL\0'),
    ];
    for (const sample of samples) {
      writeWs('binary.dat', sample);
      expectCode(await readVerifiedTextFile(root, 'binary.dat'), 'UNSUPPORTED_ENCODING');
    }
  });

  it('#49 exactly maxBytes is accepted, maxBytes + 1 is FILE_TOO_LARGE', async () => {
    writeWs('exact.txt', 'a'.repeat(16));
    writeWs('over.txt', 'a'.repeat(17));
    const exact = expectOk(await readVerifiedTextFile(root, 'exact.txt', 16));
    expect(exact.content).toBe('a'.repeat(16));
    expect(exact.sizeBytes).toBe(16);
    expectCode(await readVerifiedTextFile(root, 'over.txt', 16), 'FILE_TOO_LARGE');
    writeWs('one.txt', 'a');
    expectCode(await readVerifiedTextFile(root, 'one.txt', 0), 'FILE_TOO_LARGE');
  });

  it('#49 the limit counts bytes, not characters', async () => {
    writeWs('eight.txt', 'ğ'.repeat(8)); // 16 bytes
    writeWs('nine.txt', 'ğ'.repeat(9)); // 18 bytes
    expect(expectOk(await readVerifiedTextFile(root, 'eight.txt', 16)).content).toBe('ğ'.repeat(8));
    expectCode(await readVerifiedTextFile(root, 'nine.txt', 16), 'FILE_TOO_LARGE');
  });

  it('#49 an oversized file is FILE_TOO_LARGE even when its bytes are not text', async () => {
    writeWs('big.bin', Buffer.alloc(17, 0xff));
    expectCode(await readVerifiedTextFile(root, 'big.bin', 16), 'FILE_TOO_LARGE');
  });

  it('#49 the default limit is MAX_DISPLAY_BYTES (1 MiB): exact passes, one more byte fails', async () => {
    expect(MAX_DISPLAY_BYTES).toBe(1024 * 1024);
    writeWs('limit.txt', 'x'.repeat(MAX_DISPLAY_BYTES));
    writeWs('limit-plus-one.txt', 'x'.repeat(MAX_DISPLAY_BYTES + 1));
    const exact = expectOk(await readVerifiedTextFile(root, 'limit.txt'));
    expect(exact.sizeBytes).toBe(MAX_DISPLAY_BYTES);
    expect(exact.content).toHaveLength(MAX_DISPLAY_BYTES);
    expectCode(await readVerifiedTextFile(root, 'limit-plus-one.txt'), 'FILE_TOO_LARGE');
  });

  it('#49 lexical and boundary failures are passed through unchanged', async () => {
    expectCode(await readVerifiedTextFile(root, '../outside/secret.txt'), 'TRAVERSAL');
    expectCode(
      await readVerifiedTextFile(root, path.join(fx.outside, 'secret.txt')),
      'ABSOLUTE_PATH',
    );
    expectCode(await readVerifiedTextFile(root, '%2e%2e/outside/secret.txt'), 'ENCODED_TRAVERSAL');
    expectCode(await readVerifiedTextFile(root, 'src/a.ts:secret'), 'INVALID_SEGMENT');
    expectCode(await readVerifiedTextFile(root, 42), 'INVALID_INPUT');
  });
});

// =============================================================================================
// Privacy
// =============================================================================================

/**
 * A genuinely relative path to an existing directory. On Windows a temp directory on another
 * drive than the working directory (e.g. GitHub runners: repo on D:, temp on C:) cannot be
 * expressed relatively, so `path.relative` returns an absolute path; fall back to the
 * repository's own `tests` directory, which is relative to the Vitest root.
 */
function relativeExistingDirectory(): string {
  const candidate = path.relative(process.cwd(), fx.ws);
  return path.isAbsolute(candidate) ? 'tests' : candidate;
}

describe('#49 policy errors never reveal local paths', () => {
  it('#49 failures across all APIs carry no temp-directory path in code or message', async (ctx: TestContext) => {
    linkDir(ctx, fx.outside, inWs('out'));
    hardLink(ctx, path.join(fx.outside, 'a.ts'), inWs('hard.ts'));
    fs.writeFileSync(inWs('bad.txt'), Buffer.from([0xff]));
    const firstRead = expectOk(await resolveWorkspacePath(root, 'src/a.ts', 'read'));
    replaceFileAtomically(inWs('src', 'a.ts'), 'changed');

    const failures: PolicyResult<unknown>[] = [
      await openWorkspaceRoot(path.join(fx.base, 'missing')),
      await openWorkspaceRoot(inWs('src', 'a.ts')),
      await openWorkspaceRoot(`${fx.ws}\0`),
      await openWorkspaceRoot(relativeExistingDirectory()),
      await resolveWorkspacePath(root, 'out/secret.txt', 'read'),
      await resolveWorkspacePath(root, 'out/secret.txt', 'write'),
      await resolveWorkspacePath(root, 'hard.ts', 'read'),
      await resolveWorkspacePath(root, 'src/missing.ts', 'read'),
      await resolveWorkspacePath(root, path.join(fx.outside, 'secret.txt'), 'read'),
      await resolveWorkspacePath(root, '../ws-evil/secret.txt', 'read'),
      await resolveWorkspacePath(root, 'src', 'read'),
      await revalidateResolvedPath(root, firstRead),
      await readVerifiedTextFile(root, 'out/secret.txt'),
      await readVerifiedTextFile(root, 'docs/readme.md', 1),
      await readVerifiedTextFile(root, 'bad.txt'),
    ];
    renameWithRetry(fx.ws, path.join(fx.base, 'ws-moved'));
    failures.push(
      await verifyWorkspaceRoot(root),
      await resolveWorkspacePath(root, 'src/a.ts', 'read'),
    );

    const fragments = sensitiveFragments();
    for (const failure of failures) {
      expect(failure.ok).toBe(false);
      if (failure.ok) {
        continue;
      }
      expect(failure.error.message.length).toBeGreaterThan(0);
      const text = `${failure.error.code} ${failure.error.message} ${JSON.stringify(failure)}`;
      for (const fragment of fragments) {
        expect(text).not.toContain(fragment);
      }
      expect(text).not.toMatch(/FIXTURE_[A-Z_]+_MARKER/);
    }
  });
});
