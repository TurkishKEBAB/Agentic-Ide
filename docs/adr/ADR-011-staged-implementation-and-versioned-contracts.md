# ADR-011: Staged Implementation And Versioned Lifecycle Contracts

## Status

Accepted engineering baseline — 2026-11-04. This is not an advisor approval or runtime validation.

## Context

All 95 backlog cards remained open after the previous document PR. Research approvals, completed documents and
implementation requirements were mixed. Partial approval depended on transactions and transactions depended on
partial approval design, while early safe scaffolding was gated on unrelated academic choices.
The lifecycle contract had fields/events absent from its v1 schemas.

## Decision

- Adopt [IMPLEMENTATION_BASELINE](../IMPLEMENTATION_BASELINE.md) as the active engineering capability contract.
- Separate S0 documentation, S1 safe shell/pure policy, S2 read-only context/providers, S3 single-file approved
  change/recovery, S4 dependency-aware multi-file flow, S5 formal research and S6 delivery.
- A v2 plan, patch, human approval, durable transaction, external evidence and sanitized audit each have their own
  strict JSON Schema. Historical v1 records never authorize a v2 write. Cross-record examples/negative cases run in CI.
- Use dependency groups for selective approval; stage a new selected patch and obtain fresh approval. Initial S3
  all-or-cancel behavior does not remove the final S4 partial-approval requirement.
- Keep a second model verifier, independent student/professional UI modes, shell and proactive agent runs out of MVP.
  Verification responsibilities are broker policy, human decision and independently prepared external oracle.
- S1 can begin after technical DoR checks; formal research and any human participant work need actual advisor gates.
- Record stable issue IDs, workstream, delivery slice, owner role, explicit readiness and completion evidence.
  Done documents do not imply completed product features. Priority never implies Ready or advisor approval.
- Choose electron-vite and vanilla TS; keep provider/native versions and OS secret-store library selection as
  scaffold/spike compatibility work with lockfile evidence. No arbitrary thesis deadline is invented.

## Consequences

The implementation has a concrete order and failure/authority contract. Formal hypotheses, model/task/fixture freeze
and participant consent remain visible external decisions. Grouping academic unknowns does not indefinitely block
the safe read-only foundation. Future scope changes must update this baseline, dependency graph and evidence rules.

## Revisit Conditions

The advisor changes the research variable; the demo OS/native ABI blocks the chosen stack; independent verifier
research is explicitly added; crash tests expose an unsupported filesystem assumption; or the real academic deadline
requires a scoped MVP change. Record the changed requirement revision and do not reinterpret past evidence.
