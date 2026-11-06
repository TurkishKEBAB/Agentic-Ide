# Workspace boundary (`src/main/workspace`)

Requirement: GitHub #49 — workspace boundary and path normalization. Terminology follows
[ADR-008](../../../docs/adr/ADR-008-workspace-boundary-terminology.md): this is a
**workspace boundary**, not an OS sandbox. A malicious local process racing the broker is
out of scope ([THREAT_MODEL](../../../docs/THREAT_MODEL.md)); hardlink/reparse cases fail closed.

All functions run in the privileged main-process broker. Renderer-side checks are never
trusted; every file operation calls `resolveWorkspacePath` (or a function built on it) first,
and a later use (S3 apply) calls `revalidateResolvedPath` again.

## Modules

| File | Responsibility |
|------|----------------|
| `policy-result.ts` | `PolicyResult<T>` and the closed set of `WorkspacePolicyCode` values. No function throws for a policy decision. |
| `relative-path.ts` | `parseWorkspaceRelativePath(input)`: pure lexical validation, no filesystem access. |
| `containment.ts` | `isWithinRoot(root, candidate, flavor?)`: canonical segment containment (pure). |
| `workspace-root.ts` | `openWorkspaceRoot(selected)`, `verifyWorkspaceRoot(root)`, `sameIdentity`. |
| `resolve-path.ts` | `resolveWorkspacePath(root, input, intent)`, `revalidateResolvedPath(root, resolved)`. |
| `verified-read.ts` | `readVerifiedTextFile(root, input, maxBytes?)`: validated, identity-checked UTF-8 read. |

## Lexical rules (`parseWorkspaceRelativePath`)

Windows naming rules apply on every platform. In order:

1. Non-string, empty, longer than 4096 characters, or containing U+0000–U+001F / U+007F → `INVALID_INPUT`.
2. Starts with `/` or `\` (POSIX absolute, rooted, UNC `\\server`, device `\\?\` `\\.\` `//?/`) or
   with `<letter>:` (drive-absolute or drive-relative) → `ABSOLUTE_PATH`.
3. Contains `%2e`, `%2f`, `%5c`, `%3a`, `%00` or `%25` (any case) → `ENCODED_TRAVERSAL`.
   Other `%` text (e.g. `100%.txt`, `%41`) is a literal file name.
4. Split on runs of `/` and `\`. If any segment is `..` → `TRAVERSAL` (this wins over rule 5,
   e.g. `CON/..` is `TRAVERSAL`). Empty and `.` segments are dropped.
5. A segment longer than 255, ending in `.` or space, containing `< > : " | ? *`, or naming a DOS
   device → `INVALID_SEGMENT`. Device matching follows Win32: the name is cut at its first `.` and
   the spaces before that cut are stripped, then compared case-insensitively with
   `CON PRN AUX NUL COM0-9 COM¹²³ LPT0-9 LPT¹²³ CONIN$ CONOUT$` (so `nul.txt`, `NUL .txt` and
   `CON  .tar.gz` are devices; `CONSOLE.ts`, `com10` and `NULx .txt` are not).
6. Result: `{ segments, posixPath }`; inputs that reduce to no segments (`.`, `./`) denote the root.

## Containment (`isWithinRoot`)

