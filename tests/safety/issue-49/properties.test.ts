/**
 * #49 Workspace boundary + path normalization — property-based invariants (fast-check).
 *
 * Spec: src/main/workspace/README.md. Every property here is stated against that README (or the
 * #49 acceptance criteria), not against the implementation. Failures print fast-check's seed and
 * counterexample path; set FC_SEED=<seed> to replay a run with the same generator stream.
 *
 * Filesystem fixtures live only under fresh `ws49-*` directories in os.tmpdir(); links point
 * only at paths inside those directories, and everything is removed after each test.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import fc from 'fast-check';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  isWithinRoot,
  toWorkspaceRelative,
  type PathFlavor,
} from '../../../src/main/workspace/containment';
import {
  policyFail,
  type PolicyResult,
  type WorkspacePolicyCode,
} from '../../../src/main/workspace/policy-result';
import {
  MAX_RELATIVE_PATH_LENGTH,
  MAX_SEGMENT_LENGTH,
  parseWorkspaceRelativePath,
  type WorkspaceRelativePath,
} from '../../../src/main/workspace/relative-path';
import {
  resolveWorkspacePath,
  revalidateResolvedPath,
  type AccessIntent,
  type ResolvedWorkspacePath,
} from '../../../src/main/workspace/resolve-path';
import { openWorkspaceRoot, type WorkspaceRoot } from '../../../src/main/workspace/workspace-root';

// ---------------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------------

/** Replay support: `FC_SEED=123 npx vitest run ...` reuses the seed fast-check printed. */
const FIXED_SEED = parseSeed(process.env.FC_SEED);

function parseSeed(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}

interface RunOptions {
  readonly numRuns: number;
  readonly seed?: number;
}

function runs(numRuns: number): RunOptions {
  return FIXED_SEED === undefined ? { numRuns } : { numRuns, seed: FIXED_SEED };
}

/** Exhaustive by construction: `satisfies` fails to compile if a code is added or removed. */
const CODE_TABLE = {
  INVALID_INPUT: true,
  ABSOLUTE_PATH: true,
  TRAVERSAL: true,
  ENCODED_TRAVERSAL: true,
  INVALID_SEGMENT: true,
  OUTSIDE_WORKSPACE: true,
  LINK_ESCAPE: true,
  LINK_NOT_ALLOWED: true,
  HARDLINK_UNSUPPORTED: true,
  UNSUPPORTED_FILE_TYPE: true,
  NON_CANONICAL_PATH: true,
  NOT_FOUND: true,
  TARGET_CHANGED: true,
  ROOT_UNSUPPORTED: true,
  ROOT_CHANGED: true,
  FILE_TOO_LARGE: true,
  UNSUPPORTED_ENCODING: true,
  IO_ERROR: true,
} as const satisfies Record<WorkspacePolicyCode, true>;

const ALL_CODES: ReadonlySet<string> = new Set(Object.keys(CODE_TABLE));

/** README "Lexical rules": the only codes a pure lexical check may produce. */
const LEXICAL_CODES: ReadonlySet<WorkspacePolicyCode> = new Set<WorkspacePolicyCode>([
  'INVALID_INPUT',
  'ABSOLUTE_PATH',
  'ENCODED_TRAVERSAL',
  'TRAVERSAL',
  'INVALID_SEGMENT',
]);

/** Shape check shared by every policy result: exactly `{ok:true,value}` or `{ok:false,error}`. */
function expectWellFormedResult(result: PolicyResult<unknown>): void {
  if (result.ok) {
    expect(Object.keys(result).sort()).toEqual(['ok', 'value']);
    return;
  }
  expect(Object.keys(result).sort()).toEqual(['error', 'ok']);
  expect(ALL_CODES.has(result.error.code)).toBe(true);
  // Generic message for the code: never echoes the request or any absolute path.
  const canonical = policyFail(result.error.code);
  expect(result.error).toEqual(canonical.ok ? undefined : canonical.error);
}

/** U+0000–U+001F and U+007F (README rule 1). */
function hasC0OrDel(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

const DOS_DEVICE_STEMS: ReadonlySet<string> = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'conin$',
  'conout$',
  ...['com', 'lpt'].flatMap((prefix) =>
    Array.from('0123456789\u00b9\u00b2\u00b3').map((digit) => prefix + digit),
  ),
]);

/** Independent oracle for README rule 5's device list (any case, any extension). */
function namesDosDevice(segment: string): boolean {
  const trimmed = segment.trimEnd();
  const dot = trimmed.indexOf('.');
  const stem = (dot === -1 ? trimmed : trimmed.slice(0, dot)).toLowerCase();
  return DOS_DEVICE_STEMS.has(stem);
}

/** README rule 5 for a single (non-empty, non-dot) segment. */
function segmentViolatesRule5(segment: string): boolean {
  return (
    segment.length > MAX_SEGMENT_LENGTH ||
    segment.endsWith('.') ||
    segment.endsWith(' ') ||
    /[<>:"|?*]/.test(segment) ||
    namesDosDevice(segment)
  );
}

const ENCODED_SYNTAX = /%(?:2e|2f|5c|3a|00|25)/i;

/** Splits like README rule 4: runs of `/` and `\`, dropping empty and `.` segments. */
function readmeSegments(input: string): string[] {
  return input.split(/[\\/]+/).filter((segment) => segment !== '' && segment !== '.');
}

type ModelOutcome =
  | { readonly ok: true; readonly segments: readonly string[] }
  | { readonly ok: false; readonly codes: readonly WorkspacePolicyCode[] };

/**
 * Executable reading of README "Lexical rules" 1–6. Where rules 4 and 5 both apply, either
 * code is accepted here (the ordering question is pinned separately below).
 */
function modelParse(input: unknown): ModelOutcome {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > MAX_RELATIVE_PATH_LENGTH ||
    hasC0OrDel(input)
  ) {
    return { ok: false, codes: ['INVALID_INPUT'] };
  }
  if (/^[\\/]/.test(input) || /^[A-Za-z]:/.test(input)) {
    return { ok: false, codes: ['ABSOLUTE_PATH'] };
  }
  if (ENCODED_SYNTAX.test(input)) {
    return { ok: false, codes: ['ENCODED_TRAVERSAL'] };
  }
  const segments = readmeSegments(input);
  const traversal = segments.includes('..');
  const invalid = segments.some((segment) => segment !== '..' && segmentViolatesRule5(segment));
  if (traversal && invalid) {
    return { ok: false, codes: ['TRAVERSAL', 'INVALID_SEGMENT'] };
  }
  if (traversal) {
    return { ok: false, codes: ['TRAVERSAL'] };
  }
  if (invalid) {
    return { ok: false, codes: ['INVALID_SEGMENT'] };
  }
  return { ok: true, segments };
}

