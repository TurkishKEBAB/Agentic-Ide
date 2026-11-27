# S2 acceptance evidence for #52 desktop setup

[Issue #52](https://github.com/TurkishKEBAB/Agentic-Ide/issues/52) covers workspace selection,
local-first model and privacy settings, provider credential setup and recent projects. The desktop welcome
screen shows the current profile and recent projects. **Model ve gizlilik** opens setup again from the editor.

| Acceptance criterion | Verification |
| --- | --- |
| First launch uses a local-only profile. The cloud profile requires explicit provider and privacy selection. | The Windows Electron tests in [onboarding.e2e.ts](../../tests/e2e/onboarding.e2e.ts) cover the first launch, native folder selection, recent workspace reopening after restart, dirty-buffer cancellation, and explicit consent. A recent folder whose identity has changed requires a new native selection. |
| A write-only, validated credential channel sends the key to the main process. Settings hold an opaque reference. | [Setup IPC tests](../../tests/security/setup-broker.test.ts) check sender and argument validation, the consent gate, and sanitized results. Windows Electron tests check masked entry, clearing on close, the opaque reference and encrypted bytes on disk, and decryption in the main process after restart using a synthetic value. |
| Unavailable secure storage leaves local setup usable. Credential removal is independent of audit and index clearing. | The broker tests exercise unsupported platforms, unsuccessful encryption and storage write failures. Windows Electron tests cover an unavailable backend, an encryption failure during setup, local workspace selection, preserving the key when switching to local, and removing the key without modifying separate audit and index fixtures. |

The desktop uses Electron 45's asynchronous [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
with Windows DPAPI. The Windows 10 demo is the supported cloud-credential setup environment. Other platforms keep
the local profile available. The settings and the encrypted credential record are separate sections of one
atomically written file in Electron user data, so replacing or removing a credential updates its reference in
the same commit. Recent workspace IDs and folder names are the only history fields returned to the renderer.
The Electron test also verifies that the editor cannot open the app-managed setup file from an enclosing workspace.

The tests perform no provider requests. Provider connectivity, model availability and runtime network policy are
tracked in [#26](https://github.com/TurkishKEBAB/Agentic-Ide/issues/26). Audit and index clearing are tracked in
[#106](https://github.com/TurkishKEBAB/Agentic-Ide/issues/106) and [#105](https://github.com/TurkishKEBAB/Agentic-Ide/issues/105).

## Reproduce

```powershell
npm ci
npm run test:security
npm run build
npx playwright test tests/e2e/onboarding.e2e.ts
```
