# S1 acceptance evidence: #33 editor shell and #49 workspace boundary

Status: implementation evidence recorded on 6 November 2026 on branch
`feat/s1-editor-shell-workspace-boundary` ([PR #123](https://github.com/TurkishKEBAB/Agentic-Ide/pull/123)).
This is runtime test evidence for the S1 slice in
[IMPLEMENTATION_BASELINE](../IMPLEMENTATION_BASELINE.md) §6. It is not an advisor approval.

## Scope

- [#33](https://github.com/TurkishKEBAB/Agentic-Ide/issues/33): Electron + Monaco shell,
  hardened renderer, typed read-only IPC, workspace selection and read-only display of one UTF-8 file.
- [#49](https://github.com/TurkishKEBAB/Agentic-Ide/issues/49): workspace boundary and path
  normalization in the main-process broker ([module spec](../../src/main/workspace/README.md)).
- Out of scope, by design: agent write/apply (S3), protected-file rules
  ([#45](https://github.com/TurkishKEBAB/Agentic-Ide/issues/45)), model providers (S2), shell
  ([ADR-006](../adr/ADR-006-no-shell-execution-in-mvp.md)), packaging and Electron fuses.

## Environment manifest

| Item | Value |
| --- | --- |
| Commits | `52666d0` scaffold, `f1b40c8` #49 policy, `0fc704f` IPC/UI, `c077590` review fixes |
| Demo OS run | Windows 10 Pro 10.0.19045, Node 24.13.1, npm 11.8.0 |
| Linux run (CI mirror) | WSL2 Ubuntu (kernel 6.18.54.1), Node 24.22.0, ext4 copy of the tree |
| Runtime | Electron 45.1.0, Monaco 0.57.0 with DOMPurify 3.4.17, electron-vite 6.0.0, Vite 8.3.5 |
| Tooling | TypeScript 6.0.3, ESLint 10.13.0, Vitest 4.1.12, fast-check 4.10.2, Playwright 1.64.1 |
| Dependencies | Exact pins, one `package-lock.json`; direct versions chosen ≥1 week old; `npm audit`: 0 vulnerabilities |

## #33 acceptance criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| Clean checkout with Node 24, `npm ci` and locked manifest launches Electron/Monaco on the demo OS | Fresh `git clone` of `c077590` → `npm ci` (213 packages) → `npm run build` → Playwright Electron suite: 8/8 passed on Windows 10; GitHub `windows-latest` job (checkout → `npm ci` → `test:security` → build → Electron E2E) passed in [run 42171880737](https://github.com/TurkishKEBAB/Agentic-Ide/actions/runs/42171880737) at `46218e8` | Met |
| `nodeIntegration=false`, `contextIsolation=true`, narrow validated preload API, no generic fs/process access | `tests/security/electron-hardening.test.ts` (web preferences, CSP, navigation, permissions); E2E: no `require`/`process`/`module`/`Buffer`/`ipcRenderer` in the page, Chromium sandbox reported by `app.getAppMetrics()`, `window.agentIde` is frozen with exactly `chooseWorkspace`, `listFiles`, `readFile`; `tests/security/ipc-broker.test.ts` (sender must be the app window's main frame on `app://renderer`, exact argument shape) | Met |
| format/lint/typecheck/test/security/build scripts exist and pass CI; no missing script skipped | All six scripts exist. `format:check`, `typecheck`, `test`, `test:security`, `build` pass on Windows and Linux. `lint` fails on one error inside `eslint.config.mjs` (preload import regex escape), which a local config-protection hook prevented the implementation session from editing | **Not met yet**: pending the `eslint.config.mjs` fix; CI not yet run |
| Smoke evidence of workspace selection and read-only display of one local UTF-8 file; agent write unavailable | `tests/e2e/workspace.e2e.ts`: folder chosen through the main-process dialog, tree listed, Turkish UTF-8 file shown, typing does not change the buffer or the file on disk, screenshot `issue-33-workspace-read-only.png` written to the Playwright output; the API has no write capability | Met |

## #49 acceptance criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| Canonical segment containment rejects traversal, sibling-prefix, absolute paths and escaping symlink/junction | `tests/safety/issue-49/` (lexical, filesystem, property-based, adversarial): `..` in all separator mixes, `C:\ws` vs `C:\ws-evil`, POSIX/drive/UNC/device paths, junctions (Windows) and symlinks (Linux) to outside, sibling-prefix, parent, drive root, chains and loops; renderer-level E2E confirms `LINK_ESCAPE` through a real junction | Met |
| Policy runs in the privileged broker before each file operation and again at apply | Every S1 file operation (`listFiles`, `readFile`) runs the policy in the main process; the renderer only forwards strings. `revalidateResolvedPath` and the post-open identity check are implemented and tested (TOCTOU swaps return `TARGET_CHANGED`/`LINK_ESCAPE`) | Met for S1 operations; the apply path does not exist until S3, which must call `revalidateResolvedPath` |
| Unsupported hardlink/reparse cases fail closed; no malicious-process isolation claimed | `nlink > 1` → `HARDLINK_UNSUPPORTED` (also via a real hardlink in E2E); volume-GUID and `\\?\GLOBALROOT` junctions that Node does not report as links are caught by canonical-path checks; limits stated in the module README | Met |

## Test inventory

| Suite | Windows 10 | WSL Ubuntu |
| --- | --- | --- |
| `npm test` (all unit/security/editor, with coverage) | 827 passed, 12 skipped | 819 passed, 20 skipped |
| `npm run test:security` | 812 passed, 12 skipped | 804 passed, 20 skipped |
| `npm run test:e2e` (Electron, Playwright) | 8 passed | not run (no display; Windows is the demo OS) |
| Line coverage of `src/main` + `src/shared` (excluding Electron bootstrap) | 96.8% | threshold met |

GitHub CI at `46218e8` ([Application CI run 42171880737](https://github.com/TurkishKEBAB/Agentic-Ide/actions/runs/42171880737)):
`Windows safety tests and Electron smoke` passed; `App quality gate` (ubuntu) failed only at
`npm run lint` (the known `eslint.config.mjs` error); governance, documentation, secret scan and
dependency review passed. The first run (`e31bb12`) exposed two test-precondition defects that only
appear when the repository and the temp directory are on different Windows drives; fixed in
`46218e8`. `CodeQL Analysis` and `Supply Chain Checks` did not run because GitHub had disabled both
workflows for inactivity (last scheduled runs 28 September 2026); `npm audit` was clean locally.

Skips are capability-gated and never silent passes: Windows file symlinks need Developer Mode
(this machine lacks it), POSIX-only cases (FIFO, socket, `/dev`) skip on Windows, and Windows-only
cases (8.3 names, junctions, UNC, case-insensitive aliases, volume-GUID junctions) skip on Linux.

## Independent verification and fixes

Four agents wrote the #49 tests from the module specification without editing the
implementation (lexical 366, filesystem 145, property-based 26, adversarial 227 tests). They
reported six root causes, all fixed in `f1b40c8` and pinned by `regression:` tests:

1. DOS device names with spaces before the extension (`NUL .txt`) were accepted.
2. Win32 containment ignored `/`-separated dot segments.
3. Mixed-separator UNC/device roots (`/\host\share`) reached `realpath` (possible SMB/NTLM).
4. An ancestor swapped between `realpath` and `lstat` could substitute another file's identity.
5. Unknown intent strings followed links like `read`.
6. A non-integer `maxBytes` threw instead of returning a policy result.

The branch review (`c077590`) additionally found that Monaco 0.57.0 vendors DOMPurify 3.4.15
(GHSA-p98j-92pf-mc4p). A build plugin now routes Monaco to the pinned DOMPurify 3.4.17 and fails
the build if the redirect is missing. Renderer request races and stale state after a workspace
switch were fixed. A planned multi-agent Electron/CI review could not run because of a usage
limit; that review was performed by the implementation session instead and is therefore not
independent.

## Reproduce

```powershell
npm ci
npm run format:check; npm run lint; npm run typecheck
npm test; npm run test:security
npm run build; npm run test:e2e
```

Launching Electron from a host that sets `ELECTRON_RUN_AS_NODE=1` (for example some IDE
extension hosts) turns Electron into plain Node; the E2E helper removes that variable.

## Open items

- Fix the `eslint.config.mjs` preload import regex, then rerun `npm run lint` and record the green
  `App quality gate` run here.
- Re-enable the `CodeQL Analysis` and `Supply Chain Checks` workflows (disabled for inactivity) and
  record their first runs on this PR.
- S3 must call `revalidateResolvedPath` at apply and resolve with intent `write`.