/** Every invariant an accepted lexical result must satisfy (README rules 4–6). */
function expectAcceptedInvariants(input: string, value: WorkspaceRelativePath): void {
  for (const segment of value.segments) {
    expect(segment).not.toBe('');
    expect(segment).not.toBe('.');
    expect(segment).not.toBe('..');
    expect(/[\\/:]/.test(segment)).toBe(false);
    expect(hasC0OrDel(segment)).toBe(false);
    expect(segmentViolatesRule5(segment)).toBe(false);
  }
  expect(value.posixPath).toBe(value.segments.join('/'));
  expect(value.posixPath.startsWith('/')).toBe(false);
  // The accepted segments are exactly the README split of the input: nothing rewritten.
  expect(value.segments).toEqual(readmeSegments(input));
  // Facts about the raw input implied by acceptance.
  expect(input.includes(':')).toBe(false);
  expect(ENCODED_SYNTAX.test(input)).toBe(false);
  expect(/^[\\/]/.test(input)).toBe(false);

  // Idempotence: the normalized form parses to the same segments. The root's posixPath is ''
  // (rule 1 rejects ''), so it is re-entered as '.', exactly as revalidateResolvedPath does.
  const again = parseWorkspaceRelativePath(value.posixPath === '' ? '.' : value.posixPath);
  expect(again.ok).toBe(true);
  if (again.ok) {
    expect(again.value.segments).toEqual(value.segments);
    expect(again.value.posixPath).toBe(value.posixPath);
  }
}

// ---------------------------------------------------------------------------------------------
// Arbitraries for the lexical layer
// ---------------------------------------------------------------------------------------------

/** Path-ish tokens from the task brief plus a few near-miss neighbours. */
const PATHISH_TOKENS = [
  '..',
  '.',
  '/',
  '\\',
  '%2e',
  '%2E',
  '%2f',
  '%5c',
  '%5C',
  '%25',
  '%3a',
  '%00',
  '%41',
  '%',
  'C:',
  'c:',
  ':',
  '\u0000',
  '\u001f',
  '\u007f',
  ' ',
  'CON',
  'con.txt',
  'Lpt1',
  'COM\u00b9',
  'a',
  'b.txt',
  '\u00e9',
  '\uff5e', // FULLWIDTH TILDE
  '\uff0e', // FULLWIDTH FULL STOP
  '\uff0e\uff0e',
  '...',
  '*',
  '?',
  '"',
  '<',
  '|',
  '\ud800', // lone surrogate
] as const;

const pathishString = fc
  .array(fc.constantFrom(...PATHISH_TOKENS), { maxLength: 24 })
  .map((tokens) => tokens.join(''));

/** Arbitrary strings of several flavours (fast-check 4: `unit: 'binary'` = full Unicode). */
const anyString = fc.oneof(
  fc.string(),
  fc.string({ unit: 'binary' }),
  fc.string({ unit: 'grapheme' }),
  fc.string({ unit: 'binary-ascii' }),
  pathishString,
  fc.string({ unit: fc.constantFrom(...PATHISH_TOKENS), maxLength: 30 }),
);

/** A lexically safe segment (cannot trip any README rule). */
const safeSegment = fc
  .string({
    unit: fc.constantFrom('a', 'B', 'z', '0', '-', '_', '\u00e9', '\uff5e', '\uff0e', 'x', '.'),
    minLength: 1,
    maxLength: 10,
  })
  .filter((segment) => !segment.endsWith('.') && !namesDosDevice(segment));

const SEPARATOR = fc.constantFrom('/', '\\', '//', '\\\\', '/./', '\\.\\');

/** Joins segments with random separator runs (never leading, so the input stays relative). */
function joinWithSeparators(segments: readonly string[], separators: readonly string[]): string {
  return segments
    .map((segment, index) => (index === 0 ? segment : (separators[index] ?? '/') + segment))
    .join('');
}

const separatorList = fc.array(SEPARATOR, { minLength: 12, maxLength: 12 });

// ---------------------------------------------------------------------------------------------
// parseWorkspaceRelativePath
// ---------------------------------------------------------------------------------------------

