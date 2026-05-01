# Implementation Readiness

This document defines what must be true before the project moves from planning
into implementation. It is intentionally strict because the project has a high
safety and thesis-evidence burden.

## Readiness Gate

Implementation may start when these conditions are true:

- The active GitHub Project has the fields `Status`, `Requirement Status`,
  `Readiness`, `Phase`, `Priority`, `MVP Scenario`, `Risk`, `Test Target`, and
  `Thesis Evidence`.
- Faz 1 P0 cards are either `Ready` or explicitly marked `Blocked`.
- All accepted architectural decisions have an ADR.
- The first implementation slice has a written Definition of Ready and
  Definition of Done.
- Safety terminology is consistent: workspace boundary, path normalization,
  protected file, approval gate, audit log.
- Benchmark and audit evidence schemas exist before the agent loop is built.
- Repository governance, docs, diagram, and security checks pass locally.
- `docs/QUALITY_GATES.md` and `docs/PRE_IMPLEMENTATION_AUDIT.md` show which gates are active, armed, manual, or deferred.
- Runtime is pinned through `.nvmrc`, and application CI is present before `package.json` is introduced.
- Threat model, incident response, data retention, and accessibility baselines exist before UI/security-sensitive code starts.

## Definition Of Ready

A card is `Ready` when:

- It has one clear user or thesis outcome.
- Acceptance criteria are testable.
- Source documents are linked.
- The risk is named.
- Test target is named.
- Thesis evidence is named.
- Dependencies and blocked decisions are either resolved or written down.
- The expected implementation scope is small enough for one pull request.
- The card identifies which quality gate will verify the change.

## Definition Of Done

A card is `Done` when:

- Code or document changes are merged.
- The relevant local validation passes.
- User-visible behavior, safety behavior, or thesis evidence is captured.
- Project fields are updated.
- Any new decision is recorded as an ADR or linked to an existing ADR.
- Any benchmark/evaluation impact is reflected in the task evidence notes.
- If the change touches prompts, model settings, retrieval policy, or verifier behavior, the prompt/model version record is updated.

## First Implementation Slice

The first implementation slice should be deliberately narrow:

1. Electron shell starts.
2. Monaco opens a local file.
3. Workspace root is selected and normalized.
4. Protected-file and workspace-boundary checks exist as pure functions.
5. Governance and security tests run in CI.

The agent loop should wait until the workspace boundary and protected-file tests
exist. This keeps the project from building exciting behavior on a weak floor.

## Manual Advisor Checkpoint

Before coding the agent loop, ask the advisor to confirm:

- The A/B/C evaluation design is acceptable.
- "No shell execution in MVP" is acceptable.
- Manual model selection is acceptable.
- Workspace boundary terminology is accurate enough for the thesis.
- The first 20 benchmark task categories are reasonable.
