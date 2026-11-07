/**
 * #49 Workspace boundary — pure lexical layer.
 *
 * Covers `parseWorkspaceRelativePath` (README "Lexical rules") and `isWithinRoot` /
 * `toWorkspaceRelative` (README "Containment"). No filesystem access happens in this file.
 */
import path from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  isWithinRoot,
  toWorkspaceRelative,
  type PathFlavor,
} from '../../../src/main/workspace/containment';
import type { WorkspacePolicyCode } from '../../../src/main/workspace/policy-result';
import {
  MAX_RELATIVE_PATH_LENGTH,
  MAX_SEGMENT_LENGTH,
  parseWorkspaceRelativePath,
} from '../../../src/main/workspace/relative-path';

type RejectCase = [input: string, code: WorkspacePolicyCode];
type AcceptCase = [input: string, posixPath: string];
type ContainmentCase = [root: string, candidate: string, expected: boolean];

/** 'OK:<posixPath>' on success, the policy code otherwise: gives readable diffs either way. */
function outcomeOf(input: unknown): string {
  const result = parseWorkspaceRelativePath(input);
  return result.ok ? `OK:${result.value.posixPath}` : result.error.code;
}

function expectAccepted(input: string, posixPath: string): void {
  expect(parseWorkspaceRelativePath(input)).toEqual({
    ok: true,
    value: { segments: posixPath === '' ? [] : posixPath.split('/'), posixPath },
  });
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

const WIN32: PathFlavor = path.win32;
const POSIX: PathFlavor = path.posix;
const FLAVORS: [name: string, flavor: typeof path.win32, root: string][] = [
  ['win32', path.win32, 'C:\\Users\\dev\\ws'],
  ['posix', path.posix, '/home/dev/ws'],
];

// ---------------------------------------------------------------------------------------------
// parseWorkspaceRelativePath
// ---------------------------------------------------------------------------------------------

describe('#49 parseWorkspaceRelativePath: documented attack payloads', () => {
  const PAYLOADS: RejectCase[] = [
    ['../../../etc/passwd', 'TRAVERSAL'],
    ['..\\..\\..\\windows\\system32\\config', 'TRAVERSAL'],
    ['./../../.ssh/id_rsa', 'TRAVERSAL'],
    ['%2e%2e%2f%2e%2e%2f', 'ENCODED_TRAVERSAL'],
    ['....//....//etc/passwd', 'INVALID_SEGMENT'],
    ['/etc/passwd%00.ts', 'ABSOLUTE_PATH'],
    ['etc/passwd%00.ts', 'ENCODED_TRAVERSAL'],
    ['valid/../../../etc/passwd', 'TRAVERSAL'],
  ];

  it.each(PAYLOADS)('#49 rejects payload %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });
});

describe('#49 parseWorkspaceRelativePath: traversal segments', () => {
  const TRAVERSALS: RejectCase[] = [
    ['..', 'TRAVERSAL'],
    ['../', 'TRAVERSAL'],
    ['..\\', 'TRAVERSAL'],
    ['./..', 'TRAVERSAL'],
    ['.\\..\\x', 'TRAVERSAL'],
    ['a/..', 'TRAVERSAL'],
    ['a\\..', 'TRAVERSAL'],
    ['a/b/..', 'TRAVERSAL'],
    // Lexically lands back on the root, but any `..` segment is rejected (rule 4).
    ['src/..', 'TRAVERSAL'],
    ['src/../src/index.ts', 'TRAVERSAL'],
    ['a/b/c/../../../..', 'TRAVERSAL'],
    ['a/./../b', 'TRAVERSAL'],
    ['a\\.\\..\\b', 'TRAVERSAL'],
    // Mixed separators.
    ['src/..\\..\\secret', 'TRAVERSAL'],
    ['src\\../../secret', 'TRAVERSAL'],
    ['a/\\..\\/b', 'TRAVERSAL'],
    // Separator runs.
    ['a//..//b', 'TRAVERSAL'],
    ['a\\\\\\..\\\\\\b', 'TRAVERSAL'],
    ['..\\\\\\\\x', 'TRAVERSAL'],
    ['..////etc', 'TRAVERSAL'],
  ];

  it.each(TRAVERSALS)('#49 rejects %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });
});

describe('#49 parseWorkspaceRelativePath: absolute, rooted, UNC, device and drive forms', () => {
  const ABSOLUTES: RejectCase[] = [
    ['/', 'ABSOLUTE_PATH'],
    ['/x', 'ABSOLUTE_PATH'],
    ['/etc/passwd', 'ABSOLUTE_PATH'],
    ['/../../etc/passwd', 'ABSOLUTE_PATH'],
    ['//x', 'ABSOLUTE_PATH'],
    ['\\', 'ABSOLUTE_PATH'],
    ['\\x', 'ABSOLUTE_PATH'],
    ['\\Windows\\System32', 'ABSOLUTE_PATH'],
    ['\\..\\x', 'ABSOLUTE_PATH'],
    ['\\\\server\\share', 'ABSOLUTE_PATH'],
    ['\\\\server\\share\\ws\\a.ts', 'ABSOLUTE_PATH'],
    ['//server/share', 'ABSOLUTE_PATH'],
    ['\\\\?\\C:\\x', 'ABSOLUTE_PATH'],
    ['\\\\?\\UNC\\server\\share', 'ABSOLUTE_PATH'],
    ['\\\\.\\pipe\\x', 'ABSOLUTE_PATH'],
    ['\\\\.\\PhysicalDrive0', 'ABSOLUTE_PATH'],
    ['\\??\\C:\\x', 'ABSOLUTE_PATH'],
    ['//?/C:/x', 'ABSOLUTE_PATH'],
    ['//./pipe/x', 'ABSOLUTE_PATH'],
    ['C:\\x', 'ABSOLUTE_PATH'],
    ['C:/x', 'ABSOLUTE_PATH'],
    ['C:x', 'ABSOLUTE_PATH'],
    ['C:', 'ABSOLUTE_PATH'],
    ['c:', 'ABSOLUTE_PATH'],
    ['c:\\Windows\\win.ini', 'ABSOLUTE_PATH'],
    ['z:/', 'ABSOLUTE_PATH'],
    ['Z:..\\x', 'ABSOLUTE_PATH'],
    ['D:secret.txt', 'ABSOLUTE_PATH'],
  ];

  it.each(ABSOLUTES)('#49 rejects %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });

  it('#49 rejects every drive letter A-Z / a-z in absolute and drive-relative form', () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const misses: string[] = [];
    for (const letter of letters) {
      for (const rest of ['', '\\', '/', '\\x', '/x', 'x', 'x\\y']) {
        const input = `${letter}:${rest}`;
        if (outcomeOf(input) !== 'ABSOLUTE_PATH') {
          misses.push(input);
        }
      }
    }
    expect(misses).toEqual([]);
  });

  // Not a drive prefix, but the colon still makes the segment invalid (ADS / reserved char).
  const COLON_ELSEWHERE: RejectCase[] = [
    ['1:x', 'INVALID_SEGMENT'],
    ['CC:x', 'INVALID_SEGMENT'],
    ['ç:x', 'INVALID_SEGMENT'],
    ['src/C:/x', 'INVALID_SEGMENT'],
    ['src\\D:\\x', 'INVALID_SEGMENT'],
    ['./C:x', 'INVALID_SEGMENT'],
  ];

  it.each(COLON_ELSEWHERE)('#49 rejects non-leading drive-like %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });
});

describe('#49 parseWorkspaceRelativePath: percent encoding', () => {
  const ENCODED: RejectCase[] = [
    ['%2e%2e/x', 'ENCODED_TRAVERSAL'],
    ['%2E%2E/x', 'ENCODED_TRAVERSAL'],
    ['%2e%2E/secret', 'ENCODED_TRAVERSAL'],
    ['.%2e/x', 'ENCODED_TRAVERSAL'],
    ['%2e./x', 'ENCODED_TRAVERSAL'],
    ['a/%2e%2e/b', 'ENCODED_TRAVERSAL'],
    ['a%2fb', 'ENCODED_TRAVERSAL'],
    ['a%2Fb', 'ENCODED_TRAVERSAL'],
    ['..%2fetc', 'ENCODED_TRAVERSAL'],
    ['..%2Fetc%2Fpasswd', 'ENCODED_TRAVERSAL'],
    ['a%5cb', 'ENCODED_TRAVERSAL'],
    ['a%5Cb', 'ENCODED_TRAVERSAL'],
    ['..%5c..%5cwindows', 'ENCODED_TRAVERSAL'],
    ['C%3a/x', 'ENCODED_TRAVERSAL'],
    ['a%3Ab', 'ENCODED_TRAVERSAL'],
    ['file.txt%3astream', 'ENCODED_TRAVERSAL'],
    ['a%00.ts', 'ENCODED_TRAVERSAL'],
    ['%00', 'ENCODED_TRAVERSAL'],
    ['%25', 'ENCODED_TRAVERSAL'],
    ['%252e%252e', 'ENCODED_TRAVERSAL'],
    ['%252e%252e/x', 'ENCODED_TRAVERSAL'],
    ['%252E%252E%252F', 'ENCODED_TRAVERSAL'],
    ['%25252e', 'ENCODED_TRAVERSAL'],
  ];

  it.each(ENCODED)('#49 rejects %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });

  // Rule 3: other `%` text is a literal file name and is never decoded.
  const LITERAL_PERCENT: AcceptCase[] = [
    ['%41', '%41'],
    ['100%.txt', '100%.txt'],
    ['%zz', '%zz'],
    ['%', '%'],
    ['%2', '%2'],
    ['%2g', '%2g'],
    ['50%off/a.ts', '50%off/a.ts'],
    ['%c0%ae%c0%ae', '%c0%ae%c0%ae'],
    ['%u002e%u002e', '%u002e%u002e'],
  ];

  it.each(LITERAL_PERCENT)('#49 accepts %j literally as %j', (input, posixPath) => {
    expectAccepted(input, posixPath);
  });
});

describe('#49 parseWorkspaceRelativePath: Windows segment rules', () => {
  const TRAILING_DOT_OR_SPACE: RejectCase[] = [
    ['a.', 'INVALID_SEGMENT'],
    ['a ', 'INVALID_SEGMENT'],
    ['a..', 'INVALID_SEGMENT'],
    ['...', 'INVALID_SEGMENT'],
    ['....', 'INVALID_SEGMENT'],
    ['.. ', 'INVALID_SEGMENT'],
    ['. ', 'INVALID_SEGMENT'],
    [' ', 'INVALID_SEGMENT'],
    ['   ', 'INVALID_SEGMENT'],
    ['.git.', 'INVALID_SEGMENT'],
    ['src/index.ts.', 'INVALID_SEGMENT'],
    ['src/index.ts ', 'INVALID_SEGMENT'],
    ['dir./x.ts', 'INVALID_SEGMENT'],
    ['dir /x.ts', 'INVALID_SEGMENT'],
    ['a/ /b', 'INVALID_SEGMENT'],
    [' /etc/passwd', 'INVALID_SEGMENT'],
  ];

  const STREAMS_AND_WILDCARDS: RejectCase[] = [
    ['file.txt:stream', 'INVALID_SEGMENT'],
    ['file.txt::$DATA', 'INVALID_SEGMENT'],
    ['::$DATA', 'INVALID_SEGMENT'],
    ['dir:stream/x', 'INVALID_SEGMENT'],
    ['a?.ts', 'INVALID_SEGMENT'],
    ['?', 'INVALID_SEGMENT'],
    ['a*.ts', 'INVALID_SEGMENT'],
    ['*', 'INVALID_SEGMENT'],
    ['src/*/x.ts', 'INVALID_SEGMENT'],
    ['a<b', 'INVALID_SEGMENT'],
    ['a>b', 'INVALID_SEGMENT'],
    ['a"b', 'INVALID_SEGMENT'],
    ['a|b', 'INVALID_SEGMENT'],
  ];

  const DEVICE_NAMES: RejectCase[] = [
    ['CON', 'INVALID_SEGMENT'],
    ['con', 'INVALID_SEGMENT'],
    ['Con.txt', 'INVALID_SEGMENT'],
    ['NUL.tar.gz', 'INVALID_SEGMENT'],
    ['nul', 'INVALID_SEGMENT'],
    ['nul ', 'INVALID_SEGMENT'],
    ['CON   ', 'INVALID_SEGMENT'],
    ['PRN', 'INVALID_SEGMENT'],
    ['AUX', 'INVALID_SEGMENT'],
    ['aux.js', 'INVALID_SEGMENT'],
    ['COM0', 'INVALID_SEGMENT'],
    ['COM1', 'INVALID_SEGMENT'],
    ['com9.txt', 'INVALID_SEGMENT'],
    ['LPT0', 'INVALID_SEGMENT'],
    ['LPT1', 'INVALID_SEGMENT'],
    ['LPT9', 'INVALID_SEGMENT'],
    ['COM¹', 'INVALID_SEGMENT'],
    ['com²', 'INVALID_SEGMENT'],
    ['LPT³.txt', 'INVALID_SEGMENT'],
    ['CONIN$', 'INVALID_SEGMENT'],
    ['conout$', 'INVALID_SEGMENT'],
    ['CONOUT$.log', 'INVALID_SEGMENT'],
    ['src/con/x.ts', 'INVALID_SEGMENT'],
    ['src/AUX.ts', 'INVALID_SEGMENT'],
  ];

  it.each(TRAILING_DOT_OR_SPACE)('#49 rejects trailing dot/space %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });

  it.each(STREAMS_AND_WILDCARDS)('#49 rejects ADS/wildcard %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });

  it.each(DEVICE_NAMES)('#49 rejects DOS device name %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });

  // Win32 strips spaces between a device base name and its extension: on Windows 10,
  // `echo x> "nul .txt"` in cmd writes to the NUL device and creates no file. README rule 5
  // says device names are matched "with or without extension, ignoring trailing spaces".
  const DEVICE_NAME_SPACE_BEFORE_EXTENSION: RejectCase[] = [
    ['nul .txt', 'INVALID_SEGMENT'],
    ['CON .ts', 'INVALID_SEGMENT'],
    ['aux  .md', 'INVALID_SEGMENT'],
    ['COM1 .log', 'INVALID_SEGMENT'],
  ];

  it.each(DEVICE_NAME_SPACE_BEFORE_EXTENSION)(
    '#49 regression: rejects device name with spaces before the extension %j with %s',
    (input, code) => {
      expect(outcomeOf(input)).toBe(code);
    },
  );

  it('#49 segment length limit is 255 (MAX_SEGMENT_LENGTH)', () => {
    expect(MAX_SEGMENT_LENGTH).toBe(255);
    expectAccepted('a'.repeat(255), 'a'.repeat(255));
    expectAccepted(`dir/${'b'.repeat(255)}`, `dir/${'b'.repeat(255)}`);
    expect(outcomeOf('a'.repeat(256))).toBe('INVALID_SEGMENT');
    expect(outcomeOf(`dir/${'b'.repeat(256)}/x.ts`)).toBe('INVALID_SEGMENT');
  });

  it('#49 segment length counts UTF-16 code units (NTFS limit), not code points', () => {
    const emoji = '\u{1F600}';
    expectAccepted(emoji.repeat(127), emoji.repeat(127)); // 254 units
    expect(outcomeOf(emoji.repeat(128))).toBe('INVALID_SEGMENT'); // 256 units
  });
});

describe('#49 parseWorkspaceRelativePath: INVALID_INPUT (rule 1)', () => {
  const CONTROL: RejectCase[] = [
    ['', 'INVALID_INPUT'],
    ['\u0000', 'INVALID_INPUT'],
    ['a\u0000b', 'INVALID_INPUT'],
    ['src/index.ts\u0000.png', 'INVALID_INPUT'],
    ['\u001f', 'INVALID_INPUT'],
    ['a\u001fb', 'INVALID_INPUT'],
    ['a\u007fb', 'INVALID_INPUT'],
    ['a\u001bb', 'INVALID_INPUT'],
    ['a\tb', 'INVALID_INPUT'],
    ['a\nb', 'INVALID_INPUT'],
    ['a\rb', 'INVALID_INPUT'],
    ['src/\n', 'INVALID_INPUT'],
  ];

  it.each(CONTROL)('#49 rejects %j with %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });

  const NON_STRINGS: [label: string, value: unknown][] = [
    ['undefined', undefined],
    ['null', null],
    ['number 42', 42],
    ['number 0', 0],
    ['boolean true', true],
    ['plain object {}', {}],
    ["array ['a']", ['a']],
    ['boxed String', Object('a')],
    ['symbol', Symbol('a')],
    ['bigint', 1n],
    ['function', () => 'a'],
    ['object with toString', { toString: () => 'src/index.ts' }],
  ];

  it.each(NON_STRINGS)('#49 rejects non-string input (%s) with INVALID_INPUT', (_label, value) => {
    expect(outcomeOf(value)).toBe('INVALID_INPUT');
  });

  it('#49 total length limit is 4096 (MAX_RELATIVE_PATH_LENGTH)', () => {
    expect(MAX_RELATIVE_PATH_LENGTH).toBe(4096);

    const atLimit = 'abcdefg/'.repeat(512);
    expect(atLimit).toHaveLength(4096);
    expectAccepted(atLimit, Array<string>(512).fill('abcdefg').join('/'));

    const manySegments = 'a/'.repeat(2048);
    expect(manySegments).toHaveLength(4096);
    expectAccepted(manySegments, Array<string>(2048).fill('a').join('/'));

    expect(outcomeOf(`x${atLimit}`)).toBe('INVALID_INPUT');
    expect(outcomeOf(`${manySegments}a`)).toBe('INVALID_INPUT');
  });

  it('#49 the length limit is checked before absolute/traversal rules', () => {
    const traversalAtLimit = `${'../'.repeat(1365)}x`;
    expect(traversalAtLimit).toHaveLength(4096);
    expect(outcomeOf(traversalAtLimit)).toBe('TRAVERSAL');
    expect(outcomeOf(`${traversalAtLimit}y`)).toBe('INVALID_INPUT');
    expect(outcomeOf('/'.repeat(4097))).toBe('INVALID_INPUT');
    expect(outcomeOf(`C:${'\\a'.repeat(2048)}`)).toBe('INVALID_INPUT');
  });
});

describe('#49 parseWorkspaceRelativePath: rule precedence follows the README order', () => {
  const PRECEDENCE: RejectCase[] = [
    // 1 before 2/3/4
    ['/etc/passwd\u0000', 'INVALID_INPUT'],
    ['\u0000/..', 'INVALID_INPUT'],
    ['%2e%2e\n', 'INVALID_INPUT'],
    ['C:\\x\u007f', 'INVALID_INPUT'],
    // 2 before 3/4/5
    ['/%2e%2e', 'ABSOLUTE_PATH'],
    ['C:%2e%2e', 'ABSOLUTE_PATH'],
    ['\\\\..\\..', 'ABSOLUTE_PATH'],
    ['C:..\\..\\x', 'ABSOLUTE_PATH'],
    ['/CON', 'ABSOLUTE_PATH'],
    // 3 before 4/5
    ['../%2e%2e', 'ENCODED_TRAVERSAL'],
    ['../x%2fy', 'ENCODED_TRAVERSAL'],
    ['CON/%2e', 'ENCODED_TRAVERSAL'],
    ['a./%5c', 'ENCODED_TRAVERSAL'],
    // 4 when the `..` segment comes first
    ['../CON', 'TRAVERSAL'],
    ['../a.', 'TRAVERSAL'],
    ['..\\x:y', 'TRAVERSAL'],
  ];

  it.each(PRECEDENCE)('#49 classifies %j as %s', (input, code) => {
    expect(outcomeOf(input)).toBe(code);
  });

  // README lists rule 4 (`..`) before rule 5 (segment syntax) but does not say whether rule 4
  // is applied to all segments first. Either code is a fail-closed rejection.
  it.each(['CON/..', 'a./../x', 'ab:c/../z', `${'a'.repeat(256)}/..`])(
    '#49 rejects invalid-segment-then-traversal %j (TRAVERSAL or INVALID_SEGMENT)',
    (input) => {
      expect(['TRAVERSAL', 'INVALID_SEGMENT']).toContain(outcomeOf(input));
    },
  );
});

describe('#49 parseWorkspaceRelativePath: accepted inputs and their normalized form', () => {
  const ACCEPTED: AcceptCase[] = [
    ['src/index.ts', 'src/index.ts'],
    ['src\\index.ts', 'src/index.ts'],
    ['./src//a.ts', 'src/a.ts'],
    ['a/b/', 'a/b'],
    ['a\\b\\', 'a/b'],
    ['a/./b', 'a/b'],
    ['./a', 'a'],
    ['a\\\\\\b', 'a/b'],
    ['a//\\\\//b', 'a/b'],
    ['src\\main/workspace\\x.ts', 'src/main/workspace/x.ts'],
    // Only a *leading* separator is absolute; after `./` the rest stays workspace-relative.
    ['.//etc/passwd', 'etc/passwd'],
    // The workspace root itself.
    ['.', ''],
    ['./', ''],
    ['.\\', ''],
    ['./././', ''],
    ['.//.\\\\.', ''],
    // Unicode and dot-files.
    ['çalışma/ü.ts', 'çalışma/ü.ts'],
    ['日本語/ファイル.md', '日本語/ファイル.md'],
    ['.gitignore', '.gitignore'],
    ['.github/x.yml', '.github/x.yml'],
    ['.github\\workflows\\ci.yml', '.github/workflows/ci.yml'],
    // Dots that are not a whole `.`/`..` segment and do not end the segment.
    ['...a', '...a'],
    ['a..b', 'a..b'],
    ['..a', '..a'],
    ['a.b.c.ts', 'a.b.c.ts'],
    // Names that merely start like a device name.
    ['CONSOLE.ts', 'CONSOLE.ts'],
    ['com10', 'com10'],
    ['LPT10.txt', 'LPT10.txt'],
    ['aux1.ts', 'aux1.ts'],
    ['CONIN', 'CONIN'],
    ['nul_.ts', 'nul_.ts'],
    ['xcon', 'xcon'],
    ['con-fig/x.ts', 'con-fig/x.ts'],
    ['COM⁴', 'COM⁴'],
    // 8.3 aliases are lexically ordinary; the filesystem layer rejects them (NON_CANONICAL_PATH).
    ['PROGRA~1/x', 'PROGRA~1/x'],
    // Shell syntax has no meaning here.
    ['~/x', '~/x'],
    ['$HOME/x', '$HOME/x'],
    ['-rf', '-rf'],
    ['a b/c d.ts', 'a b/c d.ts'],
    [' leading-space', ' leading-space'],
    ['C', 'C'],
  ];

  it.each(ACCEPTED)('#49 accepts %j as %j', (input, posixPath) => {
    expectAccepted(input, posixPath);
  });

  const LOOK_ALIKES: [label: string, input: string][] = [
    ['U+FF0E fullwidth full stop x2', '\uFF0E\uFF0E'],
    ['U+2024 one dot leader x2', '\u2024\u2024'],
    ['U+2025 two dot leader', '\u2025'],
    ['U+FE52 small full stop x2', '\uFE52\uFE52'],
    ['U+FF0F fullwidth solidus', 'a\uFF0Fb'],
    ['U+2215 division slash', 'a\u2215b'],
    ['U+FF3C fullwidth reverse solidus', 'a\uFF3Cb'],
    ['U+29F5 reverse solidus operator', 'a\u29F5b'],
    ['U+FF1A fullwidth colon', 'C\uFF1Ax'],
    ['fullwidth "..／etc／passwd"', '\uFF0E\uFF0E\uFF0Fetc\uFF0Fpasswd'],
    ['dot leaders + division slash', '\u2024\u2024\u2215\u2024\u2024\u2215etc'],
    ['ASCII ".." + fullwidth solidus', '..\uFF0Fetc'],
  ];

  it.each(LOOK_ALIKES)('#49 treats look-alike %s as one literal segment', (_label, input) => {
    expect(parseWorkspaceRelativePath(input)).toEqual({
      ok: true,
      value: { segments: [input], posixPath: input },
    });
  });

  it('#49 look-alike segments keep real separators around them', () => {
    expect(parseWorkspaceRelativePath('src/\uFF0E\uFF0E/a.ts')).toEqual({
      ok: true,
      value: { segments: ['src', '\uFF0E\uFF0E', 'a.ts'], posixPath: 'src/\uFF0E\uFF0E/a.ts' },
    });
  });
});

describe('#49 parseWorkspaceRelativePath: error hygiene', () => {
  const LEAKY: [input: string, secretToken: string][] = [
    ['/etc/passwd', 'passwd'],
    ['C:\\Users\\victim\\secret.txt', 'victim'],
    ['\\\\fileserver\\share\\x', 'fileserver'],
    ['../../../home/victim/.ssh/id_rsa', 'id_rsa'],
    ['%2e%2e%2fsecretdir', 'secretdir'],
    ['CON/secretfile', 'secretfile'],
  ];

  it.each(LEAKY)('#49 failure message for %j is generic (no %s)', (input, secretToken) => {
    const result = parseWorkspaceRelativePath(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).not.toContain(secretToken);
      expect(result.error.message).not.toContain(input);
    }
  });
});

describe('#49 parseWorkspaceRelativePath: properties', () => {
  const ADVERSARIAL_UNIT = fc.constantFrom(
    'a',
    'b',
    'C',
    'O',
    'N',
    '.',
    '..',
    '/',
    '\\',
    ':',
    '%',
    '2e',
    '2f',
    '5c',
    ' ',
    '?',
    '\u0000',
    '\uFF0E',
    '\u2215',
  );
  const adversarialPath = fc.string({ unit: ADVERSARIAL_UNIT, maxLength: 24 });

  it('#49 every accepted result is normalized, idempotent and free of dangerous segments', () => {
    fc.assert(
      fc.property(adversarialPath, (input) => {
        const result = parseWorkspaceRelativePath(input);
        if (!result.ok) {
          return;
        }
        const { segments, posixPath } = result.value;
        expect(posixPath).toBe(segments.join('/'));
        for (const segment of segments) {
          expect(segment).not.toBe('');
          expect(segment).not.toBe('.');
          expect(segment).not.toBe('..');
          expect(segment).not.toMatch(/[\\/<>:"|?*]/);
          expect(hasControlCharacter(segment)).toBe(false);
          expect(segment).not.toMatch(/[. ]$/);
          expect(segment.length).toBeLessThanOrEqual(MAX_SEGMENT_LENGTH);
        }
        // Re-parsing the normalized form is a fixed point.
        expect(parseWorkspaceRelativePath(posixPath === '' ? '.' : posixPath)).toEqual(result);
      }),
      { numRuns: 1000 },
    );
  });

  it('#49 any input with a literal `..` segment is never accepted', () => {
    fc.assert(
      fc.property(adversarialPath, adversarialPath, (before, after) => {
        const input = `${before}/../${after}`;
        expect(parseWorkspaceRelativePath(input).ok).toBe(false);
      }),
      { numRuns: 500 },
    );
  });

  it('#49 never throws and returns a policy result for arbitrary values', () => {
    fc.assert(
      fc.property(fc.oneof(fc.anything(), fc.string({ unit: 'binary', maxLength: 64 })), (v) => {
        const result = parseWorkspaceRelativePath(v);
        expect(typeof result.ok).toBe('boolean');
        if (typeof v !== 'string') {
          expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
        }
      }),
      { numRuns: 500 },
    );
  });

  it.each(FLAVORS)(
    '#49 accepted paths joined onto a %s root stay within it and round-trip',
    (_name, flavor, root) => {
      fc.assert(
        fc.property(adversarialPath, (input) => {
          const result = parseWorkspaceRelativePath(input);
          if (!result.ok) {
            return;
          }
          const candidate = flavor.join(root, ...result.value.segments);
          expect(isWithinRoot(root, candidate, flavor)).toBe(true);
          expect(toWorkspaceRelative(root, candidate, flavor)).toBe(result.value.posixPath);
        }),
        { numRuns: 500 },
      );
    },
  );
});

// ---------------------------------------------------------------------------------------------
// isWithinRoot / toWorkspaceRelative
// ---------------------------------------------------------------------------------------------

describe('#49 isWithinRoot (path.win32)', () => {
  const INSIDE: ContainmentCase[] = [
    ['C:\\ws', 'C:\\ws', true],
    ['C:\\ws', 'C:\\ws\\a', true],
    ['C:\\ws', 'C:\\ws\\a\\b\\c.ts', true],
    ['C:\\Users\\dev\\ws', 'C:\\Users\\dev\\ws\\src\\index.ts', true],
    ['C:\\ws\\', 'C:\\ws\\a', true],
    ['C:\\ws', 'C:\\ws\\', true],
    ['C:\\ws\\', 'C:\\ws\\', true],
    ['C:\\ws', 'C:\\ws\\a\\', true],
    ['C:\\ws', 'C:\\ws\\..a', true],
    ['C:\\', 'C:\\', true],
    ['C:\\', 'C:\\a', true],
    ['C:\\', 'C:\\a\\b', true],
    ['\\\\server\\share\\ws', '\\\\server\\share\\ws\\a', true],
  ];

  const OUTSIDE: ContainmentCase[] = [
    // Sibling prefix: string-prefix checks would wrongly accept these.
    ['C:\\ws', 'C:\\ws-evil', false],
    ['C:\\ws', 'C:\\ws-evil\\a.ts', false],
    ['C:\\ws', 'C:\\wsx', false],
    ['C:\\ws', 'C:\\ws.bak\\a', false],
    ['C:\\ws\\sub', 'C:\\ws\\sub2\\a', false],
    // Parent / shorter.
    ['C:\\ws', 'C:\\w', false],
    ['C:\\ws', 'C:\\', false],
    ['C:\\ws\\sub', 'C:\\ws', false],
    // Case-only differences fail closed.
    ['C:\\ws', 'C:\\WS\\a', false],
    ['C:\\ws', 'C:\\Ws', false],
    ['C:\\ws', 'c:\\ws\\a', false],
    ['C:\\ws\\Src', 'C:\\ws\\src\\a', false],
    // Different drive / namespace.
    ['C:\\ws', 'D:\\ws\\a', false],
    ['C:\\', 'D:\\', false],
    ['C:\\ws', '\\\\?\\C:\\ws\\a', false],
    ['C:\\ws', '\\\\.\\C:\\ws\\a', false],
    ['C:\\ws', '\\\\server\\share\\ws\\a', false],
    ['\\\\server\\share\\ws', '\\\\server\\other\\ws\\a', false],
    ['C:\\ws', '\\ws\\a', false],
    // Relative / drive-relative inputs.
    ['C:\\ws', 'ws\\a', false],
    ['C:\\ws', 'a', false],
    ['C:\\ws', '', false],
    ['ws', 'ws\\a', false],
    ['ws', 'ws', false],
    ['C:ws', 'C:ws\\a', false],
    ['C:\\ws', 'C:ws\\a', false],
    // Remaining `.`/`..` segments are never "within", even if they would normalize inside.
    ['C:\\ws', 'C:\\ws\\..\\secret', false],
    ['C:\\ws', 'C:\\ws\\..\\ws\\a', false],
    ['C:\\ws', 'C:\\ws\\a\\..\\b', false],
    ['C:\\ws', 'C:\\ws\\a\\..', false],
    ['C:\\ws', 'C:\\ws\\.\\a', false],
    ['C:\\ws\\..\\other', 'C:\\other\\a', false],
    ['C:\\ws\\.', 'C:\\ws\\a', false],
  ];

  it.each([...INSIDE, ...OUTSIDE])('#49 isWithinRoot(%j, %j) === %s', (root, candidate, want) => {
    expect(isWithinRoot(root, candidate, WIN32)).toBe(want);
  });

  // Win32 treats `/` as a separator too, so these contain `..` segments and resolve outside.
  const FORWARD_SLASH_DOT_DOT: [root: string, candidate: string][] = [
    ['C:\\ws', 'C:\\ws\\a/../../evil'],
    ['C:\\ws', 'C:\\ws\\x/../../../Windows\\System32'],
    ['C:\\ws', 'C:\\ws\\a/./b'],
  ];

  it.each(FORWARD_SLASH_DOT_DOT)(
    '#49 regression: isWithinRoot(%j, %j) rejects `/`-separated dot segments under win32',
    (root, candidate) => {
      expect(isWithinRoot(root, candidate, WIN32)).toBe(false);
    },
  );
});

describe('#49 isWithinRoot (path.posix)', () => {
  const INSIDE: ContainmentCase[] = [
    ['/ws', '/ws', true],
    ['/ws', '/ws/a', true],
    ['/ws', '/ws/a/b/c.ts', true],
    ['/home/dev/ws', '/home/dev/ws/src/index.ts', true],
    ['/ws/', '/ws/a', true],
    ['/ws', '/ws/', true],
    ['/ws', '/ws/a/', true],
    ['/ws', '/ws/..a', true],
    ['/', '/', true],
    ['/', '/a', true],
    ['/', '/a/b', true],
    // Backslash is an ordinary file name character on POSIX: one segment, not traversal.
    ['/ws', '/ws/a\\..\\..\\etc', true],
  ];

  const OUTSIDE: ContainmentCase[] = [
    ['/ws', '/wsx', false],
    ['/ws', '/ws-evil', false],
    ['/ws', '/ws-evil/a', false],
    ['/ws', '/ws.bak', false],
    ['/ws/sub', '/ws/sub2/a', false],
    ['/ws', '/w', false],
    ['/ws', '/', false],
    ['/ws/sub', '/ws', false],
    ['/ws', '/WS/a', false],
    ['/ws/Src', '/ws/src/a', false],
    ['/ws', 'ws/a', false],
    ['/ws', 'a', false],
    ['/ws', '', false],
    ['ws', 'ws/a', false],
    ['.', './a', false],
    ['/ws', '/ws/../etc/passwd', false],
    ['/ws', '/ws/../ws/a', false],
    ['/ws', '/ws/a/../b', false],
    ['/ws', '/ws/a/..', false],
    ['/ws', '/ws/./a', false],
    ['/ws/..', '/etc', false],
    // Windows absolute forms are relative under POSIX semantics.
    ['/ws', 'C:\\ws\\a', false],
    ['C:\\ws', 'C:\\ws\\a', false],
  ];

  it.each([...INSIDE, ...OUTSIDE])('#49 isWithinRoot(%j, %j) === %s', (root, candidate, want) => {
    expect(isWithinRoot(root, candidate, POSIX)).toBe(want);
  });
});

describe('#49 isWithinRoot: general properties', () => {
  const suffix = fc.string({
    unit: fc.constantFrom('a', 'Z', '0', '-', '_', '.', ' ', 'x'),
    minLength: 1,
    maxLength: 12,
  });

  it.each(FLAVORS)(
    '#49 (%s) a sibling sharing the root as string prefix is never within',
    (_name, flavor, root) => {
      fc.assert(
        fc.property(suffix, (tail) => {
          expect(isWithinRoot(root, `${root}${tail}`, flavor)).toBe(false);
          expect(isWithinRoot(root, `${root}${tail}${flavor.sep}child`, flavor)).toBe(false);
        }),
        { numRuns: 300 },
      );
    },
  );

  it.each(FLAVORS)(
    '#49 (%s) the parent of the root is never within the root',
    (_name, flavor, root) => {
      expect(isWithinRoot(root, flavor.dirname(root), flavor)).toBe(false);
      expect(isWithinRoot(flavor.join(root, 'child'), root, flavor)).toBe(false);
    },
  );

  it('#49 defaults to the host path flavor', () => {
    const root = path.resolve('/ws49-root');
    expect(isWithinRoot(root, root)).toBe(true);
    expect(isWithinRoot(root, path.join(root, 'a', 'b.ts'))).toBe(true);
    expect(isWithinRoot(root, `${root}-evil`)).toBe(false);
    expect(isWithinRoot(root, path.dirname(root))).toBe(false);
    expect(toWorkspaceRelative(root, path.join(root, 'a', 'b.ts'))).toBe('a/b.ts');
  });
});

describe('#49 toWorkspaceRelative', () => {
  const RELATIVE: [flavorName: 'win32' | 'posix', root: string, candidate: string, want: string][] =
    [
      ['win32', 'C:\\ws', 'C:\\ws', ''],
      ['win32', 'C:\\ws', 'C:\\ws\\a', 'a'],
      ['win32', 'C:\\ws', 'C:\\ws\\a\\b\\c.ts', 'a/b/c.ts'],
      ['win32', 'C:\\ws\\', 'C:\\ws\\src\\', 'src'],
      ['win32', 'C:\\', 'C:\\a\\b', 'a/b'],
      ['win32', 'C:\\Users\\dev\\ws', 'C:\\Users\\dev\\ws\\çalışma\\ü.ts', 'çalışma/ü.ts'],
      ['win32', '\\\\server\\share\\ws', '\\\\server\\share\\ws\\x\\y', 'x/y'],
      ['posix', '/ws', '/ws', ''],
      ['posix', '/ws', '/ws/a/b', 'a/b'],
      ['posix', '/ws/', '/ws/src/', 'src'],
      ['posix', '/', '/a/b', 'a/b'],
      ['posix', '/home/dev/ws', '/home/dev/ws/.github/x.yml', '.github/x.yml'],
    ];

  it.each(RELATIVE)(
    '#49 (%s) toWorkspaceRelative(%j, %j) === %j',
    (flavorName, root, candidate, want) => {
      const flavor = flavorName === 'win32' ? WIN32 : POSIX;
      expect(isWithinRoot(root, candidate, flavor)).toBe(true);
      const relative = toWorkspaceRelative(root, candidate, flavor);
      expect(relative).toBe(want);
      expect(relative).not.toContain('\\');
    },
  );
});