describe('#49 properties: parseWorkspaceRelativePath (pure lexical layer)', () => {
  it('#49 never throws; result is ok XOR a lexical WorkspacePolicyCode for arbitrary strings', () => {
    fc.assert(
      fc.property(anyString, (input) => {
        const result = parseWorkspaceRelativePath(input);
        expectWellFormedResult(result);
        if (!result.ok) {
          expect(LEXICAL_CODES.has(result.error.code)).toBe(true);
        }
      }),
      runs(1000),
    );
  });

  it('#49 non-string inputs (including boxed strings) are INVALID_INPUT and never throw', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.anything().filter((value) => typeof value !== 'string'),
          fc.string().map((value) => Object(value) as unknown),
        ),
        (input) => {
          const result = parseWorkspaceRelativePath(input);
          expectWellFormedResult(result);
          expect(result.ok ? 'ok' : result.error.code).toBe('INVALID_INPUT');
        },
      ),
      runs(300),
    );
  });

  it('#49 accepted inputs satisfy every README segment invariant and re-parse idempotently', () => {
    const acceptedBiased = fc.oneof(
      { arbitrary: anyString, weight: 2 },
      {
        arbitrary: fc
          .tuple(fc.array(safeSegment, { minLength: 1, maxLength: 12 }), separatorList)
          .map(([segments, separators]) => joinWithSeparators(segments, separators)),
        weight: 3,
      },
    );
    fc.assert(
      fc.property(acceptedBiased, (input) => {
        const result = parseWorkspaceRelativePath(input);
        if (result.ok) {
          expectAcceptedInvariants(input, result.value);
        }
      }),
      runs(1000),
    );
  });

  it('#49 agrees with an executable model of README lexical rules 1-6 (decision and code)', () => {
    fc.assert(
      fc.property(anyString, (input) => {
        const actual = parseWorkspaceRelativePath(input);
        const expected = modelParse(input);
        if (expected.ok) {
          expect(actual.ok).toBe(true);
          if (actual.ok) {
            expect(actual.value.segments).toEqual(expected.segments);
          }
        } else {
          expect(actual.ok).toBe(false);
          if (!actual.ok) {
            expect(expected.codes).toContain(actual.error.code);
          }
        }
      }),
      runs(1000),
    );
  });

  it('#49 any input with a ".." segment (split on [\\\\/]) is rejected', () => {
    const withDotDot = fc
      .tuple(
        fc.array(fc.oneof(safeSegment, fc.constantFrom('.', '', '\uff0e\uff0e')), {
          maxLength: 5,
        }),
        fc.array(fc.oneof(safeSegment, fc.constantFrom('.', '..', '')), { maxLength: 5 }),
        separatorList,
      )
      .map(([before, after, separators]) =>
        joinWithSeparators([...before, '..', ...after], separators),
      );
    fc.assert(
      fc.property(fc.oneof(withDotDot, anyString), (input) => {
        if (!input.split(/[\\/]/).includes('..')) {
          return;
        }
        const result = parseWorkspaceRelativePath(input);
        expect(result.ok).toBe(false);
      }),
      runs(1000),
    );
  });

  it('#49 control characters anywhere are INVALID_INPUT; encoded syntax is never accepted', () => {
    const control = fc.integer({ min: 0, max: 0x20 }).map((code) =>
      // 0x20 stands in for DEL so both C0 and U+007F are drawn.
      String.fromCharCode(code === 0x20 ? 0x7f : code),
    );
    const encoded = fc
      .tuple(
        fc.constantFrom('2', '5', '3', '0'),
        fc.constantFrom('e', 'E', 'f', 'F', 'c', 'C', 'a', 'A', '0', '5'),
      )
      .map(([high, low]) => `%${high}${low}`)
      .filter((token) => ENCODED_SYNTAX.test(token));
    fc.assert(
      fc.property(
        safeSegment,
        fc.oneof(control, encoded),
        safeSegment,
        (prefix, inserted, suffix) => {
          const input = `${prefix}/${inserted}${suffix}`;
          const result = parseWorkspaceRelativePath(input);
          expect(result.ok).toBe(false);
          if (!result.ok && hasC0OrDel(inserted)) {
            expect(result.error.code).toBe('INVALID_INPUT');
          }
          if (!result.ok && !hasC0OrDel(inserted)) {
            expect(result.error.code).toBe('ENCODED_TRAVERSAL');
          }
        },
      ),
      runs(500),
    );
  });

  it('#49 length limits: whole input <= 4096 and each segment <= 255 (boundary sweep)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3900, max: 4300 }), (length) => {
        // Segments of 100 'a's joined by '/', trimmed to the exact length (never ends in '/').
        const input =
          'a'
            .repeat(100)
            .concat('/')
            .repeat(50)
            .slice(0, length - 1) + 'b';
        expect(input).toHaveLength(length);
        const result = parseWorkspaceRelativePath(input);
        expect(result.ok).toBe(length <= MAX_RELATIVE_PATH_LENGTH);
      }),
      runs(300),
    );
    fc.assert(
      fc.property(fc.integer({ min: 200, max: 320 }), (length) => {
        const result = parseWorkspaceRelativePath(`dir/${'s'.repeat(length)}`);
        expect(result.ok).toBe(length <= MAX_SEGMENT_LENGTH);
        if (!result.ok) {
          expect(result.error.code).toBe('INVALID_SEGMENT');
        }
      }),
      runs(300),
    );
  });

  it('#49 regression: README rule order - a ".." segment reports TRAVERSAL even after an invalid segment', () => {
    // README: "In order: ... 4. A `..` segment -> TRAVERSAL. 5. ... -> INVALID_SEGMENT".
    // Both codes deny; this pins which one the README's ordering promises.
    const invalidSegment = fc.constantFrom('CON', 'a.', 'b ', 'x*y', 'NUL.txt', 'q?');
    fc.assert(
      fc.property(
        invalidSegment,
        fc.array(safeSegment, { maxLength: 3 }),
        separatorList,
        (bad, tail, separators) => {
          const input = joinWithSeparators([bad, ...tail, '..'], separators);
          const result = parseWorkspaceRelativePath(input);
          expect(result.ok ? 'ok' : result.error.code).toBe('TRAVERSAL');
        },
      ),
      runs(300),
    );
  });
});

// ---------------------------------------------------------------------------------------------
// Lexical result joined onto a fixed canonical root (both path flavours)
// ---------------------------------------------------------------------------------------------

interface FlavorCase {
  readonly name: 'win32' | 'posix';
  readonly flavor: PathFlavor & Pick<typeof path, 'join' | 'dirname'>;
  readonly root: string;
}

const FLAVORS: readonly FlavorCase[] = [
  { name: 'win32', flavor: path.win32, root: 'C:\\ws\\proj' },
  { name: 'posix', flavor: path.posix, root: '/ws/proj' },
];

describe('#49 properties: accepted relative paths stay inside a fixed canonical root', () => {
  for (const { name, flavor, root } of FLAVORS) {
    it(`#49 [${name}] flavor.join(root, ...segments) is within root for every accepted input`, () => {
      const biased = fc.oneof(
        anyString,
        fc
          .tuple(fc.array(safeSegment, { minLength: 1, maxLength: 8 }), separatorList)
          .map(([segments, separators]) => joinWithSeparators(segments, separators)),
      );
      fc.assert(
        fc.property(biased, (input) => {
          const result = parseWorkspaceRelativePath(input);
          if (!result.ok) {
            return;
          }
          const joined = flavor.join(root, ...result.value.segments);
          expect(isWithinRoot(root, joined, flavor)).toBe(true);
          expect(toWorkspaceRelative(root, joined, flavor)).toBe(result.value.posixPath);
          expect(joined === root).toBe(result.value.segments.length === 0);
        }),
        runs(1000),
      );
    });
  }
});

