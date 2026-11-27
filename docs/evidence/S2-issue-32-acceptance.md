# S2 acceptance evidence for the editor status bar

The status bar for [issue #32](https://github.com/TurkishKEBAB/Agentic-Ide/issues/32) stays below the
scrolling editor. It shows the active relative file path and the agent state. The live region uses
an accessible name and announces updates without moving keyboard focus.

| Acceptance criterion | Verification |
| --- | --- |
| The active file remains visible across selection, editing and closing | The Electron test opens two files with the keyboard at the minimum window size, saves an edit, closes the selected file and checks the fallback and empty states. |
| The displayed agent state reflects the current workspace | The Electron test checks local agent unavailability, the simulated agent and history states in the tutorial, and restoration of the original local file and agent state on return. |

Both scenarios in [workspace.e2e.ts](../../tests/e2e/workspace.e2e.ts) failed against the baseline
because the status region was absent. Both passed against the production Electron build with the
status bar on Windows 10 Pro 10.0.19045, Node.js 24.13.1 and Electron 45.1.0.

```powershell
npm ci
npm run build
npm run test:e2e -- -g "#32"
```
