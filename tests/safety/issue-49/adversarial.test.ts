/**
 * #49 workspace boundary — ADVERSARIAL lens.
 *
 * Threat actor: a compromised renderer / prompt-injected model that controls the relative path
 * string, plus a malicious repository that controls the workspace contents (odd names, junctions,
 * symlinks, hardlinks). A concurrently racing local process is out of scope (README), but a few
 * races are simulated deterministically through `node:fs/promises` hooks to show which windows
 * the broker already closes and which it could cheaply close.
 *
 * Every fixture lives in a fresh `ws49-*` directory under os.tmpdir() and is removed after each
 * test; links are removed explicitly before the recursive delete. Directory links are junctions
 * on Windows and symlinks elsewhere; a link type this machine cannot create skips the test.
 * The `node:fs/promises` mock also blocks every UNC (network) path so no test can reach the
 * network. Tests whose name starts with `regression:` pin a defect found by this review and since fixed.
 */
import { execFileSync } from 'node:child_process';
import fs, { type PathLike } from 'node:fs';
import type * as FsPromises from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import fc from 'fast-check';
import { afterEach, describe, expect, it, vi, type TestContext } from 'vitest';

import { WorkspaceBroker } from '../../../src/main/ipc/workspace-broker';
import { isWithinRoot } from '../../../src/main/workspace/containment';
import type { PolicyResult, WorkspacePolicyCode } from '../../../src/main/workspace/policy-result';
import { parseWorkspaceRelativePath } from '../../../src/main/workspace/relative-path';
import {
  resolveWorkspacePath,
  revalidateResolvedPath,
  type AccessIntent,
  type ResolvedWorkspacePath,
} from '../../../src/main/workspace/resolve-path';
import {
  readVerifiedTextFile,
  type VerifiedTextFile,
} from '../../../src/main/workspace/verified-read';
import { openWorkspaceRoot, type WorkspaceRoot } from '../../../src/main/workspace/workspace-root';

// ---------------------------------------------------------------------------------------------
// fs/promises instrumentation (observation, fault injection and deterministic race simulation)
// ---------------------------------------------------------------------------------------------

interface FsHooks {
  beforeRealpath: ((target: string) => void) | null;
  mapRealpath: ((target: string, canonical: string) => string) | null;
  beforeLstat: ((target: string) => void) | null;
  beforeOpen: ((target: string) => void) | null;
  realpathCalls: string[];
  lstatCalls: string[];
  blockedNetworkPaths: string[];
}

const fsHooks = vi.hoisted((): FsHooks => ({
  beforeRealpath: null,
  mapRealpath: null,
  beforeLstat: null,
  beforeOpen: null,
  realpathCalls: [],
  lstatCalls: [],
  blockedNetworkPaths: [],
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  // UNC spellings in any separator mix (\\host, //host, /\host, \\?\UNC\host). Local device
  // forms such as \\?\C:\ and \\.\C:\ are allowed through: they never leave the machine.
  const networkPath = /^[\\/]{2}(?:[^\\/?.]|[?.][\\/]unc[\\/])/i;
  const asText = (value: PathLike): string =>
    typeof value === 'string' ? value : value.toString();
  const guard = (target: string): void => {
    if (networkPath.test(target)) {
      fsHooks.blockedNetworkPaths.push(target);
      throw Object.assign(new Error('ENOENT: network path blocked by the #49 test harness'), {
        code: 'ENOENT',
      });
    }
  };
  async function realpath(...args: Parameters<typeof actual.realpath>): Promise<string> {
    const target = asText(args[0]);
    fsHooks.realpathCalls.push(target);
    guard(target);
    fsHooks.beforeRealpath?.(target);
    const canonical = await actual.realpath(args[0]);
    return fsHooks.mapRealpath === null ? canonical : fsHooks.mapRealpath(target, canonical);
  }
  async function lstat(...args: Parameters<typeof actual.lstat>) {
    const target = asText(args[0]);
    fsHooks.lstatCalls.push(target);
    guard(target);
    fsHooks.beforeLstat?.(target);
    return await actual.lstat(...args);
  }
  async function open(...args: Parameters<typeof actual.open>) {
    const target = asText(args[0]);
    guard(target);
    fsHooks.beforeOpen?.(target);
    return await actual.open(...args);
  }
  const patched = { ...actual, realpath, lstat, open };
  return { ...patched, default: patched };
});

// ---------------------------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------------------------

const IS_WINDOWS = process.platform === 'win32';
const DIR_LINK_TYPE = IS_WINDOWS ? 'junction' : 'dir';
const INTENTS: readonly AccessIntent[] = ['read', 'list', 'write'];
/** Fake marker placed OUTSIDE the workspace. If any read returns it, the boundary leaked. */
const SECRET = 'FIXTURE_OUTSIDE_MARKER_49_ADVERSARIAL';
const INSIDE = 'fixture inside marker\n';

interface Fixture {
  /** Canonical (`realpath`) spelling of the mkdtemp directory. */
  readonly base: string;
  /** Workspace root: base/ws (contains readme.txt and sub/secret.txt with INSIDE). */
  readonly ws: string;
  /** Unrelated directory outside the workspace: base/outside/secret.txt = SECRET. */
  readonly outside: string;
  /** Sibling-prefix directory: base/ws-evil/secret.txt = SECRET. */
  readonly sibling: string;
  readonly root: WorkspaceRoot;
}

let tempDirs: string[] = [];
let createdLinks: string[] = [];

afterEach(() => {
  fsHooks.beforeRealpath = null;
  fsHooks.mapRealpath = null;
  fsHooks.beforeLstat = null;
  fsHooks.beforeOpen = null;
  fsHooks.realpathCalls.length = 0;
  fsHooks.lstatCalls.length = 0;
  fsHooks.blockedNetworkPaths.length = 0;
  // Links first (deepest/latest first) so the recursive delete can never walk through one.
  const links = createdLinks.reverse();
  createdLinks = [];
  for (const link of links) {
    removeLink(link);
  }
  const dirs = tempDirs;
  tempDirs = [];
  for (const dir of dirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function removeLink(link: string): void {
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(link);
  } catch {
    return;
  }
  if (IS_WINDOWS && (stats.isDirectory() || stats.isSymbolicLink())) {
    // RemoveDirectoryW deletes a junction/mount point itself, never the target's contents.
    try {
      fs.rmdirSync(link);
      return;
    } catch {
      // fall through to unlink
    }
  }
  fs.unlinkSync(link);
}

function newTempDir(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws49-'));
  tempDirs.push(tmp);
  return fs.realpathSync.native(tmp);
}

async function openRoot(dir: string): Promise<WorkspaceRoot> {
  const opened = await openWorkspaceRoot(dir);
  if (!opened.ok) {
    throw new Error(`fixture root rejected: ${opened.error.code}`);
  }
  return opened.value;
}

async function makeFixture(): Promise<Fixture> {
  const base = newTempDir();
  const ws = path.join(base, 'ws');
  const outside = path.join(base, 'outside');
  const sibling = path.join(base, 'ws-evil');
  fs.mkdirSync(path.join(ws, 'sub'), { recursive: true });
  fs.mkdirSync(outside);
  fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(ws, 'readme.txt'), INSIDE);
  fs.writeFileSync(path.join(ws, 'sub', 'secret.txt'), INSIDE);
  fs.writeFileSync(path.join(outside, 'secret.txt'), SECRET);
  fs.writeFileSync(path.join(sibling, 'secret.txt'), SECRET);
  const root = await openRoot(ws);
  fsHooks.realpathCalls.length = 0;
  fsHooks.lstatCalls.length = 0;
  return { base, ws, outside, sibling, root };
}

function errnoCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
}

function isLinkCapabilityError(error: unknown): boolean {
  const code = errnoCode(error);
  return code === 'EPERM' || code === 'EACCES' || code === 'ENOSYS' || code === 'ENOTSUP';
}

function tryLinkDir(target: string, link: string): boolean {
  try {
    fs.symlinkSync(target, link, DIR_LINK_TYPE);
  } catch (error) {
    if (isLinkCapabilityError(error)) {
      return false;
    }
    throw error;
  }
  createdLinks.push(link);
  return true;
}

function linkDirOrSkip(ctx: TestContext, target: string, link: string): void {
  if (!tryLinkDir(target, link)) {
    ctx.skip(`cannot create a ${DIR_LINK_TYPE} link on this machine`);
  }
}

function linkFileOrSkip(ctx: TestContext, target: string, link: string): void {
  try {
    fs.symlinkSync(target, link, 'file');
  } catch (error) {
    if (isLinkCapabilityError(error)) {
      ctx.skip('file symbolic links need Developer Mode / SeCreateSymbolicLinkPrivilege here');
    }
    throw error;
  }
  createdLinks.push(link);
}

let dirLinkSupport: boolean | undefined;
function requireDirLinks(ctx: TestContext): void {
  if (dirLinkSupport === undefined) {
    const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'ws49-'));
    try {
      fs.mkdirSync(path.join(probe, 't'));
      fs.symlinkSync(path.join(probe, 't'), path.join(probe, 'l'), DIR_LINK_TYPE);
      fs.unlinkSync(path.join(probe, 'l'));
      dirLinkSupport = true;
    } catch {
      dirLinkSupport = false;
    } finally {
      fs.rmSync(probe, { recursive: true, force: true });
    }
  }
  if (!dirLinkSupport) {
    ctx.skip(`cannot create a ${DIR_LINK_TYPE} link on this machine`);
  }
}

/** Simulates "a component was replaced by a link" (tooling or an out-of-scope racer). */
function swapDirForLink(dir: string, target: string): void {
  fs.renameSync(dir, `${dir}-orig`);
  if (!tryLinkDir(target, dir)) {
    throw new Error('link creation failed during swap');
  }
}