// ---------------------------------------------------------------------------------------------
// isWithinRoot
// ---------------------------------------------------------------------------------------------

/** Characters for canonical root segments; '.' allowed inside names but never a whole segment. */
const ROOT_SEGMENT_CHARS = ['a', 'B', 'c', 'D', 'z', '0', '-', '_', ' ', '\u00e9', '\u00d6', '.'];

const rootSegment = fc
  .string({ unit: fc.constantFrom(...ROOT_SEGMENT_CHARS), minLength: 1, maxLength: 6 })
  .filter((segment) => segment !== '.' && segment !== '..');

/** Tiny alphabet so generated paths share prefixes often (sibling/prefix collisions). */
const tinySegment = fc.constantFrom('a', 'ab', 'A', 'b', 'a b', 'a.b');

function canonicalPathArb(
  name: FlavorCase['name'],
  segment: fc.Arbitrary<string>,
  minDepth: number,
): fc.Arbitrary<string> {
  const segments = fc.array(segment, { minLength: minDepth, maxLength: 4 });
  if (name === 'win32') {
    return fc
      .tuple(fc.constantFrom('C', 'D', 'Z'), segments)
      .map(([drive, parts]) => `${drive}:\\${parts.join('\\')}`);
  }
  return segments.map((parts) => `/${parts.join('/')}`);
}

function swapCase(value: string): string {
  return Array.from(value)
    .map((char) => {
      const upper = char.toUpperCase();
      return upper === char ? char.toLowerCase() : upper;
    })
    .join('');
}

describe('#49 properties: isWithinRoot canonical segment containment', () => {
  for (const { name, flavor } of FLAVORS) {
    const sep = flavor.sep;
    const roots = canonicalPathArb(name, rootSegment, 1);
    const descendantSegments = fc.array(rootSegment, { maxLength: 5 });
    const nonSeparatorChars =
      name === 'win32'
        ? fc.constantFrom('a', '-', '_', '.', ' ', 'X', '0', ':', '\u00e9', '~')
        : fc.constantFrom('a', '-', '_', '.', ' ', 'X', '0', ':', '\u00e9', '~', '\\');
    const suffix = fc.string({ unit: nonSeparatorChars, minLength: 1, maxLength: 6 });

    it(`#49 [${name}] reflexive, and join(root, ...safe) is always within root`, () => {
      fc.assert(
        fc.property(roots, descendantSegments, (root, segments) => {
          expect(isWithinRoot(root, root, flavor)).toBe(true);
          expect(isWithinRoot(root, flavor.join(root, ...segments), flavor)).toBe(true);
          if (segments.length > 0) {
            expect(isWithinRoot(root, root + sep + segments.join(sep), flavor)).toBe(true);
          }
        }),
        runs(1000),
      );
    });

    it(`#49 [${name}] sibling-prefix roots (root + suffix) are never within root, nor root in them`, () => {
      fc.assert(
        fc.property(roots, suffix, descendantSegments, (root, extra, segments) => {
          const sibling = root + extra;
          expect(isWithinRoot(root, sibling, flavor)).toBe(false);
          expect(isWithinRoot(sibling, root, flavor)).toBe(false);
          expect(isWithinRoot(root, flavor.join(sibling, ...segments), flavor)).toBe(false);
        }),
        runs(1000),
      );
    });

    it(`#49 [${name}] no proper ancestor of root is within root`, () => {
      fc.assert(
        fc.property(roots, (root) => {
          let ancestor = flavor.dirname(root);
          expect(ancestor).not.toBe(root);
          for (;;) {
            expect(isWithinRoot(root, ancestor, flavor)).toBe(false);
            const next = flavor.dirname(ancestor);
            if (next === ancestor) {
              break;
            }
            ancestor = next;
          }
        }),
        runs(500),
      );
    });

    it(`#49 [${name}] changing the case of any root segment makes it not within (case-sensitive)`, () => {
      fc.assert(
        fc.property(
          roots,
          fc.nat(),
          fc.constantFrom('upper', 'lower', 'swap'),
          descendantSegments,
          (root, pick, mode, segments) => {
            const parts = root.split(sep);
            // posix: parts[0] is '' (the '/' root); win32: parts[0] is the drive 'C:'.
            const first = name === 'posix' ? 1 : 0;
            const index = first + (pick % (parts.length - first));
            const original = parts[index] ?? '';
            const changed =
              mode === 'upper'
                ? original.toUpperCase()
                : mode === 'lower'
                  ? original.toLowerCase()
                  : swapCase(original);
            const variant = [...parts.slice(0, index), changed, ...parts.slice(index + 1)].join(
              sep,
            );
            if (variant === root) {
              return;
            }
            expect(isWithinRoot(root, variant, flavor)).toBe(false);
            expect(isWithinRoot(root, flavor.join(variant, ...segments), flavor)).toBe(false);
            expect(isWithinRoot(variant, root, flavor)).toBe(false);
          },
        ),
        runs(1000),
      );
    });

    it(`#49 [${name}] candidates with remaining "." / ".." segments or relative paths are never within`, () => {
      fc.assert(
        fc.property(
          roots,
          descendantSegments,
          fc.constantFrom('.', '..'),
          descendantSegments,
          (root, before, dot, after) => {
            const dotted = root + sep + [...before, dot, ...after].join(sep);
            expect(isWithinRoot(root, dotted, flavor)).toBe(false);
            const relative = [...before, ...after].join(sep);
            if (relative !== '') {
              expect(isWithinRoot(root, relative, flavor)).toBe(false);
              expect(isWithinRoot(relative, root + sep + relative, flavor)).toBe(false);
            }
          },
        ),
        runs(1000),
      );
    });

    it(`#49 [${name}] equals the "root or root+sep prefix" oracle; antisymmetric and transitive`, () => {
      const paths = canonicalPathArb(name, tinySegment, 1);
      fc.assert(
        fc.property(paths, paths, paths, (a, b, c) => {
          const oracle = (r: string, x: string): boolean => x === r || x.startsWith(r + sep);
          expect(isWithinRoot(a, b, flavor)).toBe(oracle(a, b));
          if (isWithinRoot(a, b, flavor) && isWithinRoot(b, a, flavor)) {
            expect(a).toBe(b);
          }
          if (isWithinRoot(a, b, flavor) && isWithinRoot(b, c, flavor)) {
            expect(isWithinRoot(a, c, flavor)).toBe(true);
          }
        }),
        runs(1000),
      );
    });
  }

  it('#49 regression: [win32] ".." segments separated by "/" are still "remaining .. segments" (never within)', () => {
    // On win32 '/' is a path separator: 'C:\\ws\\proj\\../x' resolves to 'C:\\ws\\x'. README:
    // "Paths with remaining ./.. segments ... are never within". Not reachable through
    // resolveWorkspacePath today (it passes path.join/realpath output), so this is
    // defence-in-depth for the pure helper.
    const win = path.win32;
    const roots = canonicalPathArb('win32', rootSegment, 1);
    fc.assert(
      fc.property(
        roots,
        fc.array(rootSegment, { maxLength: 3 }),
        fc.array(fc.oneof(rootSegment, fc.constant('..')), { maxLength: 3 }),
        (root, before, after) => {
          const tail = [...before, '..', ...after].join('/');
          const candidate = `${root}\\${tail}`;
          expect(isWithinRoot(root, candidate, win)).toBe(false);
        },
      ),
      runs(500),
    );
  });
});

