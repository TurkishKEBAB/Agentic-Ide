# S2 acceptance evidence: #44 file management and manual save

Status: recorded on 7 November 2026 after [PR #124](https://github.com/TurkishKEBAB/Agentic-Ide/pull/124)
merged into `main` as `42f238a`. This is runtime test evidence for the file-flow part of S2 in
[IMPLEMENTATION_BASELINE](../IMPLEMENTATION_BASELINE.md) §6. It is not an advisor approval.

## Scope

- [#44](https://github.com/TurkishKEBAB/Agentic-Ide/issues/44): open a workspace folder, browse the file tree,
  open, edit, reload and manually save UTF-8 files, with at most five open files.
- Origin: the change set was produced by Codex from the first-task design brief, then reviewed and fixed
  in the same PR (commits `5422393` Codex, `48d5d9f` and `7aa2bd8` review fixes).
- Out of scope: agent apply, rollback and audit (S3), the simulated first-task tutorial (it never touches
  disk), status bar ([#32](https://github.com/TurkishKEBAB/Agentic-Ide/issues/32)) and the read/index/context
  side of protected files ([#45](https://github.com/TurkishKEBAB/Agentic-Ide/issues/45)).

## Environment manifest

| Item | Value |
| --- | --- |
| Commits | PR head `7aa2bd8`, merge `42f238a`; `#44` acceptance test added on top of `42f238a` |
| Demo OS run | Windows 10 Pro 10.0.19045, Node 24.13.1, npm 11.8.0 |
| Runtime | Electron 45.1.0, Monaco 0.57.0 with DOMPurify 3.4.17, electron-vite 6.0.0, Vite 8.3.5 |
| New dependencies | `diff` 8.0.4, `@fontsource-variable/inter` 5.3.0, `@fontsource/jetbrains-mono` 5.3.0 (npm registry, no dependencies, no install scripts) |

## #44 acceptance criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| Open/reload/save and up to five tabs preserve dirty buffers and report conflicts; the sixth file prompts a deliberate close choice | E2E (`tests/e2e/workspace.e2e.ts`): "#44 drafts stay in the workset until explicitly saved with Ctrl+S", "#44 an external edit preserves the draft and disk until reload is confirmed", "#44 a sixth file asks which open file to close and never drops a draft silently" (five open files; the sixth opens a choice; a clean file closes directly; a draft asks again and "Kaydet ve kapat" writes it before freeing the slot; cancelling changes nothing). Renderer state (`design-prototype/tests/native-files.test.ts`): reopening a dirty file keeps the draft, a save advances the revision, late reads and reloads cannot replace newer typing, a rejected save keeps the draft | Met |
| Manual save obeys the same workspace/protected policy and is distinguished from agent apply | `saveFile` is a separate IPC capability that resolves with the `write` intent of the #49 boundary (no link following, hardlinks rejected, root identity re-checked). Broker tests (`tests/security/ipc-broker.test.ts`): "refuses traversal, absolute paths, missing files, and linked ancestors", "fails closed when .agentignore cannot be verified", "fails closed when .agentignore uses unsupported pattern syntax", "honors a .agentignore rule added after the file was opened", "keeps ignore exclusions additive, with nested directories and hidden names covered", "does not replace an existing binary target", "rejects invalid UTF-8 content and limits the number of bytes saved". Safety (`tests/safety/issue-49/adversarial.test.ts`): "manual save rejects an ancestor redirected outside the workspace before opening the target". No agent apply capability exists; the simulated tutorial keeps its own in-memory files: E2E "#44 practice and local drafts remain separate even for the same path" | Met. S3 apply must stay a separate, approval-bound path |
| External file changes never silently overwrite a dirty buffer | The revision is an HMAC over path, file identity and full content, so any external change is detected. Broker tests: "does not overwrite a same-size external edit", "does not overwrite a replacement file with the same bytes", "allows at most one competing save against the same revision", "invalidates an open revision when the same workspace is reopened". Safety: "manual save leaves an external edit made while staging intact", "manual save never overwrites or unlinks a preexisting temporary entry". E2E: "#44 an external edit preserves the draft and disk until reload is confirmed", "#44 switching workspaces requires explicit discard of local drafts" | Met |

The issue's planned test target was `tests/editor/issue-44`. The acceptance tests live where the existing
harnesses run them: Electron E2E in `tests/e2e`, broker tests in `tests/security`, boundary tests in
`tests/safety/issue-49`, and renderer state tests in `design-prototype/tests`. The E2E tests carry the `#44` tag.

## Test inventory and CI

| Suite | Windows 10 |
| --- | --- |
| `npm test` (Vitest with coverage, then the prototype's Node tests) | 847 passed, 13 skipped; 32/32 prototype tests; line coverage 95.69% |
| `npm run test:security` | 842 passed, 13 skipped |
| `npm run test:e2e` (Electron, Playwright) | 12 passed, including the five `#44` tests |

GitHub CI passed on the PR head `7aa2bd8` ([Application CI run 42368939760](https://github.com/TurkishKEBAB/Agentic-Ide/actions/runs/42368939760):
Ubuntu quality gate and Windows E2E job) and on the merge `42f238a`
([Application CI run 42369173265](https://github.com/TurkishKEBAB/Agentic-Ide/actions/runs/42369173265)).
CodeQL, supply chain (npm audit, SBOM), dependency review, secret scan, governance and documentation checks
passed on both. CodeQL reported no open alerts after `7aa2bd8`.

## Review record

The review read the write path, IPC and preload line by line, audited every HTML injection point in the
renderer, checked dependency provenance and compared test titles before and after (tests were rewritten and
extended, none weakened). Fixes made before merge:

1. The standalone prototype dev server listened on all interfaces with a sandbox-only `allowedHosts`; it now binds to localhost.
2. The prototype's Node tests ran in no CI job; `npm test` now runs them.
3. The welcome screen claimed "Ajan hazır" while no agent exists; it now names the real state.
4. Dead S1 renderer modules and their tests were removed.
5. Three CodeQL `js/file-system-race` patterns in the new broker tests were removed.

The sixth-file test was added after the merge, together with this report.

## Known limitations

- `design-prototype/` runs as the desktop renderer but is linted with `recommendedTypeChecked` and excluded
  from Prettier. Its 61 KB `main.ts` builds the UI with `innerHTML` templates; every workspace-derived string
  traced in review goes through `escapeHtml`, and CSP blocks inline scripts, but the pattern is fragile.
- A save replaces the file by `rename`: Windows ACLs, alternate data streams and hidden/system attributes of
  the original are not carried over, and the parent directory is not fsynced on POSIX.
- The demo-flow selector and simulated model picker are visible in the desktop app; hide them before any
  participant study ([EVALUATION_PROTOCOL](../EVALUATION_PROTOCOL.md)).

## Reproduce

```powershell
npm ci
npm test; npm run test:security
npm run build; npx playwright test tests/e2e/workspace.e2e.ts -g "#44"
```