/** Raw `mklink /J` so the junction target can use spellings Node's own junction API refuses. */
function mklinkJunctionOrSkip(ctx: TestContext, link: string, rawTarget: string): void {
  try {
    execFileSync('cmd.exe', ['/d', '/c', 'mklink', '/J', link, rawTarget], { stdio: 'pipe' });
  } catch {
    ctx.skip('mklink /J with a raw NT target is unavailable on this machine');
  }
  createdLinks.push(link);
}

function volumeGuidRootOrSkip(ctx: TestContext, anyPath: string): string {
  const drive = path.parse(anyPath).root.slice(0, 2);
  try {
    const out = execFileSync('mountvol', [drive, '/L'], { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (/^\\\\\?\\Volume\{[0-9a-f-]+\}\\$/i.test(out)) {
      return out;
    }
  } catch {
    // fall through
  }
  return ctx.skip('volume GUID path unavailable (mountvol)');
}

/** True when `shortName` is an 8.3 alias of `longName` (same file identity). */
function hasShortAlias(parent: string, longName: string, shortName: string): boolean {
  try {
    const long = fs.lstatSync(path.join(parent, longName), { bigint: true });
    const short = fs.lstatSync(path.join(parent, shortName), { bigint: true });
    return long.ino === short.ino && long.dev === short.dev;
  } catch {
    return false;
  }
}

function outcomeOf(result: PolicyResult<unknown>): string {
  return result.ok ? 'OK' : result.error.code;
}

function readOutcome(result: PolicyResult<VerifiedTextFile>): string {
  return result.ok ? `OK:${result.value.content}` : result.error.code;
}

function fsError(code: string): Error {
  return Object.assign(new Error(`${code}: injected by #49 adversarial test`), { code });
}

function toRequest(...segments: string[]): string {
  return segments.join('/');
}

/** Asserts a resolution is inside the canonical workspace and never yields the outside marker. */
function assertInside(fx: Fixture, result: PolicyResult<ResolvedWorkspacePath>): void {
  if (result.ok) {
    expect(isWithinRoot(fx.ws, result.value.canonicalPath)).toBe(true);
  }
}

// ---------------------------------------------------------------------------------------------
// 1. Lexical attacks from an untrusted renderer / model
// ---------------------------------------------------------------------------------------------

type Attack = readonly [label: string, input: unknown, code: WorkspacePolicyCode];

const LEXICAL_ATTACKS: readonly Attack[] = [
  // Absolute, rooted, UNC, device and drive forms (rule 2).
  ['POSIX absolute', '/etc/passwd', 'ABSOLUTE_PATH'],
  ['rooted backslash', '\\Windows\\win.ini', 'ABSOLUTE_PATH'],
  ['UNC share', '\\\\attacker.invalid\\share\\x', 'ABSOLUTE_PATH'],
  ['forward-slash UNC', '//attacker.invalid/share/x', 'ABSOLUTE_PATH'],
  ['mixed-separator UNC /\\', '/\\attacker.invalid\\share', 'ABSOLUTE_PATH'],
  ['mixed-separator device \\/./', '\\/./C:/Windows/win.ini', 'ABSOLUTE_PATH'],
  ['Win32 file namespace \\\\?\\', '\\\\?\\C:\\Windows\\win.ini', 'ABSOLUTE_PATH'],
  ['Win32 device namespace \\\\.\\', '\\\\.\\PhysicalDrive0', 'ABSOLUTE_PATH'],
  ['forward-slash device namespace', '//?/C:/Windows/win.ini', 'ABSOLUTE_PATH'],
  ['NT object manager path', '\\??\\C:\\Windows\\win.ini', 'ABSOLUTE_PATH'],
  ['GLOBALROOT device path', '\\\\?\\GLOBALROOT\\Device\\HarddiskVolume1\\x', 'ABSOLUTE_PATH'],
  ['named pipe', '\\\\.\\pipe\\ws49', 'ABSOLUTE_PATH'],
  ['drive absolute', 'C:\\Windows\\win.ini', 'ABSOLUTE_PATH'],
  ['drive absolute forward slash', 'c:/Windows/win.ini', 'ABSOLUTE_PATH'],
  ['drive relative', 'C:secret.txt', 'ABSOLUTE_PATH'],
  ['bare drive', 'Z:', 'ABSOLUTE_PATH'],
  ['drive dot', 'C:.', 'ABSOLUTE_PATH'],
  // Drive / device / namespace forms after the first segment (rule 5, ':' and '?').
  ['drive-relative after first segment', 'a/C:x', 'INVALID_SEGMENT'],
  ['dot segment then drive', './C:/Windows/win.ini', 'INVALID_SEGMENT'],
  ['\\\\?\\ embedded mid-path', 'a\\\\?\\C:\\Windows\\win.ini', 'INVALID_SEGMENT'],
  ['\\\\.\\ embedded mid-path', 'sub/\\\\.\\C:/x', 'INVALID_SEGMENT'],
  ['GLOBALROOT embedded mid-path', 'sub/\\\\?\\GLOBALROOT/x', 'INVALID_SEGMENT'],
  ['digit drive designator', '1:x', 'INVALID_SEGMENT'],
  ['non-ASCII drive designator', 'ä:x', 'INVALID_SEGMENT'],
  // NTFS alternate data streams and Win32 wildcards.
  ['ADS ::$DATA', 'sub/secret.txt::$DATA', 'INVALID_SEGMENT'],
  ['named ADS', 'readme.txt:hidden', 'INVALID_SEGMENT'],
  ['directory index ADS', 'sub::$INDEX_ALLOCATION/secret.txt', 'INVALID_SEGMENT'],
  ['Zone.Identifier stream', 'readme.txt:Zone.Identifier:$DATA', 'INVALID_SEGMENT'],
  ['wildcard *', 'sub/*.txt', 'INVALID_SEGMENT'],
  ['wildcard ?', 'sub/secre?.txt', 'INVALID_SEGMENT'],
  ['DOS wildcard <', 'sub/<', 'INVALID_SEGMENT'],
  ['DOS wildcard >', 'sub/secret>txt', 'INVALID_SEGMENT'],
  ['DOS wildcard "', 'sub/"secret.txt', 'INVALID_SEGMENT'],
  ['pipe character', 'sub/a|b', 'INVALID_SEGMENT'],
  // Names Win32 silently rewrites.
  ['trailing dot', 'readme.txt.', 'INVALID_SEGMENT'],
  ['trailing space', 'readme.txt ', 'INVALID_SEGMENT'],
  ['trailing dot-space mix', 'sub. ./secret.txt', 'INVALID_SEGMENT'],
  ['three dots', '...', 'INVALID_SEGMENT'],
  ['dot-dot-space', '.. /outside/secret.txt', 'INVALID_SEGMENT'],
  ['space-dot-dot', ' ../outside/secret.txt', 'INVALID_SEGMENT'],
  ['four dots', '..../outside', 'INVALID_SEGMENT'],
  // DOS device names.
  ['CON', 'CON', 'INVALID_SEGMENT'],
  ['con.txt', 'con.txt', 'INVALID_SEGMENT'],
  ['Nul.tar.gz in a subdirectory', 'sub/Nul.tar.gz', 'INVALID_SEGMENT'],
  ['aux', 'aux', 'INVALID_SEGMENT'],
  ['PRN.', 'PRN.', 'INVALID_SEGMENT'],
  ['COM1', 'COM1', 'INVALID_SEGMENT'],
  ['com0.log', 'com0.log', 'INVALID_SEGMENT'],
  ['COM superscript one', 'COM\u00b9', 'INVALID_SEGMENT'],
  ['lpt superscript three .txt', 'lpt\u00b3.txt', 'INVALID_SEGMENT'],
  ['LPT0', 'LPT0', 'INVALID_SEGMENT'],
  ['CONIN$', 'CONIN$', 'INVALID_SEGMENT'],
  ['conout$.txt', 'conout$.txt', 'INVALID_SEGMENT'],
  ['device as directory mid-path', 'sub/NUL/x', 'INVALID_SEGMENT'],
  ['device with trailing space', 'NUL ', 'INVALID_SEGMENT'],
  ['segment longer than 255 units', 'a'.repeat(256), 'INVALID_SEGMENT'],
  [
    'segment of 128 astral characters (256 UTF-16 units)',
    '\u{1F600}'.repeat(128),
    'INVALID_SEGMENT',
  ],
  // Traversal (rule 4).
  ['dot-dot', '..', 'TRAVERSAL'],
  ['dot-dot slash', '../outside/secret.txt', 'TRAVERSAL'],
  ['dot-dot backslash', '..\\outside\\secret.txt', 'TRAVERSAL'],
  ['nested escape', 'sub/../../outside/secret.txt', 'TRAVERSAL'],
  ['sibling prefix escape', 'sub\\..\\..\\ws-evil\\secret.txt', 'TRAVERSAL'],
  ['dot then dot-dot', './..', 'TRAVERSAL'],
  ['collapsed separators', '..//..', 'TRAVERSAL'],
  ['in-root dot-dot (still refused)', 'sub/../readme.txt', 'TRAVERSAL'],
  // Percent encoding (rule 3).
  ['encoded dots', '%2e%2e/outside/secret.txt', 'ENCODED_TRAVERSAL'],
  ['encoded dots upper case', '%2E%2E%2Foutside', 'ENCODED_TRAVERSAL'],
  ['encoded slash', '..%2f..%2foutside', 'ENCODED_TRAVERSAL'],
  ['encoded backslash', '..%5c..%5coutside', 'ENCODED_TRAVERSAL'],
  ['double encoding', '%252e%252e/outside', 'ENCODED_TRAVERSAL'],
  ['half encoded', '.%2e/outside', 'ENCODED_TRAVERSAL'],
  ['encoded colon', 'C%3a/Windows', 'ENCODED_TRAVERSAL'],
  ['encoded NUL', 'readme.txt%00.png', 'ENCODED_TRAVERSAL'],
  // Malformed input (rule 1).
  ['empty string', '', 'INVALID_INPUT'],
  ['embedded NUL', 'readme.txt\u0000.png', 'INVALID_INPUT'],
  ['newline', 'sub\n/secret.txt', 'INVALID_INPUT'],
  ['tab only', '\t', 'INVALID_INPUT'],
  ['DEL', 'a\u007f', 'INVALID_INPUT'],
  ['ANSI escape', '\u001b[2J', 'INVALID_INPUT'],
  ['4097 characters', `${'a/'.repeat(2048)}a`, 'INVALID_INPUT'],
  ['undefined', undefined, 'INVALID_INPUT'],
  ['null', null, 'INVALID_INPUT'],
  ['number', 49, 'INVALID_INPUT'],
  ['bigint', 49n, 'INVALID_INPUT'],
  ['String object', new String('readme.txt'), 'INVALID_INPUT'],
  ['array', ['readme.txt'], 'INVALID_INPUT'],
  ['Buffer', Buffer.from('readme.txt'), 'INVALID_INPUT'],
  ['file URL', new URL('file:///etc/passwd'), 'INVALID_INPUT'],
  ['object with toString', { toString: () => 'readme.txt' }, 'INVALID_INPUT'],
  ['symbol', Symbol('readme.txt'), 'INVALID_INPUT'],
  ['function', () => 'readme.txt', 'INVALID_INPUT'],
];

describe('#49 adversarial: lexical attacks from an untrusted renderer or model', () => {
  it.each(LEXICAL_ATTACKS)(
    '#49 %s is refused identically by parse, resolve (all intents) and read, before any filesystem access',
    async (_label, input, code) => {
      const fx = await makeFixture();
      expect(outcomeOf(parseWorkspaceRelativePath(input))).toBe(code);
      for (const intent of INTENTS) {
        expect(outcomeOf(await resolveWorkspacePath(fx.root, input, intent))).toBe(code);
      }
      expect(readOutcome(await readVerifiedTextFile(fx.root, input))).toBe(code);
      expect(fsHooks.realpathCalls).toEqual([]);
      expect(fsHooks.lstatCalls).toEqual([]);
    },
  );

  // Win32 (RtlIsDosDeviceName_U) strips the extension at the first '.', then trailing spaces,
  // so "NUL .txt" is the NUL device on Windows 10 (verified on this machine with cmd.exe: no
  // file is created). README rule 5: device names "with or without extension, ignoring
  // trailing spaces" -> INVALID_SEGMENT.
  it.each([
    ['NUL .txt'],
    ['nul  .log'],
    ['AUX .x.y'],
    ['COM1 .txt'],
    ['CON .txt'],
    ['sub/LPT1 .md'],
  ])(
    'regression: #49 DOS device name with spaces before the extension (%s) is rejected',
    (input) => {
      expect(outcomeOf(parseWorkspaceRelativePath(input))).toBe('INVALID_SEGMENT');
    },
  );

  it.each([
    ['fullwidth full stops', '\uff0e\uff0e/\uff0e\uff0e/outside/secret.txt'],
    ['fullwidth solidus', '..\uff0f..\uff0foutside\uff0fsecret.txt'],
    ['fullwidth reverse solidus', '..\uff3c..\uff3coutside\uff3csecret.txt'],
    ['two-dot leader', '\u2025/outside/secret.txt'],
    ['zero-width space after dots', '..\u200b/..\u200b/outside/secret.txt'],
    ['no-break space after dots', '..\u00a0/outside/secret.txt'],
    ['overlong UTF-8 dots', '%c0%ae%c0%ae/%c0%ae%c0%ae/outside/secret.txt'],
    ['IIS %u encoding', '%u002e%u002e/outside/secret.txt'],
    ['tilde home', '~/secret.txt'],
    ['environment variable', '%USERPROFILE%/secret.txt'],
    ['shell variable', '$HOME/secret.txt'],
    ['right-to-left override', '\u202etxt.terces'],
    ['fullwidth CON', '\uff23\uff2f\uff2e'],
  ])(
    '#49 look-alike traversal %s is a literal (missing) name and never reaches outside data',
    async (_label, input) => {
      const fx = await makeFixture();
      for (const intent of INTENTS) {
        const result = await resolveWorkspacePath(fx.root, input, intent);
        expect(outcomeOf(result)).toBeOneOf(['NOT_FOUND', 'INVALID_SEGMENT']);
      }
      const read = await readVerifiedTextFile(fx.root, input);
      expect(readOutcome(read)).not.toContain(SECRET);
      expect(read.ok).toBe(false);
    },
  );

  it('#49 every lexically accepted adversarial string stays inside the root under Win32 and POSIX joining', () => {
    const tokens = [
      '..',
      '.',
      '/',
      '\\',
      'a',
      'C:',
      ':',
      '?',
      '*',
      '%2e',
      '%2f',
      '%5c',
      '%25',
      '%',
      ' ',
      '~1',
      'CON',
      'nul',
      '\u0000',
      '\uff0e',
      '\uff0f',
      '\u2025',
      '//?/',
      '\\\\.\\',
      'UNC',
      '$DATA',
      '\t',
      'e\u0301',
      '\ud800',
      '.txt',
      'x',
    ];
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...tokens), { maxLength: 12 }).map((parts) => parts.join('')),
        (input) => {
          const parsed = parseWorkspaceRelativePath(input);
          if (!parsed.ok) {
            return true;
          }
          const insideWin = (p: string): boolean => p === 'C:\\ws' || p.startsWith('C:\\ws\\');
          const insidePosix = (p: string): boolean => p === '/ws' || p.startsWith('/ws/');
          return (
            insideWin(path.win32.resolve('C:\\ws', input)) &&
            insideWin(path.win32.resolve('C:\\ws', parsed.value.posixPath)) &&
            insidePosix(path.posix.resolve('/ws', parsed.value.posixPath)) &&
            parsed.value.segments.every(
              (segment) => segment !== '.' && segment !== '..' && !/[\\/:]/.test(segment),
            )
          );
        },
      ),
      { numRuns: 3000 },
    );
  });

  it('#49 parseWorkspaceRelativePath never throws for arbitrary values or binary strings', () => {
    fc.assert(
      fc.property(fc.oneof(fc.anything(), fc.string({ unit: 'binary', maxLength: 300 })), (v) => {
        const result = parseWorkspaceRelativePath(v);
        return typeof result.ok === 'boolean';
      }),
      { numRuns: 2000 },
    );
  });
});