// ---------------------------------------------------------------------------------------------
// Filesystem property: random trees with links and hardlinks
// ---------------------------------------------------------------------------------------------

const IS_WINDOWS = process.platform === 'win32';
const DIR_LINK_TYPE: 'junction' | 'dir' = IS_WINDOWS ? 'junction' : 'dir';
const INTENTS: readonly AccessIntent[] = ['read', 'list', 'write'];

const trackedTempDirs: string[] = [];

/** Fresh fixture directory; returns its canonical path. */
function makeTempDir(): { raw: string; canonical: string } {
  const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'ws49-'));
  trackedTempDirs.push(raw);
  return { raw, canonical: fs.realpathSync.native(raw) };
}

function removeTempDir(raw: string): void {
  fs.rmSync(raw, { recursive: true, force: true });
  const index = trackedTempDirs.indexOf(raw);
  if (index !== -1) {
    trackedTempDirs.splice(index, 1);
  }
}

afterEach(() => {
  for (const raw of trackedTempDirs.splice(0)) {
    fs.rmSync(raw, { recursive: true, force: true });
  }
});

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
}

/** Creates a link; `false` when this machine cannot (EPERM/EACCES), rethrows anything else. */
function tryLink(target: string, linkPath: string, type: 'junction' | 'dir' | 'file'): boolean {
  try {
    fs.symlinkSync(target, linkPath, type);
    return true;
  } catch (error) {
    const code = errorCode(error);
    if (code === 'EPERM' || code === 'EACCES') {
      return false;
    }
    throw error;
  }
}

function entryExists(target: string): boolean {
  try {
    fs.lstatSync(target);
    return true;
  } catch {
    return false;
  }
}

let dirLinksSupported = false;
let fileLinksSupported = false;

beforeAll(() => {
  const { raw, canonical } = makeTempDir();
  try {
    fs.mkdirSync(path.join(canonical, 'target'));
    fs.writeFileSync(path.join(canonical, 'target.txt'), 'probe');
    dirLinksSupported = tryLink(
      path.join(canonical, 'target'),
      path.join(canonical, 'dir-link'),
      DIR_LINK_TYPE,
    );
    fileLinksSupported = tryLink(
      path.join(canonical, 'target.txt'),
      path.join(canonical, 'file-link'),
      'file',
    );
  } finally {
    removeTempDir(raw);
  }
});

const DIR_NAMES = ['a', 'b', 'Docs', 'x y', '\u00e9'] as const;
const FILE_NAMES = ['f.txt', 'g.md', '\uff5e', 'h\ufffd'] as const;
const LINK_NAMES = ['L1', 'L2', 'L3'] as const;
const HARDLINK_NAMES = ['H1.txt', 'H2.txt'] as const;
const LINK_TARGETS = [
  'wsRoot',
  'insideDir',
  'outsideDir',
  'siblingPrefixDir',
  'parentDir',
  'danglingDir',
  'selfLoop',
  'insideFile',
  'outsideFile',
] as const;
type LinkTarget = (typeof LINK_TARGETS)[number];

interface LinkSpec {
  readonly parent: number;
  readonly name: string;
  readonly target: LinkTarget;
  readonly targetIndex: number;
  readonly relative: boolean;
}

interface TreeSpec {
  readonly dirs: readonly (readonly string[])[];
  readonly files: readonly { readonly parent: number; readonly name: string }[];
  readonly hardlinks: readonly {
    readonly parent: number;
    readonly name: string;
    readonly fromOutside: boolean;
    readonly sourceIndex: number;
  }[];
  readonly links: readonly LinkSpec[];
}

const treeArb: fc.Arbitrary<TreeSpec> = fc.record({
  dirs: fc.array(fc.array(fc.constantFrom(...DIR_NAMES), { minLength: 1, maxLength: 2 }), {
    maxLength: 4,
  }),
  files: fc.array(fc.record({ parent: fc.nat(8), name: fc.constantFrom(...FILE_NAMES) }), {
    maxLength: 6,
  }),
  hardlinks: fc.array(
    fc.record({
      parent: fc.nat(8),
      name: fc.constantFrom(...HARDLINK_NAMES),
      fromOutside: fc.boolean(),
      sourceIndex: fc.nat(8),
    }),
    { maxLength: 2 },
  ),
  links: fc.array(
    fc.record({
      parent: fc.nat(8),
      name: fc.constantFrom(...LINK_NAMES),
      // Inside targets are weighted up so reads/lists through in-root links are common.
      target: fc.oneof(
        { arbitrary: fc.constantFrom<LinkTarget>('wsRoot', 'insideDir', 'insideFile'), weight: 2 },
        { arbitrary: fc.constantFrom(...LINK_TARGETS), weight: 1 },
      ),
      targetIndex: fc.nat(8),
      relative: fc.boolean(),
    }),
    { maxLength: 3 },
  ),
});