Both arguments must be canonical absolute paths. The candidate must equal the root or have the
root's segments as an exact, **case-sensitive** prefix (segment-wise, not string-prefix). Paths
with remaining `.`/`..` segments or relative paths are never "within". With the win32 flavour both
`\` and `/` separate segments, so `C:\ws\a/../../evil` is not within `C:\ws`.

## Filesystem resolution (`resolveWorkspacePath`)

`intent` is `read` (regular file), `list` (directory) or `write` (regular file, links forbidden).
Any other intent value → `INVALID_INPUT` before any filesystem access.

1. Lexical failure is returned unchanged.
2. The root must still `realpath` to the same canonical path with the same `(dev, ino)` → else `ROOT_CHANGED`.
3. Each path prefix is `lstat`ed. A symbolic link or Windows junction (Node reports both as links):
   `write` → `LINK_NOT_ALLOWED`; otherwise its `realpath` must be inside the root → else `LINK_ESCAPE`
   (a looping link, `ELOOP`, is also `LINK_ESCAPE`). Missing components, dangling links and a file
   used as a directory → `NOT_FOUND`.
4. The full path's `realpath` must be inside the root → else `LINK_ESCAPE` (a link was followed)
   or `OUTSIDE_WORKSPACE`.
5. If no link was followed, the `realpath` must equal the joined request exactly → else
   `NON_CANONICAL_PATH` (8.3 short names such as `PROGRA~1`, case-only differences, unknown reparse points).
6. The canonical entry is `lstat`ed. Its `(dev, ino)` must equal what step 3 saw for the last
   component (when that component is not a link), and `realpath` of the canonical path must still
   return itself → else `TARGET_CHANGED`. This closes the window in which an ancestor swapped for a
   link between `realpath` and `lstat` would substitute another file.
7. Entry type: `read`/`write` need a regular file (`list` a directory) → else `UNSUPPORTED_FILE_TYPE`;
   FIFOs/sockets/devices → `UNSUPPORTED_FILE_TYPE`; a regular file with `nlink > 1` → `HARDLINK_UNSUPPORTED`.
8. The canonical relative path must round-trip through the lexical rules unchanged → else
   `NON_CANONICAL_PATH` (e.g. a Linux name containing `\`, reachable only through a followed link).
9. Result carries the canonical relative path (`/` separators), canonical absolute path (main
   process only), kind, `(dev, ino)` identity, size and whether an in-root link was followed.

`revalidateResolvedPath` re-runs the whole resolution for the same relative path and intent and
returns `TARGET_CHANGED` if the canonical path, kind or identity differs.

After a followed in-root link, step 5 does not apply, so case/8.3 aliases *behind* the link resolve
to their canonical file. Later layers (protected files) must therefore match the returned canonical
`relativePath`, never the request string.

## Workspace root (`openWorkspaceRoot`)

Rejects non-strings, relative paths, NUL, filesystem roots (`C:\`, `/`), non-directories and any
path starting with two separators in any mix (`\\`, `//`, `\/`, `/\`: UNC shares and `\\?\`/`\\.\`
device paths) with `ROOT_UNSUPPORTED`. The prefix check runs **before** `realpath`, so no SMB/NTLM
connection is attempted, and again after it. A missing path → `NOT_FOUND`; a looping link →
`LINK_ESCAPE`. The canonical (`realpath`) directory becomes the boundary; `displayName` is its basename.

## Verified read (`readVerifiedTextFile`)

`maxBytes` (default 1 MiB) must be a non-negative safe integer → else `INVALID_INPUT`. Resolves with
`read`; size above `maxBytes` → `FILE_TOO_LARGE` (never truncated). The file is opened read-only
(`O_NOFOLLOW | O_NONBLOCK` on POSIX, so a FIFO swapped in cannot block). The handle's `fstat` must be
a regular file with `nlink === 1` and the validated `(dev, ino)` → else `TARGET_CHANGED`. At most one
byte beyond the `fstat` size is read; a different byte count (the file grew or shrank) →
`TARGET_CHANGED`. Content must be strict UTF-8 without NUL bytes → else `UNSUPPORTED_ENCODING`.
A leading UTF-8 BOM is stripped by the decoder.

## Listing (`listWorkspace`)

Breadth-first, name-ordered, bounded by `maxEntries`/`maxDepth` (reported as `truncated`). Links,
junctions, FIFOs/sockets/devices, `.git`, `node_modules`, names containing `\` and names the
lexical rules reject are never listed, so every listed path is a valid read request.

## Limits (stated, not hidden)

- Policy errors carry generic messages and never include absolute paths.
- Protected-file rules (`.env`, keys, `.agentignore`) are a separate layer (write boundary).
- Hardlinked files are rejected rather than analysed; reparse points that Node does not report as
  links (e.g. volume-GUID junctions) are caught only through the canonical-path checks (steps 4–5).
- Network shares (UNC, mapped drives that canonicalize to UNC) are unsupported workspace roots.
- Volume mount points or bind/FUSE mounts *inside* the workspace canonicalize to in-root paths and
  are accepted; creating them needs administrator/root rights. Weak file identities (ReFS 128-bit
  IDs truncated to 64 bits, FAT/exFAT, network filesystems reporting `ino` 0) weaken the
  `(dev, ino)` checks.
- A concurrent malicious local process is out of scope. The broker narrows check/use windows
  (steps 3–6, post-open identity, size match) but does not claim OS-level isolation.
- Fullwidth look-alikes (`．．／`) are literal names here. ADR-006 forbids passing paths to child
  processes in the MVP; any future ANSI-API consumer must re-validate.