// ---------------------------------------------------------------------------------------------
// 2. Aliases of in-root names (case, 8.3, Unicode, lone surrogates)
// ---------------------------------------------------------------------------------------------

describe('#49 adversarial: aliases of in-root names fail closed', () => {
  it('#49 a case-only alias is NON_CANONICAL_PATH (Windows) or NOT_FOUND (case-sensitive FS)', async () => {
    const fx = await makeFixture();
    for (const intent of ['read', 'write'] as const) {
      const result = await resolveWorkspacePath(fx.root, 'SUB/SECRET.TXT', intent);
      expect(outcomeOf(result)).toBe(IS_WINDOWS ? 'NON_CANONICAL_PATH' : 'NOT_FOUND');
    }
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'SUB', 'list'))).toBe(
      IS_WINDOWS ? 'NON_CANONICAL_PATH' : 'NOT_FOUND',
    );
  });

  it.runIf(IS_WINDOWS)(
    '#49 an 8.3 short-name alias (LONGDI~1) is NON_CANONICAL_PATH for read, write and list',
    async (ctx) => {
      const fx = await makeFixture();
      fs.mkdirSync(path.join(fx.ws, 'longdirectoryname'));
      fs.writeFileSync(path.join(fx.ws, 'longdirectoryname', 'inner.txt'), INSIDE);
      if (!hasShortAlias(fx.ws, 'longdirectoryname', 'LONGDI~1')) {
        ctx.skip('8.3 short names are disabled on this volume');
      }
      expect(outcomeOf(await resolveWorkspacePath(fx.root, 'LONGDI~1/inner.txt', 'read'))).toBe(
        'NON_CANONICAL_PATH',
      );
      expect(outcomeOf(await resolveWorkspacePath(fx.root, 'LONGDI~1/inner.txt', 'write'))).toBe(
        'NON_CANONICAL_PATH',
      );
      expect(outcomeOf(await resolveWorkspacePath(fx.root, 'LONGDI~1', 'list'))).toBe(
        'NON_CANONICAL_PATH',
      );
      expect(readOutcome(await readVerifiedTextFile(fx.root, 'LONGDI~1/inner.txt'))).toBe(
        'NON_CANONICAL_PATH',
      );
    },
  );

  it('#49 an NFD request for an NFC-named file is not silently mapped to it', async () => {
    const fx = await makeFixture();
    fs.writeFileSync(path.join(fx.ws, 'caf\u00e9.txt'), INSIDE);
    const result = await resolveWorkspacePath(fx.root, 'cafe\u0301.txt', 'read');
    expect(outcomeOf(result)).toBeOneOf(['NOT_FOUND', 'NON_CANONICAL_PATH']);
  });

  it('#49 a lone surrogate (encoded by Node as U+FFFD) does not alias the U+FFFD file', async () => {
    const fx = await makeFixture();
    fs.writeFileSync(path.join(fx.ws, '\ufffd.txt'), INSIDE);
    for (const intent of ['read', 'write'] as const) {
      const result = await resolveWorkspacePath(fx.root, '\ud800.txt', intent);
      expect(outcomeOf(result)).toBeOneOf(['NON_CANONICAL_PATH', 'NOT_FOUND']);
    }
  });

  it('#49 Unicode case-folding look-alikes (long s, Kelvin sign) do not alias ASCII names', async () => {
    const fx = await makeFixture();
    fs.writeFileSync(path.join(fx.ws, 'k.txt'), INSIDE);
    for (const input of ['\u017fub/secret.txt', '\u212a.txt']) {
      const result = await resolveWorkspacePath(fx.root, input, 'read');
      expect(outcomeOf(result)).toBeOneOf(['NOT_FOUND', 'NON_CANONICAL_PATH']);
    }
  });

  it('#49 after following an in-root link, aliases resolve only to canonical in-root names', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, path.join(fx.ws, 'sub'), path.join(fx.ws, 'lnk'));
    // Step 5 (NON_CANONICAL_PATH) is skipped once a link was followed; the result must still be
    // the canonical in-root path so later layers (protected-file rules) see the real name.
    const result = await resolveWorkspacePath(fx.root, 'lnk/SECRET.TXT', 'read');
    assertInside(fx, result);
    if (result.ok) {
      expect(result.value.relativePath).toBe('sub/secret.txt');
      expect(result.value.followedLink).toBe(true);
    } else {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});

