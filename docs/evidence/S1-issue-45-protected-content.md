# S1 verification evidence for #45 protected files

[Issue #45](https://github.com/TurkishKEBAB/Agentic-Ide/issues/45) defines the protected-file boundary.
[The workspace broker](../../src/main/ipc/workspace-broker.ts) uses the same canonical-path policy
for agent source discovery, explicit content reads and manual saves.

| Requirement | Verification |
| --- | --- |
| Exclude sensitive files from read, context, index and write | [The #45 boundary tests](../../tests/safety/issue-45/protected-content.test.ts) cover protected names, mixed-case extensions, nested paths, alternative separators, application data, backup and save-staging files, and linked directories. Local editor reads present protected files as read-only. Manual saves report a policy denial. |
| Keep user rules additive | The same tests cover root `.agentignore` rules, directory patterns, ignored negations, updated policies and parse errors. A policy error stops agent source discovery and content reads. |
| Keep protected bytes out of downstream input | Synthetic fixtures exercise both broker methods. Provider and embedding test doubles receive only the allowed file's text. The audit test double receives generic denial messages without the path or bytes. |

The tests verify the S1 broker boundary with synthetic stand-ins for the downstream consumers.
Runtime integration evidence belongs with context [#19](https://github.com/TurkishKEBAB/Agentic-Ide/issues/19),
indexing [#22](https://github.com/TurkishKEBAB/Agentic-Ide/issues/22),
the model adapter [#26](https://github.com/TurkishKEBAB/Agentic-Ide/issues/26) and
persistent audit [#23](https://github.com/TurkishKEBAB/Agentic-Ide/issues/23).

## Reproduce

```powershell
npm ci
npx vitest run tests/safety/issue-45/protected-content.test.ts
npm run test:security
```