/** Request tokens: generated names, case/encoding near-misses, and traversal/outside names. */
const EXISTING_TOKENS = [...DIR_NAMES, ...FILE_NAMES, ...LINK_NAMES, ...HARDLINK_NAMES] as const;
const HOSTILE_TOKENS = [
  '..',
  '.',
  '',
  'docs',
  'DOCS',
  'F.TXT',
  'h\ud800', // lone surrogate: the OS sees 'h\ufffd'
  'ws',
  'ws-evil',
  'outside',
  'secret.txt',
  'evil.txt',
  'top.txt',
] as const;

const requestArb = fc
  .array(
    fc.tuple(
      fc.oneof(
        { arbitrary: fc.constantFrom(...EXISTING_TOKENS), weight: 4 },
        { arbitrary: fc.constantFrom(...HOSTILE_TOKENS), weight: 1 },
      ),
      fc.constantFrom('/', '\\'),
    ),
    { minLength: 1, maxLength: 5 },
  )
  .map((parts) => parts.map(([token, sep], index) => (index === 0 ? token : sep + token)).join(''));

/**
 * A request is either fully random (`requestArb`) or anchored on an entry that really exists in
 * the generated tree (dir, file, hardlink or link), optionally extended by a tail of tokens so
 * paths through links (`L1/f.txt`) and below files (`f.txt/x`) are exercised often.
 */
type RequestSpec =
  | { readonly kind: 'raw'; readonly request: string }
  | {
      readonly kind: 'anchored';
      readonly index: number;
      readonly tail: readonly string[];
      readonly backslashes: boolean;
    };

const requestSpecArb: fc.Arbitrary<RequestSpec> = fc.oneof(
  {
    weight: 3,
    arbitrary: fc.record({
      kind: fc.constant('anchored' as const),
      index: fc.nat(64),
      tail: fc.array(
        fc.oneof(
          { arbitrary: fc.constantFrom(...EXISTING_TOKENS), weight: 4 },
          { arbitrary: fc.constantFrom(...HOSTILE_TOKENS), weight: 1 },
        ),
        { maxLength: 2 },
      ),
      backslashes: fc.boolean(),
    }),
  },
  { weight: 1, arbitrary: requestArb.map((request) => ({ kind: 'raw' as const, request })) },
);

function materializeRequest(spec: RequestSpec, entries: readonly string[]): string {
  if (spec.kind === 'raw') {
    return spec.request;
  }
  const anchor = pick(entries, spec.index) ?? '.';
  const joined = [anchor, ...spec.tail].join('/');
  return spec.backslashes ? joined.replaceAll('/', '\\') : joined;
}

interface Fixture {
  /** Canonical per-run temp directory (parent of the workspace). */
  readonly base: string;
  /** Canonical workspace directory. */
  readonly ws: string;
  /** Workspace-relative posix paths of regular files created by name (no links on the path). */
  readonly plainFiles: readonly string[];
  /** Workspace-relative posix paths of every entry created (dirs, files, hardlinks, links). */
  readonly entries: readonly string[];
  readonly linksCreated: number;
}

function pick<T>(items: readonly T[], index: number): T | undefined {
  return items.length === 0 ? undefined : items[index % items.length];
}

/** Materializes a TreeSpec under `base`. Every link target is inside `base`. */
function buildFixture(base: string, spec: TreeSpec): Fixture {
  const ws = path.join(base, 'ws');
  const outside = path.join(base, 'outside');
  const sibling = path.join(base, 'ws-evil');
  fs.mkdirSync(ws);
  fs.mkdirSync(outside);
  fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'outside fixture (not a secret)');
  fs.writeFileSync(path.join(sibling, 'evil.txt'), 'sibling-prefix fixture');
  fs.writeFileSync(path.join(base, 'top.txt'), 'parent fixture');

  const dirs: (readonly string[])[] = [[]];
  for (const parts of spec.dirs) {
    if (!dirs.some((known) => known.join('/') === parts.join('/'))) {
      fs.mkdirSync(path.join(ws, ...parts), { recursive: true });
      dirs.push(parts);
    }
  }

  const files: string[] = [];
  for (const file of spec.files) {
    const parent = pick(dirs, file.parent) ?? [];
    const target = path.join(ws, ...parent, file.name);
    if (!entryExists(target)) {
      fs.writeFileSync(target, `file ${file.name}`);
      files.push([...parent, file.name].join('/'));
    }
  }

  const hardlinks: string[] = [];
  for (const hardlink of spec.hardlinks) {
    const parent = pick(dirs, hardlink.parent) ?? [];
    const destination = path.join(ws, ...parent, hardlink.name);
    const insideSource = pick(files, hardlink.sourceIndex);
    const source =
      hardlink.fromOutside || insideSource === undefined
        ? path.join(outside, 'secret.txt')
        : path.join(ws, ...insideSource.split('/'));
    if (!entryExists(destination)) {
      fs.linkSync(source, destination);
      hardlinks.push([...parent, hardlink.name].join('/'));
    }
  }

  const links: string[] = [];
  spec.links.forEach((link, linkIndex) => {
    const parent = pick(dirs, link.parent) ?? [];
    const linkPath = path.join(ws, ...parent, link.name);
    if (entryExists(linkPath)) {
      return;
    }
    let target: string;
    let type: 'junction' | 'dir' | 'file' = DIR_LINK_TYPE;
    let removeAfter: string | undefined;
    switch (link.target) {
      case 'wsRoot':
        target = ws;
        break;
      case 'insideDir':
        target = path.join(ws, ...(pick(dirs, link.targetIndex) ?? []));
        break;
      case 'outsideDir':
        target = outside;
        break;
      case 'siblingPrefixDir':
        target = sibling;
        break;
      case 'parentDir':
        target = base;
        break;
      case 'danglingDir':
        target = path.join(base, `gone-${linkIndex}`);
        fs.mkdirSync(target);
        removeAfter = target;
        break;
      case 'selfLoop':
        target = linkPath;
        break;
      case 'insideFile': {
        const file = pick(files, link.targetIndex);
        if (file === undefined) {
          return;
        }
        target = path.join(ws, ...file.split('/'));
        type = 'file';
        break;
      }
      case 'outsideFile':
        target = path.join(outside, 'secret.txt');
        type = 'file';
        break;
    }
    const supported = type === 'file' ? fileLinksSupported : dirLinksSupported;
    if (!supported) {
      if (removeAfter !== undefined) {
        fs.rmdirSync(removeAfter);
      }
      return;
    }
    // Junctions always store absolute targets; symlinks may be relative on POSIX.
    const linkTarget =
      link.relative && type !== 'junction' ? path.relative(path.dirname(linkPath), target) : target;
    if (tryLink(linkTarget === '' ? '.' : linkTarget, linkPath, type)) {
      links.push([...parent, link.name].join('/'));
    }
    if (removeAfter !== undefined) {
      fs.rmdirSync(removeAfter);
    }
  });

  const entries = [...dirs.map((parts) => parts.join('/')), ...files, ...hardlinks, ...links].map(
    (entry) => (entry === '' ? '.' : entry),
  );
  return { base, ws, plainFiles: files, entries, linksCreated: links.length };
}