// ---------------------------------------------------------------------------------------------
// 3. Malicious workspace contents: junctions, symlinks, reparse points, special files
// ---------------------------------------------------------------------------------------------

describe('#49 adversarial: links planted in the workspace', () => {
  it('#49 a directory link to an outside folder is LINK_ESCAPE (read/list) and LINK_NOT_ALLOWED (write)', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, fx.outside, path.join(fx.ws, 'evil'));
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'evil/secret.txt', 'read'))).toBe(
      'LINK_ESCAPE',
    );
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'evil', 'list'))).toBe('LINK_ESCAPE');
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'evil/secret.txt', 'write'))).toBe(
      'LINK_NOT_ALLOWED',
    );
    expect(readOutcome(await readVerifiedTextFile(fx.root, 'evil/secret.txt'))).toBe('LINK_ESCAPE');
  });

  it('#49 a link to a sibling-prefix folder (ws -> ws-evil) is LINK_ESCAPE', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, fx.sibling, path.join(fx.ws, 'x'));
    expect(readOutcome(await readVerifiedTextFile(fx.root, 'x/secret.txt'))).toBe('LINK_ESCAPE');
  });

  it('#49 a link to the workspace parent is LINK_ESCAPE even when the final target is back inside', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, fx.base, path.join(fx.ws, 'up'));
    expect(readOutcome(await readVerifiedTextFile(fx.root, 'up/outside/secret.txt'))).toBe(
      'LINK_ESCAPE',
    );
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'up/ws/readme.txt', 'read'))).toBe(
      'LINK_ESCAPE',
    );
  });

  it('#49 a link to the filesystem / drive root is LINK_ESCAPE', async (ctx) => {
    const fx = await makeFixture();
    const fsRoot = path.parse(fx.base).root;
    linkDirOrSkip(ctx, fsRoot, path.join(fx.ws, 'droot'));
    const viaRoot = toRequest(
      'droot',
      ...path.relative(fsRoot, fx.outside).split(path.sep),
      'secret.txt',
    );
    expect(readOutcome(await readVerifiedTextFile(fx.root, viaRoot))).toBe('LINK_ESCAPE');
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'droot', 'list'))).toBe('LINK_ESCAPE');
  });

  it('#49 a chain of in-root links ending outside is LINK_ESCAPE', async (ctx) => {
    const fx = await makeFixture();
    fs.mkdirSync(path.join(fx.ws, 'b'));
    linkDirOrSkip(ctx, path.join(fx.ws, 'b'), path.join(fx.ws, 'a'));
    linkDirOrSkip(ctx, fx.outside, path.join(fx.ws, 'b', 'c'));
    expect(readOutcome(await readVerifiedTextFile(fx.root, 'a/c/secret.txt'))).toBe('LINK_ESCAPE');
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'a/c', 'list'))).toBe('LINK_ESCAPE');
  });

  it.runIf(IS_WINDOWS)(
    '#49 case-only spelling of an escaping junction is still LINK_ESCAPE',
    async (ctx) => {
      const fx = await makeFixture();
      linkDirOrSkip(ctx, fx.outside, path.join(fx.ws, 'Evil'));
      expect(readOutcome(await readVerifiedTextFile(fx.root, 'EVIL/secret.txt'))).toBe(
        'LINK_ESCAPE',
      );
    },
  );

  it.runIf(IS_WINDOWS)(
    '#49 an 8.3 short-name spelling of an escaping junction is still LINK_ESCAPE',
    async (ctx) => {
      const fx = await makeFixture();
      linkDirOrSkip(ctx, fx.outside, path.join(fx.ws, 'longjunctionname'));
      if (!hasShortAlias(fx.ws, 'longjunctionname', 'LONGJU~1')) {
        ctx.skip('8.3 short names are disabled on this volume');
      }
      expect(readOutcome(await readVerifiedTextFile(fx.root, 'LONGJU~1/secret.txt'))).toBe(
        'LINK_ESCAPE',
      );
    },
  );

  it('#49 a dangling link is NOT_FOUND for read and LINK_NOT_ALLOWED for write', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, path.join(fx.base, 'does-not-exist'), path.join(fx.ws, 'dang'));
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'dang/x.txt', 'read'))).toBe('NOT_FOUND');
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'dang/x.txt', 'write'))).toBe(
      'LINK_NOT_ALLOWED',
    );
  });

  it('#49 a link loop fails closed with LINK_ESCAPE (ELOOP), never throws', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, path.join(fx.ws, 'j2'), path.join(fx.ws, 'j1'));
    linkDirOrSkip(ctx, path.join(fx.ws, 'j1'), path.join(fx.ws, 'j2'));
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'j1/x.txt', 'read'))).toBe('LINK_ESCAPE');
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'j1', 'list'))).toBe('LINK_ESCAPE');
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'j1/x.txt', 'write'))).toBe(
      'LINK_NOT_ALLOWED',
    );
  });

  it('#49 a self-referencing link repeated 200 times fails closed or stays inside, without hanging', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, fx.ws, path.join(fx.ws, 'self'));
    const input = `${'self/'.repeat(200)}readme.txt`;
    const started = Date.now();
    const result = await resolveWorkspacePath(fx.root, input, 'read');
    expect(Date.now() - started).toBeLessThan(10_000);
    assertInside(fx, result);
    expect(outcomeOf(result)).toBeOneOf(['OK', 'LINK_ESCAPE', 'IO_ERROR']);
  });

  it('#49 a junction or link nested beyond MAX_PATH is still LINK_ESCAPE', async (ctx) => {
    const fx = await makeFixture();
    const segments = Array.from(
      { length: 24 },
      (_, i) => `deep_segment_${String(i).padStart(2, '0')}`,
    );
    const deepDir = path.join(fx.ws, ...segments);
    fs.mkdirSync(deepDir, { recursive: true });
    linkDirOrSkip(ctx, fx.outside, path.join(deepDir, 'escape'));
    const input = toRequest(...segments, 'escape', 'secret.txt');
    expect(path.join(fx.ws, input).length).toBeGreaterThan(260);
    expect(readOutcome(await readVerifiedTextFile(fx.root, input))).toBe('LINK_ESCAPE');
  });

  it('#49 a regular file nested beyond MAX_PATH is read canonically (no MAX_PATH confusion)', async () => {
    const fx = await makeFixture();
    const segments = Array.from(
      { length: 24 },
      (_, i) => `deep_segment_${String(i).padStart(2, '0')}`,
    );
    fs.mkdirSync(path.join(fx.ws, ...segments), { recursive: true });
    fs.writeFileSync(path.join(fx.ws, ...segments, 'leaf.txt'), INSIDE);
    const input = toRequest(...segments, 'leaf.txt');
    expect(path.join(fx.ws, input).length).toBeGreaterThan(260);
    const read = await readVerifiedTextFile(fx.root, input);
    expect(readOutcome(read)).toBe(`OK:${INSIDE}`);
  });

  // Junction targets that libuv does not report as links (not "\??\X:\"): lstat says "directory",
  // so only the canonical-path checks (README steps 4-5) stand between them and outside data.
  describe.runIf(IS_WINDOWS)('#49 opaque reparse points (Windows, raw mklink /J)', () => {
    it('#49 a volume-GUID junction to an outside folder is refused for every intent and read', async (ctx) => {
      const fx = await makeFixture();
      const volume = volumeGuidRootOrSkip(ctx, fx.outside);
      const target = volume + fx.outside.slice(path.parse(fx.outside).root.length);
      mklinkJunctionOrSkip(ctx, path.join(fx.ws, 'vout'), target);
      expect(fs.lstatSync(path.join(fx.ws, 'vout')).isSymbolicLink()).toBe(false);
      for (const intent of ['read', 'write'] as const) {
        const result = await resolveWorkspacePath(fx.root, 'vout/secret.txt', intent);
        expect(outcomeOf(result)).toBeOneOf([
          'OUTSIDE_WORKSPACE',
          'LINK_ESCAPE',
          'LINK_NOT_ALLOWED',
        ]);
      }
      expect(outcomeOf(await resolveWorkspacePath(fx.root, 'vout', 'list'))).toBeOneOf([
        'OUTSIDE_WORKSPACE',
        'LINK_ESCAPE',
      ]);
      const read = await readVerifiedTextFile(fx.root, 'vout/secret.txt');
      expect(readOutcome(read)).not.toContain(SECRET);
      expect(read.ok).toBe(false);
    });

    it('#49 a \\\\?\\GLOBALROOT junction to an outside folder is refused', async (ctx) => {
      const fx = await makeFixture();
      mklinkJunctionOrSkip(ctx, path.join(fx.ws, 'gout'), `\\\\?\\GLOBALROOT\\??\\${fx.outside}`);
      const read = await readVerifiedTextFile(fx.root, 'gout/secret.txt');
      expect(readOutcome(read)).toBeOneOf(['OUTSIDE_WORKSPACE', 'LINK_ESCAPE', 'IO_ERROR']);
      const write = await resolveWorkspacePath(fx.root, 'gout/secret.txt', 'write');
      expect(outcomeOf(write)).toBeOneOf(['OUTSIDE_WORKSPACE', 'LINK_ESCAPE', 'LINK_NOT_ALLOWED']);
    });

    it('#49 a volume-GUID junction to an in-root folder is NON_CANONICAL_PATH (unknown reparse point)', async (ctx) => {
      const fx = await makeFixture();
      const volume = volumeGuidRootOrSkip(ctx, fx.ws);
      const inRoot = path.join(fx.ws, 'sub');
      mklinkJunctionOrSkip(ctx, path.join(fx.ws, 'vin'), volume + inRoot.slice(3));
      for (const intent of ['read', 'write'] as const) {
        expect(outcomeOf(await resolveWorkspacePath(fx.root, 'vin/secret.txt', intent))).toBe(
          'NON_CANONICAL_PATH',
        );
      }
      expect(outcomeOf(await resolveWorkspacePath(fx.root, 'vin', 'list'))).toBe(
        'NON_CANONICAL_PATH',
      );
    });
  });

  describe.runIf(!IS_WINDOWS)('#49 POSIX-only link and special-file attacks', () => {
    it('#49 file symlinks (absolute, relative, /etc/passwd, /dev/zero, /proc/self/root) are refused', async (ctx) => {
      const fx = await makeFixture();
      const cases: readonly (readonly [string, string])[] = [
        ['abs.txt', path.join(fx.outside, 'secret.txt')],
        ['rel.txt', '../outside/secret.txt'],
        ['passwd', '/etc/passwd'],
        ['zero', '/dev/zero'],
        ['procroot.txt', `/proc/self/root${path.join(fx.outside, 'secret.txt')}`],
      ];
      for (const [name, target] of cases) {
        linkFileOrSkip(ctx, target, path.join(fx.ws, name));
        expect(readOutcome(await readVerifiedTextFile(fx.root, name)), name).toBe('LINK_ESCAPE');
        expect(outcomeOf(await resolveWorkspacePath(fx.root, name, 'write')), name).toBe(
          'LINK_NOT_ALLOWED',
        );
      }
    });

    it('#49 a self-referencing file symlink is LINK_ESCAPE (ELOOP)', async (ctx) => {
      const fx = await makeFixture();
      linkFileOrSkip(ctx, 'loop', path.join(fx.ws, 'loop'));
      expect(outcomeOf(await resolveWorkspacePath(fx.root, 'loop', 'read'))).toBe('LINK_ESCAPE');
    });

    it('#49 a FIFO is UNSUPPORTED_FILE_TYPE and readVerifiedTextFile does not block on it', async (ctx) => {
      const fx = await makeFixture();
      try {
        execFileSync('mkfifo', [path.join(fx.ws, 'pipe')], { stdio: 'pipe' });
      } catch {
        ctx.skip('mkfifo unavailable');
      }
      expect(outcomeOf(await resolveWorkspacePath(fx.root, 'pipe', 'read'))).toBe(
        'UNSUPPORTED_FILE_TYPE',
      );
      expect(readOutcome(await readVerifiedTextFile(fx.root, 'pipe'))).toBe(
        'UNSUPPORTED_FILE_TYPE',
      );
    });

    it('#49 a Unix domain socket is UNSUPPORTED_FILE_TYPE', async (ctx) => {
      const fx = await makeFixture();
      const socketPath = path.join(fx.ws, 's.sock');
      const server = net.createServer();
      try {
        await new Promise<void>((resolve, reject) => {
          server.once('error', reject);
          server.listen(socketPath, resolve);
        });
      } catch (error) {
        const code = errnoCode(error);
        if (code === 'EPERM' || code === 'EACCES' || code === 'ENOSYS' || code === 'ENOTSUP') {
          ctx.skip('Unix domain socket creation is unavailable');
        }
        throw error;
      }
      try {
        expect(readOutcome(await readVerifiedTextFile(fx.root, 's.sock'))).toBe(
          'UNSUPPORTED_FILE_TYPE',
        );
      } finally {
        await new Promise<void>((resolve) =>
          server.close(() => {
            resolve();
          }),
        );
      }
    });
  });
});

