# Data Retention And Secure Deletion

Status: Pre-implementation baseline

This document complements `DATA_AND_PRIVACY.md` by defining concrete retention expectations.

## Retention Matrix

| Data              | Default Location                   | Default Retention                              | Secure Deletion Expectation                   |
|-------------------|------------------------------------|------------------------------------------------|-----------------------------------------------|
| Workspace index   | Local app data                     | Until workspace is removed                     | Delete index for selected workspace           |
| Embeddings        | Local app data                     | Until workspace is removed                     | Delete vector rows and metadata               |
| Audit log         | Local app data                     | User-controlled; thesis export can be separate | Delete local log or export sanitized copy     |
| API keys          | Proposed OS credential/encrypted secret store; config has `apiKeyRef` only | Until user removes provider | Remove secret-store record and config reference; no plaintext fallback |
| Chat history      | Local app data                     | Optional; off by default for MVP if uncertain  | Delete conversation file/row                  |
| Benchmark exports | `docs` or evaluation output folder | Keep sanitized thesis evidence                 | Never include secrets or raw proprietary code |

## Minimum Product Controls

- clear workspace data action
- clear provider key action
- clear audit log action, with warning that thesis evidence may be lost
- sanitized export for advisor/thesis review

## Verification

- test that protected files are absent from index and embeddings
- test that API keys are absent from audit logs
- test that config and exports contain only a secret reference, and clearing a provider removes the secret record and reference
- test that clear workspace data removes index, embeddings, and workspace audit entries

Secret storage is a proposed, unimplemented contract; the platform mechanism must be selected and tested in the
implementation spike. See [ADR-010](adr/ADR-010-secret-storage-and-ipc-broker.md). Removal is logical deletion;
forensic erasure from SSDs, OS backups, or external copies is not guaranteed by this prototype.
