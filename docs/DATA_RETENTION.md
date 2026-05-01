# Data Retention And Secure Deletion

Status: Pre-implementation baseline

This document complements `DATA_AND_PRIVACY.md` by defining concrete retention expectations.

## Retention Matrix

| Data              | Default Location                   | Default Retention                              | Secure Deletion Expectation                   |
|-------------------|------------------------------------|------------------------------------------------|-----------------------------------------------|
| Workspace index   | Local app data                     | Until workspace is removed                     | Delete index for selected workspace           |
| Embeddings        | Local app data                     | Until workspace is removed                     | Delete vector rows and metadata               |
| Audit log         | Local app data                     | User-controlled; thesis export can be separate | Delete local log or export sanitized copy     |
| API keys          | `~/.agentide/config.json` in MVP   | Until user removes provider                    | Remove key and rewrite config without value   |
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
- test that clear workspace data removes index, embeddings, and workspace audit entries