// ---------------------------------------------------------------------------------------------
// 4. Hardlinks (fail closed, README step 6)
// ---------------------------------------------------------------------------------------------

describe('#49 adversarial: hardlinks alias outside data', () => {
  it('#49 an in-root hardlink to an outside file is HARDLINK_UNSUPPORTED for read, write and readVerifiedTextFile', async () => {
    const fx = await makeFixture();
    fs.linkSync(path.join(fx.outside, 'secret.txt'), path.join(fx.ws, 'h.txt'));
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'h.txt', 'read'))).toBe(
      'HARDLINK_UNSUPPORTED',
    );
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'h.txt', 'write'))).toBe(
      'HARDLINK_UNSUPPORTED',
    );
    expect(readOutcome(await readVerifiedTextFile(fx.root, 'h.txt'))).toBe('HARDLINK_UNSUPPORTED');
  });

  it('#49 a hardlink reached through an in-root link is still HARDLINK_UNSUPPORTED', async (ctx) => {
    const fx = await makeFixture();
    fs.linkSync(path.join(fx.outside, 'secret.txt'), path.join(fx.ws, 'sub', 'h.txt'));
    linkDirOrSkip(ctx, path.join(fx.ws, 'sub'), path.join(fx.ws, 'lnk'));
    expect(readOutcome(await readVerifiedTextFile(fx.root, 'lnk/h.txt'))).toBe(
      'HARDLINK_UNSUPPORTED',
    );
  });

  it('#49 a hardlink created after resolution is caught by revalidateResolvedPath', async () => {
    const fx = await makeFixture();
    const first = await resolveWorkspacePath(fx.root, 'sub/secret.txt', 'write');
    expect(outcomeOf(first)).toBe('OK');
    if (!first.ok) {
      return;
    }
    fs.linkSync(path.join(fx.ws, 'sub', 'secret.txt'), path.join(fx.outside, 'alias.txt'));
    expect(outcomeOf(await revalidateResolvedPath(fx.root, first.value))).toBe(
      'HARDLINK_UNSUPPORTED',
    );
  });
});

// ---------------------------------------------------------------------------------------------
// 5. Workspace root selection
// ---------------------------------------------------------------------------------------------

