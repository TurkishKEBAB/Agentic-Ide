# Architecture Decision Records

This folder keeps the decisions that should not remain as loose notes in planning
documents. Each ADR captures one high-impact decision, the reason it was made,
the trade-offs, and the conditions that should trigger a revisit.

## Status Values

- `Proposed`: written down, waiting for advisor or implementation validation.
- `Accepted`: current project direction.
- `Superseded`: replaced by a newer ADR.
- `Deferred`: intentionally postponed.

## Index

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-electron-monaco-editor-shell.md) | Electron + Monaco editor shell | Accepted |
| [ADR-002](ADR-002-node-runtime-target.md) | Node runtime target | Accepted |
| [ADR-003](ADR-003-local-retrieval-storage.md) | SQLite + sqlite-vec retrieval storage | Accepted |
| [ADR-004](ADR-004-manual-model-selection.md) | Manual model selection for MVP | Accepted |
| [ADR-005](ADR-005-cloud-local-provider-boundary.md) | Cloud/local provider boundary | Accepted |
| [ADR-006](ADR-006-no-shell-execution-in-mvp.md) | No shell execution in MVP | Accepted |
| [ADR-007](ADR-007-ablation-baseline-design.md) | A/B/C ablation baseline design | Accepted |
| [ADR-008](ADR-008-workspace-boundary-terminology.md) | Workspace boundary terminology | Accepted |
| [ADR-009](ADR-009-prompt-model-versioning.md) | Prompt and model versioning | Accepted |

## How To Add A New ADR

1. Copy the structure from an existing ADR.
2. Use the next sequential number.
3. Keep the decision narrow enough that it can be revisited independently.
4. Link the ADR from the related planning document and GitHub Project card.
