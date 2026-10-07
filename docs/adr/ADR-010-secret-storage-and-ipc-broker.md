# ADR-010: Secret Storage And IPC Broker

## Status

Proposed — 2026-10-07. Documented contract; no runtime implementation or platform validation yet.

## Context

The former privacy plan put raw provider keys in `~/.agentide/config.json`, while the configuration schema used
`apiKeyRef`. The updated provider-setup requirement in GitHub #52 requires a secret reference rather than a raw key.
Electron renderer/main boundaries also need a clear owner for credentials and privileged file actions.

## Proposed Decision

- Store cloud keys in an OS credential store, or encrypted secret storage whose encryption key is protected by the OS.
  Select the exact library/mechanism through an implementation spike and record its supported-platform behavior.
- Store only a non-empty opaque `apiKeyRef` and non-secret provider settings in config. No raw-key config field,
  plaintext file or `.env` fallback is allowed when secure storage is unavailable.
- Resolve and use secret values only in the main-process broker. Onboarding may submit a value through a narrow,
  validated preload channel; no credential-read operation returns the value to the renderer or agent toolset.
- Restrict preload APIs to named operations; validate sender, input shape and operation-specific policy in main.
  Do not expose general filesystem, Electron IPC or process-execution APIs to model/rendered content.
- Redact credentials from logs, provider errors, context, indexing and exports. Clearing a provider removes the
  secret-store record and config reference. Clearing the audit log remains a separate user action under GitHub #106.
- Preserve immutable built-in protected-file rules. `.agentignore` must be respected; user exclusions are additions
  to the mandatory rules, never replacements. Config cannot disable the baseline.
- Allow MVP Ollama endpoints only on literal `localhost`, `127.0.0.1` or `[::1]`. Runtime verifies loopback resolution,
  rejects redirects to remote hosts, and enforces local-only mode for both chat and embeddings.

The planning configuration schema now encodes these proposal constraints where JSON Schema can express them:
`respectAgentIgnore` must be true, `apiKeyRef` is non-empty, and the Ollama URL is restricted to loopback-host syntax.
The built-in exclusion union, credential secrecy, DNS/redirect handling and IPC authorization require runtime code;
schema validation does not establish those guarantees.
Likewise, `minLength` cannot determine whether an arbitrary string is a real secret-store reference; the broker must
create/resolve references without treating renderer-provided key text as an `apiKeyRef`.

## Consequences And Limits

- Provider setup fails explicitly when suitable secret storage is unavailable. The user can select a local provider;
  the app must not silently weaken key protection.
- The implementation spike must evaluate Electron `safeStorage` or an OS credential adapter. In particular,
  platform storage behavior and Linux backend fallback require explicit acceptance criteria.
  [Electron safeStorage documentation](https://www.electronjs.org/docs/latest/api/safe-storage).
- Schema constraints are intentionally stricter than the prior planning schema. Existing configuration migration
  must be explicit; do not erase user data, silently copy raw keys, or write credentials into migration logs.
- Removing a secret entry is logical removal, not a forensic erasure promise for SSDs or external backups.
- This proposed ADR does not change accepted Electron, provider-boundary, manual-model-selection or no-shell ADRs.

## Acceptance Evidence Required Before Acceptance

1. A platform spike records the selected storage backend, failure behavior and supported demo OS.
2. Valid config fixtures accept loopback IPv4/IPv6/localhost, true ignore and a secret reference.
3. Invalid fixtures reject remote/userinfo/escaped-host URLs, invalid ports, false ignore, empty reference and raw-key fields.
4. Runtime tests show unauthorized IPC, storage failures, provider errors and exports never reveal raw credentials.
5. Provider removal and audit-log clearing are tested independently; config retains no dangling secret reference.
6. Local-only tests verify no provider/embedding request or redirect leaves the loopback boundary.

Schema fixture checks can be completed before implementation; runtime controls remain unverified until code exists.

## Revisit Conditions

- The target OS lacks an acceptable credential/encryption backend.
- A justified future requirement adds remote Ollama or another cloud provider.
- Advisor review changes the secret-storage or privacy scope.

## Related Documents

- [DATA_AND_PRIVACY](../../DATA_AND_PRIVACY.md) §4
- [Data retention](../DATA_RETENTION.md)
- [Change lifecycle contract](../CHANGE_LIFECYCLE_CONTRACT.md)
- [Configuration schema](../schemas/config.schema.json)
- [UC-05](../../diagrams/UC/UC-05-konfigurasyon-ve-onboarding.puml)
- [ADR-001](ADR-001-electron-monaco-editor-shell.md), [ADR-004](ADR-004-manual-model-selection.md),
  [ADR-005](ADR-005-cloud-local-provider-boundary.md), [ADR-006](ADR-006-no-shell-execution-in-mvp.md)