describe('#49 adversarial: openWorkspaceRoot', () => {
  it.each([['C:'], ['c:'], ['C:.'], ['C:..'], ['C:sub'], ['.'], ['..'], ['ws']])(
    '#49 drive-relative or relative root %s is ROOT_UNSUPPORTED',
    async (selected) => {
      expect(outcomeOf(await openWorkspaceRoot(selected))).toBe('ROOT_UNSUPPORTED');
    },
  );

  it('#49 the filesystem root and non-normalized spellings of it are ROOT_UNSUPPORTED', async () => {
    const base = newTempDir();
    const fsRoot = path.parse(base).root;
    const depth = base.slice(fsRoot.length).split(path.sep).filter(Boolean).length;
    const viaDots = base + `${path.sep}..`.repeat(depth);
    for (const selected of [fsRoot, `${fsRoot}.`, viaDots, `${viaDots}${path.sep}`]) {
      expect(outcomeOf(await openWorkspaceRoot(selected)), selected).toBe('ROOT_UNSUPPORTED');
    }
  });

  it('#49 a link to the filesystem root is ROOT_UNSUPPORTED', async (ctx) => {
    const base = newTempDir();
    const link = path.join(base, 'to-root');
    linkDirOrSkip(ctx, path.parse(base).root, link);
    expect(outcomeOf(await openWorkspaceRoot(link))).toBe('ROOT_UNSUPPORTED');
  });

  it.runIf(IS_WINDOWS)(
    '#49 an opaque volume-GUID junction to the drive root is ROOT_UNSUPPORTED',
    async (ctx) => {
      const base = newTempDir();
      const link = path.join(base, 'vol-root');
      mklinkJunctionOrSkip(ctx, link, volumeGuidRootOrSkip(ctx, base));
      expect(fs.lstatSync(link).isSymbolicLink()).toBe(false);
      expect(outcomeOf(await openWorkspaceRoot(link))).toBe('ROOT_UNSUPPORTED');
    },
  );

  it.runIf(IS_WINDOWS)(
    '#49 Win32 namespace and UNC prefixes are ROOT_UNSUPPORTED before realpath',
    async (ctx) => {
      const fx = await makeFixture();
      const fwd = fx.ws.replace(/\\/g, '/');
      const volume = volumeGuidRootOrSkip(ctx, fx.ws);
      const selections = [
        `\\\\?\\${fx.ws}`,
        `\\\\.\\${fx.ws}`,
        `//?/${fwd}`,
        `//./${fwd}`,
        `\\\\?\\UNC\\ws49-unc-probe.invalid\\share`,
        `\\\\ws49-unc-probe.invalid\\share`,
        `//ws49-unc-probe.invalid/share`,
        volume + fx.ws.slice(3),
      ];
      for (const selected of selections) {
        expect(outcomeOf(await openWorkspaceRoot(selected)), selected).toBe('ROOT_UNSUPPORTED');
      }
      expect(fsHooks.realpathCalls).toEqual([]);
      expect(fsHooks.blockedNetworkPaths).toEqual([]);
    },
  );

  // Win32 treats '/' and '\' alike, so "\/./C:/x" and "/\.\C:\x" are local-device paths and
  // "/\host\share" is UNC. README: UNC/device prefixes are rejected "before and after realpath".
  it.runIf(IS_WINDOWS)(
    'regression: #49 mixed-separator device prefixes (\\/./, /\\.\\, \\/?/, /\\?\\) are rejected as workspace roots',
    async () => {
      const fx = await makeFixture();
      const fwd = fx.ws.replace(/\\/g, '/');
      for (const selected of [`\\/./${fwd}`, `/\\.\\${fx.ws}`, `\\/?/${fwd}`, `/\\?\\${fx.ws}`]) {
        expect(outcomeOf(await openWorkspaceRoot(selected)), selected).toBe('ROOT_UNSUPPORTED');
      }
    },
  );

  it.runIf(IS_WINDOWS)(
    'regression: #49 mixed-separator UNC roots (/\\host\\share, \\/host/share) are rejected before realpath (no SMB/NTLM)',
    async () => {
      // The fs mock refuses every network path, so this test never touches the network; it
      // records whether openWorkspaceRoot ASKED the OS to open a UNC path.
      for (const selected of [
        '/\\ws49-unc-probe.invalid\\share',
        '\\/ws49-unc-probe.invalid/share',
      ]) {
        expect(outcomeOf(await openWorkspaceRoot(selected)), selected).toBe('ROOT_UNSUPPORTED');
      }
      expect(fsHooks.blockedNetworkPaths).toEqual([]);
    },
  );

  it.runIf(IS_WINDOWS)(
    '#49 an NTFS stream suffix on the root (::$INDEX_ALLOCATION) yields the canonical folder or is refused',
    async () => {
      const fx = await makeFixture();
      const opened = await openWorkspaceRoot(`${fx.ws}::$INDEX_ALLOCATION`);
      if (opened.ok) {
        expect(opened.value.canonicalPath).toBe(fx.ws);
        expect(opened.value.identity).toEqual(fx.root.identity);
      } else {
        expect(opened.error.code).toBeOneOf(['ROOT_UNSUPPORTED', 'NOT_FOUND', 'IO_ERROR']);
      }
    },
  );

  it.runIf(IS_WINDOWS)(
    '#49 an 8.3 spelling of the root canonicalizes to the long name',
    async (ctx) => {
      const base = newTempDir();
      fs.mkdirSync(path.join(base, 'longworkspacefolder'));
      if (!hasShortAlias(base, 'longworkspacefolder', 'LONGWO~1')) {
        ctx.skip('8.3 short names are disabled on this volume');
      }
      const opened = await openWorkspaceRoot(path.join(base, 'LONGWO~1'));
      expect(opened.ok ? opened.value.canonicalPath : opened.error.code).toBe(
        path.join(base, 'longworkspacefolder'),
      );
    },
  );

  it.each([
    ['wsd.', 'wsd'],
    ['wss ', 'wss'],
  ])(
    '#49 a root literally named %j does not alias its Win32-normalized sibling %j',
    async (rootName, siblingName) => {
      const base = newTempDir();
      fs.mkdirSync(path.join(base, rootName));
      fs.mkdirSync(path.join(base, siblingName));
      fs.writeFileSync(path.join(base, siblingName, 'secret.txt'), SECRET);
      const root = await openRoot(path.join(base, rootName));
      expect(root.canonicalPath).toBe(path.join(base, rootName));
      expect(outcomeOf(await resolveWorkspacePath(root, 'secret.txt', 'read'))).toBe('NOT_FOUND');
      expect(readOutcome(await readVerifiedTextFile(root, 'secret.txt'))).toBe('NOT_FOUND');
    },
  );

  it('#49 the user home folder is accepted as a root (allowed by the README; residual risk)', async () => {
    const opened = await openWorkspaceRoot(os.homedir());
    expect(outcomeOf(opened)).toBe('OK');
    if (opened.ok) {
      expect(path.parse(opened.value.canonicalPath).root).not.toBe(opened.value.canonicalPath);
    }
  });

  it.runIf(IS_WINDOWS)(
    '#49 a subst drive root canonicalizes to the substituted folder (opt-in: WS49_ALLOW_SUBST=1)',
    async (ctx) => {
      if (process.env.WS49_ALLOW_SUBST !== '1') {
        ctx.skip('creates a session-wide drive mapping; opt in with WS49_ALLOW_SUBST=1');
      }
      const fx = await makeFixture();
      const letter = ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'].find(
        (l) => !fs.existsSync(`${l}:\\`),
      );
      if (letter === undefined) {
        ctx.skip('no free drive letter for subst');
      }
      execFileSync('subst', [`${letter}:`, fx.ws], { stdio: 'pipe' });
      try {
        const opened = await openWorkspaceRoot(`${letter}:\\`);
        if (opened.ok) {
          expect(opened.value.canonicalPath).toBe(fx.ws);
          linkDirOrSkip(ctx, fx.outside, path.join(fx.ws, 'evil'));
          expect(readOutcome(await readVerifiedTextFile(opened.value, 'evil/secret.txt'))).toBe(
            'LINK_ESCAPE',
          );
        } else {
          expect(opened.error.code).toBe('ROOT_UNSUPPORTED');
        }
      } finally {
        execFileSync('subst', [`${letter}:`, '/D'], { stdio: 'pipe' });
      }
    },
  );

  it('#49 a root replaced by a link to an outside folder is ROOT_CHANGED', async (ctx) => {
    const fx = await makeFixture();
    requireDirLinks(ctx);
    swapDirForLink(fx.ws, fx.outside);
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'secret.txt', 'read'))).toBe(
      'ROOT_CHANGED',
    );
    expect(readOutcome(await readVerifiedTextFile(fx.root, 'secret.txt'))).toBe('ROOT_CHANGED');
  });

  it('#49 a root whose ancestor was replaced by a link (same names below) is ROOT_CHANGED', async (ctx) => {
    requireDirLinks(ctx);
    const base = newTempDir();
    const parent = path.join(base, 'p');
    fs.mkdirSync(path.join(parent, 'ws'), { recursive: true });
    fs.writeFileSync(path.join(parent, 'ws', 'readme.txt'), INSIDE);
    const root = await openRoot(path.join(parent, 'ws'));
    fs.mkdirSync(path.join(base, 'decoy', 'ws'), { recursive: true });
    fs.writeFileSync(path.join(base, 'decoy', 'ws', 'readme.txt'), SECRET);
    swapDirForLink(parent, path.join(base, 'decoy'));
    expect(readOutcome(await readVerifiedTextFile(root, 'readme.txt'))).toBe('ROOT_CHANGED');
  });

  it('#49 forged or non-canonical WorkspaceRoot objects are ROOT_CHANGED, never a throw', async () => {
    const fx = await makeFixture();
    const forged: unknown[] = [
      null,
      {},
      { ...fx.root, canonicalPath: fx.ws.toUpperCase() },
      { ...fx.root, canonicalPath: fx.outside },
      { ...fx.root, canonicalPath: `${fx.ws}${path.sep}` },
      { ...fx.root, identity: { dev: fx.root.identity.dev, ino: fx.root.identity.ino + 1n } },
    ];
    for (const root of forged) {
      const result = await resolveWorkspacePath(root as WorkspaceRoot, 'readme.txt', 'read');
      expect(outcomeOf(result)).toBe('ROOT_CHANGED');
    }
  });
});

// ---------------------------------------------------------------------------------------------
// 6. Containment helper with hostile canonical inputs
// ---------------------------------------------------------------------------------------------

describe('#49 adversarial: isWithinRoot', () => {
  it.each([
    ['drive root contains a child', 'C:\\', 'C:\\x', true],
    ['drive root does not contain another drive', 'C:\\', 'D:\\x', false],
    ['trailing separator root', 'C:\\ws\\', 'C:\\ws\\x', true],
    ['trailing separator root vs sibling prefix', 'C:\\ws\\', 'C:\\ws-evil\\x', false],
    ['sibling prefix', 'C:\\ws', 'C:\\ws-evil', false],
    ['UNC sibling prefix', '\\\\srv\\share\\ws', '\\\\srv\\share\\ws-evil\\x', false],
    ['UNC other share', '\\\\srv\\share\\ws', '\\\\srv\\share2\\ws\\x', false],
    ['UNC child', '\\\\srv\\share\\ws', '\\\\srv\\share\\ws\\x', true],
    ['device spelling of a child (fail closed)', 'C:\\ws', '\\\\?\\C:\\ws\\x', false],
    ['lower-case drive (fail closed)', 'C:\\ws', 'c:\\ws\\x', false],
    ['drive-relative candidate', 'C:\\ws', 'C:ws\\x', false],
    ['backslash dot-dot', 'C:\\ws', 'C:\\ws\\..\\x', false],
    ['backslash dot', 'C:\\ws', 'C:\\ws\\.\\x', false],
    ['forward-slash root spelling', 'C:/ws', 'C:\\ws\\x', false],
    ['device root with dot-dot', '\\\\?\\C:\\ws', '\\\\?\\C:\\ws\\..\\x', false],
    ['relative root', 'ws', 'ws\\x', false],
  ] as const)('#49 win32: %s', (_label, root, candidate, expected) => {
    expect(isWithinRoot(root, candidate, path.win32)).toBe(expected);
  });

  it.each([
    ['dot-dot', '/ws', '/ws/../etc', false],
    ['sibling prefix', '/ws', '/ws-evil/x', false],
    ['double leading slash child', '/ws', '//ws/x', true],
    ['backslash is a literal name character', '/ws', '/ws/a\\..\\..', true],
    ['NUL-suffixed sibling', '/ws', '/ws\u0000/x', false],
    ['filesystem root', '/', '/etc', true],
  ] as const)('#49 posix: %s', (_label, root, candidate, expected) => {
    expect(isWithinRoot(root, candidate, path.posix)).toBe(expected);
  });

  // README: "Paths with remaining ./.. segments ... are never within". On win32 '/' is also a
  // separator, but splitCanonical only splits on flavor.sep ('\\'), so '/..' hides the '..'.
  it('regression: #49 isWithinRoot (win32) rejects a candidate whose forward-slash ".." segments leave the root', () => {
    expect(isWithinRoot('C:\\ws', 'C:\\ws\\a/../../evil', path.win32)).toBe(false);
    expect(isWithinRoot('C:\\ws', 'C:\\ws\\/..', path.win32)).toBe(false);
  });

  it('regression: #49 isWithinRoot (win32) never reports a candidate whose OS resolution leaves the root', () => {
    const tokens = ['\\', '/', '..', '.', 'ws', 'ws-evil', 'x'];
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...tokens), { maxLength: 10 }), (parts) => {
        const candidate = `C:\\ws\\${parts.join('')}`;
        if (!isWithinRoot('C:\\ws', candidate, path.win32)) {
          return true;
        }
        const resolved = path.win32.resolve(candidate);
        return resolved === 'C:\\ws' || resolved.startsWith('C:\\ws\\');
      }),
      { numRuns: 2000 },
    );
  });

  it('#49 isWithinRoot (posix) never reports a candidate whose OS resolution leaves the root', () => {
    const tokens = ['\\', '/', '..', '.', 'ws', 'ws-evil', 'x'];
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...tokens), { maxLength: 10 }), (parts) => {
        const candidate = `/ws/${parts.join('')}`;
        if (!isWithinRoot('/ws', candidate, path.posix)) {
          return true;
        }
        const resolved = path.posix.resolve(candidate);
        return resolved === '/ws' || resolved.startsWith('/ws/');
      }),
      { numRuns: 2000 },
    );
  });
});