/** Independent lstat walk: does any component of root/...segments exist as a link? */
function lexicalPathHasLink(ws: string, segments: readonly string[]): boolean {
  let prefix = ws;
  for (const segment of segments) {
    prefix = path.join(prefix, segment);
    try {
      if (fs.lstatSync(prefix).isSymbolicLink()) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

/** All invariants for one resolveWorkspacePath outcome (README "Filesystem resolution"). */
async function checkResolution(
  root: WorkspaceRoot,
  fixture: Fixture,
  request: string,
  intent: AccessIntent,
  result: PolicyResult<ResolvedWorkspacePath>,
): Promise<void> {
  expectWellFormedResult(result);
  if (!result.ok) {
    expect(result.error.message).not.toContain(fixture.base);
    return;
  }
  const value = result.value;
  const parsed = parseWorkspaceRelativePath(request);
  expect(parsed.ok).toBe(true);
  const segments = parsed.ok ? parsed.value.segments : [];

  // Containment of the real on-disk object, checked with the OS resolver, not the policy's.
  const real = fs.realpathSync.native(value.canonicalPath);
  expect(real).toBe(value.canonicalPath);
  expect(isWithinRoot(fixture.ws, real)).toBe(true);
  expect(path.join(fixture.ws, ...value.relativePath.split('/'))).toBe(value.canonicalPath);
  expect(value.intent).toBe(intent);

  const stats = fs.lstatSync(value.canonicalPath, { bigint: true });
  expect(value.identity).toEqual({ dev: stats.dev, ino: stats.ino });
  if (intent === 'list') {
    expect(value.kind).toBe('directory');
    expect(stats.isDirectory()).toBe(true);
  } else {
    expect(value.kind).toBe('file');
    expect(stats.isFile()).toBe(true);
    expect(fs.statSync(value.canonicalPath).nlink).toBe(1);
    expect(value.sizeBytes).toBe(stats.size);
  }

  // followedLink is truthful, and write never follows a link.
  expect(value.followedLink).toBe(lexicalPathHasLink(fixture.ws, segments));
  if (intent === 'write') {
    expect(value.followedLink).toBe(false);
  }
  if (!value.followedLink && parsed.ok) {
    // README step 5: with no link, the canonical name equals the joined request exactly.
    expect(value.relativePath).toBe(parsed.value.posixPath);
  }

  // Apply-time re-check on an unchanged tree returns the same object.
  const again = await revalidateResolvedPath(root, value);
  expectWellFormedResult(again);
  expect(again.ok ? again.value.canonicalPath : again.error.code).toBe(value.canonicalPath);
}

const rawRequest = (request: string): RequestSpec => ({ kind: 'raw', request });

/**
 * Hand-written trees that fast-check runs before the random ones, so every link kind and the
 * through-link / hardlink / case-alias / lone-surrogate paths are exercised on every run.
 * Directory indices: 0 = root, then `dirs` in order.
 */
const FS_EXAMPLES: [TreeSpec, RequestSpec[]][] = [
  [
    {
      dirs: [['a'], ['a', 'b'], ['Docs']],
      files: [
        { parent: 0, name: 'f.txt' },
        { parent: 1, name: 'g.md' },
        { parent: 2, name: 'h�' },
        { parent: 3, name: 'f.txt' },
      ],
      hardlinks: [
        { parent: 0, name: 'H1.txt', fromOutside: true, sourceIndex: 0 },
        { parent: 1, name: 'H2.txt', fromOutside: false, sourceIndex: 3 },
      ],
      links: [
        { parent: 0, name: 'L1', target: 'insideDir', targetIndex: 1, relative: true },
        { parent: 1, name: 'L2', target: 'outsideDir', targetIndex: 0, relative: false },
        { parent: 2, name: 'L3', target: 'siblingPrefixDir', targetIndex: 0, relative: true },
      ],
    },
    [
      rawRequest('f.txt'),
      rawRequest('L1/g.md'),
      rawRequest('L1'),
      rawRequest('L1\\b\\h�'),
      rawRequest('a/L2/secret.txt'),
      rawRequest('a/L2'),
      rawRequest('a/b/L3/evil.txt'),
      rawRequest('H1.txt'),
      rawRequest('a/H2.txt'),
      rawRequest('Docs/f.txt'),
      rawRequest('docs/f.txt'),
      rawRequest('a/b/h\ud800'),
      rawRequest('.'),
      rawRequest('a\\..\\..\\outside\\secret.txt'),
    ],
  ],
  [
    {
      dirs: [['a'], ['x y']],
      files: [
        { parent: 0, name: 'g.md' },
        { parent: 1, name: 'f.txt' },
      ],
      hardlinks: [],
      links: [
        { parent: 0, name: 'L1', target: 'wsRoot', targetIndex: 0, relative: false },
        { parent: 1, name: 'L2', target: 'parentDir', targetIndex: 0, relative: true },
        { parent: 2, name: 'L3', target: 'danglingDir', targetIndex: 0, relative: false },
      ],
    },
    [
      rawRequest('L1/g.md'),
      rawRequest('L1/L1/a/f.txt'),
      rawRequest('L1/a'),
      rawRequest('a/L2/top.txt'),
      rawRequest('a/L2/ws/g.md'),
      rawRequest('x y/L3'),
      rawRequest('x y/L3/f.txt'),
    ],
  ],
  [
    {
      dirs: [['b']],
      files: [{ parent: 1, name: 'f.txt' }],
      hardlinks: [],
      links: [
        { parent: 0, name: 'L1', target: 'selfLoop', targetIndex: 0, relative: true },
        { parent: 1, name: 'L2', target: 'insideFile', targetIndex: 0, relative: true },
        { parent: 0, name: 'L3', target: 'outsideFile', targetIndex: 0, relative: false },
      ],
    },
    [
      rawRequest('L1'),
      rawRequest('L1/f.txt'),
      rawRequest('b/L2'),
      rawRequest('L3'),
      rawRequest('b/f.txt'),
      rawRequest('b'),
    ],
  ],
];

describe('#49 properties: resolveWorkspacePath over random trees (filesystem)', () => {
  it(
    '#49 every ok result is inside the canonical root, single-link files only, no link on write',
    { timeout: 240_000 },
    async () => {
      let runsWithLinks = 0;
      const outcomes = new Map<string, number>();
      await fc.assert(
        fc.asyncProperty(
          treeArb,
          fc.array(requestSpecArb, { minLength: 1, maxLength: 10 }),
          async (tree, requestSpecs) => {
            const { raw, canonical: base } = makeTempDir();
            try {
              const fixture = buildFixture(base, tree);
              if (fixture.linksCreated > 0) {
                runsWithLinks += 1;
              }
              const opened = await openWorkspaceRoot(fixture.ws);
              expect(opened.ok).toBe(true);
              if (!opened.ok) {
                return;
              }
              const root = opened.value;
              expect(root.canonicalPath).toBe(fixture.ws);
              expect(fs.realpathSync.native(fixture.ws)).toBe(fixture.ws);

              for (const spec of requestSpecs) {
                const request = materializeRequest(spec, fixture.entries);
                for (const intent of INTENTS) {
                  const result = await resolveWorkspacePath(root, request, intent);
                  await checkResolution(root, fixture, request, intent, result);
                  const outcome = result.ok
                    ? `${intent}:ok${result.value.followedLink ? '+link' : ''}`
                    : `${intent}:${result.error.code}`;
                  outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
                }
              }
            } finally {
              removeTempDir(raw);
            }
          },
        ),
        { ...runs(40), examples: FS_EXAMPLES },
      );
      // Guard against a vacuous run: the interesting outcomes must actually have occurred.
      const seen = (key: string): number => outcomes.get(key) ?? 0;
      for (const key of ['read:ok', 'list:ok', 'write:ok', 'read:HARDLINK_UNSUPPORTED']) {
        expect(seen(key), key).toBeGreaterThan(0);
      }
      if (dirLinksSupported) {
        expect(runsWithLinks).toBeGreaterThan(0);
        for (const key of [
          'read:ok+link',
          'list:ok+link',
          'read:LINK_ESCAPE',
          'list:LINK_ESCAPE',
          'write:LINK_NOT_ALLOWED',
        ]) {
          expect(seen(key), key).toBeGreaterThan(0);
        }
      }
    },
  );

  it(
    '#49 completeness: plain single-link files resolve for read/write, their folder for list',
    { timeout: 240_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(treeArb, fc.boolean(), async (tree, backslashes) => {
          const { raw, canonical: base } = makeTempDir();
          try {
            const fixture = buildFixture(base, tree);
            const opened = await openWorkspaceRoot(fixture.ws);
            expect(opened.ok).toBe(true);
            if (!opened.ok) {
              return;
            }
            for (const file of fixture.plainFiles) {
              const absolute = path.join(fixture.ws, ...file.split('/'));
              const request = backslashes ? file.replaceAll('/', '\\') : file;
              const single = fs.statSync(absolute).nlink === 1;
              for (const intent of ['read', 'write'] as const) {
                const result = await resolveWorkspacePath(opened.value, request, intent);
                if (single) {
                  expect(result.ok ? result.value.relativePath : result.error.code).toBe(file);
                } else {
                  expect(result.ok ? 'ok' : result.error.code).toBe('HARDLINK_UNSUPPORTED');
                }
              }
              const folder = file.split('/').slice(0, -1).join('/');
              const listed = await resolveWorkspacePath(
                opened.value,
                folder === '' ? '.' : folder,
                'list',
              );
              expect(listed.ok ? listed.value.relativePath : listed.error.code).toBe(folder);
            }
          } finally {
            removeTempDir(raw);
          }
        }),
        runs(30),
      );
    },
  );

  it(
    '#49 links leaving the root fail closed wherever they sit (LINK_ESCAPE / LINK_NOT_ALLOWED)',
    { timeout: 240_000 },
    async (ctx) => {
      if (!dirLinksSupported) {
        ctx.skip(`cannot create ${DIR_LINK_TYPE} links on this machine`);
      }
      const escapeTarget = fc.constantFrom('outsideDir', 'siblingPrefixDir', 'parentDir');
      const tail = fc.array(fc.constantFrom('secret.txt', 'evil.txt', 'ws', 'top.txt', 'a'), {
        maxLength: 2,
      });
      await fc.assert(
        fc.asyncProperty(
          treeArb,
          escapeTarget,
          fc.nat(8),
          tail,
          async (tree, target, parentIndex, tailSegments) => {
            const { raw, canonical: base } = makeTempDir();
            try {
              const escapeLink: LinkSpec = {
                parent: parentIndex,
                name: 'ESC',
                target,
                targetIndex: 0,
                relative: false,
              };
              const fixture = buildFixture(base, { ...tree, links: [escapeLink, ...tree.links] });
              expect(fixture.linksCreated).toBeGreaterThan(0);
              const opened = await openWorkspaceRoot(fixture.ws);
              expect(opened.ok).toBe(true);
              if (!opened.ok) {
                return;
              }
              const parentDirs = tree.dirs.filter(
                (parts, index, all) =>
                  all.findIndex((other) => other.join('/') === parts.join('/')) === index,
              );
              const parent = pick([[], ...parentDirs], parentIndex) ?? [];
              const request = [...parent, 'ESC', ...tailSegments].join('/');
              for (const intent of INTENTS) {
                const result = await resolveWorkspacePath(opened.value, request, intent);
                expect(result.ok ? 'ok' : result.error.code).toBe(
                  intent === 'write' ? 'LINK_NOT_ALLOWED' : 'LINK_ESCAPE',
                );
              }
            } finally {
              removeTempDir(raw);
            }
          },
        ),
        runs(40),
      );
    },
  );
});