// ---------------------------------------------------------------------------------------------
// 7. Unexpected filesystem errors and odd realpath results (fault injection)
// ---------------------------------------------------------------------------------------------

describe('#49 adversarial: fault injection never turns into a throw or an allow', () => {
  it.each([
    ['EACCES', 'IO_ERROR'],
    ['EPERM', 'IO_ERROR'],
    ['EBUSY', 'IO_ERROR'],
    ['EIO', 'IO_ERROR'],
    ['ENAMETOOLONG', 'IO_ERROR'],
    ['UNKNOWN', 'IO_ERROR'],
    ['ELOOP', 'LINK_ESCAPE'],
    ['ENOTDIR', 'NOT_FOUND'],
  ] as const)(
    '#49 lstat failing with %s inside the workspace maps to %s',
    async (code, expected) => {
      const fx = await makeFixture();
      fsHooks.beforeLstat = (target) => {
        if (target.startsWith(fx.ws + path.sep)) {
          throw fsError(code);
        }
      };
      for (const intent of INTENTS) {
        expect(outcomeOf(await resolveWorkspacePath(fx.root, 'sub/secret.txt', intent))).toBe(
          expected,
        );
      }
      expect(readOutcome(await readVerifiedTextFile(fx.root, 'sub/secret.txt'))).toBe(expected);
    },
  );

  it.each([['a string'], [null], [undefined], [42], [{ code: 42 }], [{}]])(
    '#49 lstat throwing a non-Error value (%j) is IO_ERROR',
    async (thrown: unknown) => {
      const fx = await makeFixture();
      fsHooks.beforeLstat = (target) => {
        if (target.startsWith(fx.ws + path.sep)) {
          throw thrown;
        }
      };
      expect(outcomeOf(await resolveWorkspacePath(fx.root, 'readme.txt', 'read'))).toBe('IO_ERROR');
    },
  );

  it.each([
    ['EACCES', 'IO_ERROR'],
    ['ELOOP', 'LINK_ESCAPE'],
    ['ENOENT', 'NOT_FOUND'],
  ] as const)('#49 realpath of the target failing with %s maps to %s', async (code, expected) => {
    const fx = await makeFixture();
    const target = path.join(fx.ws, 'sub', 'secret.txt');
    fsHooks.beforeRealpath = (p) => {
      if (p === target) {
        throw fsError(code);
      }
    };
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'sub/secret.txt', 'read'))).toBe(expected);
  });

  it('#49 realpath of the root failing (EACCES) is ROOT_CHANGED', async () => {
    const fx = await makeFixture();
    fsHooks.beforeRealpath = (p) => {
      if (p === fx.ws) {
        throw fsError('EACCES');
      }
    };
    expect(outcomeOf(await resolveWorkspacePath(fx.root, 'readme.txt', 'read'))).toBe(
      'ROOT_CHANGED',
    );
  });

  it('#49 odd realpath results (relative, device-prefixed, re-cased, with ..) are never inside', async () => {
    const fx = await makeFixture();
    const target = path.join(fx.ws, 'sub', 'secret.txt');
    const outsideTarget = path.join(fx.outside, 'secret.txt');
    const oddResults = [
      // libuv strips "\\?\" from GetFinalPathNameByHandle results, so a DOS-less volume would
      // come back relative-looking.
      'Volume{00000000-0000-0000-0000-000000000000}\\sub\\secret.txt',
      `\\\\?\\${target}`,
      target.toUpperCase() === target ? target.toLowerCase() : target.toUpperCase(),
      path.join(fx.ws, 'sub') +
        path.sep +
        '..' +
        path.sep +
        '..' +
        path.sep +
        path.relative(fx.base, outsideTarget),
    ];
    for (const odd of oddResults) {
      fsHooks.mapRealpath = (p, canonical) => (p === target ? odd : canonical);
      const result = await resolveWorkspacePath(fx.root, 'sub/secret.txt', 'read');
      expect(outcomeOf(result), odd).toBeOneOf(['OUTSIDE_WORKSPACE', 'NON_CANONICAL_PATH']);
    }
  });

  it.each([
    ['EACCES', 'IO_ERROR'],
    ['EBUSY', 'IO_ERROR'],
    ['EISDIR', 'IO_ERROR'],
    ['ELOOP', 'LINK_ESCAPE'],
    ['ENOENT', 'NOT_FOUND'],
  ] as const)(
    '#49 open failing with %s in readVerifiedTextFile maps to %s',
    async (code, expected) => {
      const fx = await makeFixture();
      fsHooks.beforeOpen = () => {
        throw fsError(code);
      };
      expect(readOutcome(await readVerifiedTextFile(fx.root, 'readme.txt'))).toBe(expected);
    },
  );

  it('#49 resolve and read never reject and never leak for random hostile requests over a hostile tree', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, fx.outside, path.join(fx.ws, 'evil'));
    linkDirOrSkip(ctx, fx.ws, path.join(fx.ws, 'self'));
    linkDirOrSkip(ctx, path.join(fx.ws, 'sub'), path.join(fx.ws, 'lnk'));
    fs.linkSync(path.join(fx.outside, 'secret.txt'), path.join(fx.ws, 'h.txt'));
    const tokens = [
      'evil',
      'self',
      'lnk',
      'sub',
      'secret.txt',
      'SECRET.TXT',
      'h.txt',
      'outside',
      'ws',
      'ws-evil',
      '/',
      '\\',
      '.',
      '..',
      ' ',
      ':',
      '%2e',
      '~1',
      'C:',
      '\uff0e',
    ];
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom(...tokens), { minLength: 1, maxLength: 8 }).map((p) => p.join('')),
        fc.constantFrom(...INTENTS),
        async (input, intent) => {
          const resolved = await resolveWorkspacePath(fx.root, input, intent);
          if (resolved.ok && !isWithinRoot(fx.ws, resolved.value.canonicalPath)) {
            return false;
          }
          const read = await readVerifiedTextFile(fx.root, input);
          return !(read.ok && read.value.content.includes(SECRET));
        },
      ),
      { numRuns: 150 },
    );
  });
});

// ---------------------------------------------------------------------------------------------
// 8. Time-of-check / time-of-use (deterministic simulation through fs hooks)
// ---------------------------------------------------------------------------------------------

describe('#49 adversarial: TOCTOU windows', () => {
  it('manual save rejects an ancestor redirected outside the workspace before opening the target', async (ctx) => {
    requireDirLinks(ctx);
    const fx = await makeFixture();
    const broker = new WorkspaceBroker(() => Promise.resolve(fx.ws));
    await broker.chooseWorkspace();
    const opened = await broker.readFile('sub/secret.txt');
    if (!opened.ok) throw new Error(`Fixture read failed: ${opened.error.code}`);
    const target = path.join(fx.ws, 'sub', 'secret.txt');
    let swapped = false;
    fsHooks.beforeOpen = (candidate) => {
      if (candidate === target && !swapped) {
        swapDirForLink(path.dirname(target), fx.outside);
        swapped = true;
      }
    };
    await expect(
      broker.saveFile(opened.value.path, 'user edit', opened.value.revision),
    ).resolves.toMatchObject({ error: { code: 'TARGET_CHANGED' } });
    expect(swapped).toBe(true);
    expect(fs.readdirSync(fx.outside)).toEqual(['secret.txt']);
    expect(fs.readFileSync(path.join(fx.outside, 'secret.txt'), 'utf8')).toBe(SECRET);
    expect(fs.readFileSync(path.join(fx.ws, 'sub-orig', 'secret.txt'), 'utf8')).toBe(INSIDE);
  });

  it('manual save leaves an external edit made while staging intact', async () => {
    const fx = await makeFixture();
    const broker = new WorkspaceBroker(() => Promise.resolve(fx.ws));
    await broker.chooseWorkspace();
    const opened = await broker.readFile('sub/secret.txt');
    if (!opened.ok) throw new Error(`Fixture read failed: ${opened.error.code}`);
    const target = path.join(fx.ws, 'sub', 'secret.txt');
    const external = INSIDE.replace('inside', 'edited');
    let edited = false;
    fsHooks.beforeOpen = (candidate) => {
      if (path.dirname(candidate) === path.dirname(target) && candidate !== target && !edited) {
        fs.writeFileSync(target, external);
        edited = true;
      }
    };
    await expect(
      broker.saveFile(opened.value.path, 'user edit', opened.value.revision),
    ).resolves.toMatchObject({
      error: { code: 'TARGET_CHANGED' },
    });
    expect(edited).toBe(true);
    expect(fs.readFileSync(target, 'utf8')).toBe(external);
    expect(fs.readdirSync(path.dirname(target))).toEqual(['secret.txt']);
  });

  it('manual save never overwrites or unlinks a preexisting temporary entry', async () => {
    const fx = await makeFixture();
    const broker = new WorkspaceBroker(() => Promise.resolve(fx.ws));
    await broker.chooseWorkspace();
    const opened = await broker.readFile('sub/secret.txt');
    if (!opened.ok) throw new Error(`Fixture read failed: ${opened.error.code}`);
    const target = path.join(fx.ws, 'sub', 'secret.txt');
    let existing = '';
    fsHooks.beforeOpen = (candidate) => {
      if (
        path.dirname(candidate) === path.dirname(target) &&
        candidate !== target &&
        existing === ''
      ) {
        fs.writeFileSync(candidate, 'preexisting');
        existing = candidate;
      }
    };
    await expect(
      broker.saveFile(opened.value.path, 'user edit', opened.value.revision),
    ).resolves.toMatchObject({
      ok: false,
    });
    expect(existing).not.toBe('');
    expect(fs.readFileSync(existing, 'utf8')).toBe('preexisting');
    expect(fs.readFileSync(target, 'utf8')).toBe(INSIDE);
  });

  it('#49 parent swapped for an outside link between the walk and realpath is OUTSIDE_WORKSPACE', async (ctx) => {
    requireDirLinks(ctx);
    const fx = await makeFixture();
    const target = path.join(fx.ws, 'sub', 'secret.txt');
    let swapped = false;
    fsHooks.beforeRealpath = (p) => {
      if (p === target && !swapped) {
        swapped = true;
        swapDirForLink(path.join(fx.ws, 'sub'), fx.outside);
      }
    };
    const read = await readVerifiedTextFile(fx.root, 'sub/secret.txt');
    expect(swapped).toBe(true);
    expect(readOutcome(read)).toBeOneOf(['OUTSIDE_WORKSPACE', 'LINK_ESCAPE']);
  });

  // Out of scope per README (concurrent local process), reported because it is cheap to close:
  // resolveWorkspacePath takes the identity from a second, path-based lstat AFTER the realpath
  // containment check. An intermediate component swapped in that window is followed by lstat
  // (only the last component is lstat'ed), so the "validated" identity is the outside file's,
  // and readVerifiedTextFile's post-open identity check then matches the outside file.
  it('regression: #49 (TOCTOU, out-of-scope racer) parent swapped between realpath and lstat does not leak outside content', async (ctx) => {
    requireDirLinks(ctx);
    const fx = await makeFixture();
    const target = path.join(fx.ws, 'sub', 'secret.txt');
    let realpathSeen = false;
    let swapped = false;
    fsHooks.beforeRealpath = (p) => {
      if (p === target) {
        realpathSeen = true;
      }
    };
    fsHooks.beforeLstat = (p) => {
      if (p === target && realpathSeen && !swapped) {
        swapped = true;
        swapDirForLink(path.join(fx.ws, 'sub'), fx.outside);
      }
    };
    const read = await readVerifiedTextFile(fx.root, 'sub/secret.txt');
    expect(swapped).toBe(true);
    expect(readOutcome(read)).not.toContain(SECRET);
    expect(read.ok).toBe(false);
  });

  it('#49 parent swapped for an outside link between resolve and open is TARGET_CHANGED', async (ctx) => {
    requireDirLinks(ctx);
    const fx = await makeFixture();
    let swapped = false;
    fsHooks.beforeOpen = () => {
      if (!swapped) {
        swapped = true;
        swapDirForLink(path.join(fx.ws, 'sub'), fx.outside);
      }
    };
    const read = await readVerifiedTextFile(fx.root, 'sub/secret.txt');
    expect(swapped).toBe(true);
    expect(readOutcome(read)).toBe('TARGET_CHANGED');
  });

  it('#49 file replaced by another file between resolve and open is TARGET_CHANGED', async () => {
    const fx = await makeFixture();
    fs.writeFileSync(path.join(fx.ws, 'replacement.txt'), 'replacement\n');
    let swapped = false;
    fsHooks.beforeOpen = (p) => {
      if (!swapped) {
        swapped = true;
        fs.renameSync(path.join(fx.ws, 'replacement.txt'), p);
      }
    };
    const read = await readVerifiedTextFile(fx.root, 'sub/secret.txt');
    expect(swapped).toBe(true);
    expect(readOutcome(read)).toBe('TARGET_CHANGED');
  });

  it('#49 hardlink created between resolve and open is TARGET_CHANGED', async () => {
    const fx = await makeFixture();
    let linked = false;
    fsHooks.beforeOpen = (p) => {
      if (!linked) {
        linked = true;
        fs.linkSync(p, path.join(fx.outside, 'alias.txt'));
      }
    };
    const read = await readVerifiedTextFile(fx.root, 'sub/secret.txt');
    expect(linked).toBe(true);
    expect(readOutcome(read)).toBe('TARGET_CHANGED');
  });

  it('#49 revalidateResolvedPath catches a parent swapped for an outside link (LINK_ESCAPE)', async (ctx) => {
    requireDirLinks(ctx);
    const fx = await makeFixture();
    const first = await resolveWorkspacePath(fx.root, 'sub/secret.txt', 'read');
    expect(outcomeOf(first)).toBe('OK');
    if (!first.ok) {
      return;
    }
    swapDirForLink(path.join(fx.ws, 'sub'), fx.outside);
    expect(outcomeOf(await revalidateResolvedPath(fx.root, first.value))).toBe('LINK_ESCAPE');
  });

  it('#49 revalidateResolvedPath catches a replaced file (TARGET_CHANGED)', async () => {
    const fx = await makeFixture();
    const first = await resolveWorkspacePath(fx.root, 'sub/secret.txt', 'write');
    expect(outcomeOf(first)).toBe('OK');
    if (!first.ok) {
      return;
    }
    fs.writeFileSync(path.join(fx.ws, 'replacement.txt'), 'replacement\n');
    fs.renameSync(path.join(fx.ws, 'replacement.txt'), path.join(fx.ws, 'sub', 'secret.txt'));
    expect(outcomeOf(await revalidateResolvedPath(fx.root, first.value))).toBe('TARGET_CHANGED');
  });

  it('#49 revalidateResolvedPath re-applies lexical policy to a forged previous result', async () => {
    const fx = await makeFixture();
    const first = await resolveWorkspacePath(fx.root, 'sub/secret.txt', 'read');
    expect(outcomeOf(first)).toBe('OK');
    if (!first.ok) {
      return;
    }
    const forgedTraversal = { ...first.value, relativePath: '../outside/secret.txt' };
    const forgedAbsolute = {
      ...first.value,
      relativePath: path.join(fx.outside, 'secret.txt'),
      canonicalPath: path.join(fx.outside, 'secret.txt'),
    };
    const forgedTarget = { ...first.value, canonicalPath: path.join(fx.outside, 'secret.txt') };
    expect(outcomeOf(await revalidateResolvedPath(fx.root, forgedTraversal))).toBe('TRAVERSAL');
    expect(outcomeOf(await revalidateResolvedPath(fx.root, forgedAbsolute))).toBe('ABSOLUTE_PATH');
    expect(outcomeOf(await revalidateResolvedPath(fx.root, forgedTarget))).toBe('TARGET_CHANGED');
  });
});

// ---------------------------------------------------------------------------------------------
// 9. API misuse that should still fail closed
// ---------------------------------------------------------------------------------------------

describe('#49 adversarial: API misuse fails closed', () => {
  // Defense in depth: the walk follows links for any intent other than the exact string
  // 'write', so a mis-typed / IPC-supplied intent silently gets read semantics.
  it('regression: #49 an unrecognised intent string is rejected and never follows links', async (ctx) => {
    const fx = await makeFixture();
    linkDirOrSkip(ctx, path.join(fx.ws, 'sub'), path.join(fx.ws, 'lnk'));
    for (const intent of ['WRITE', 'apply', 'delete', '']) {
      const result = await resolveWorkspacePath(fx.root, 'lnk/secret.txt', intent as AccessIntent);
      expect(outcomeOf(result), intent).not.toBe('OK');
    }
  });

  // README: "No function throws for a policy decision." BigInt(maxBytes) runs outside any
  // try/catch, so a non-integer limit rejects the promise with a RangeError.
  it.each([[Number.NaN], [1.5], [Number.POSITIVE_INFINITY]])(
    'regression: #49 readVerifiedTextFile returns a policy result instead of throwing for maxBytes=%s',
    async (maxBytes) => {
      const fx = await makeFixture();
      const result = await readVerifiedTextFile(fx.root, 'readme.txt', maxBytes).catch(
        (error: unknown) => `THREW:${error instanceof Error ? error.name : 'unknown'}`,
      );
      expect(typeof result === 'string' ? result : 'policy result').toBe('policy result');
    },
  );

  it('#49 a negative maxBytes is rejected (INVALID_INPUT), never a truncated read', async () => {
    const fx = await makeFixture();
    expect(readOutcome(await readVerifiedTextFile(fx.root, 'readme.txt', -1))).toBe(
      'INVALID_INPUT',
    );
  });

  it('#49 the root itself and directories are not readable as text', async () => {
    const fx = await makeFixture();
    for (const input of ['.', './', 'sub', 'sub/']) {
      expect(readOutcome(await readVerifiedTextFile(fx.root, input)), input).toBe(
        'UNSUPPORTED_FILE_TYPE',
      );
    }
  });
});
