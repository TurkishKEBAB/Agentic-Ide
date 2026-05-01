# ADR-008: Workspace Boundary Terminology

## Status

Accepted

## Context

The project originally used the word "sandbox" in a few places. In this MVP,
there is no VM, container, or OS-level sandbox. The actual safety mechanism is a
workspace-bound file access model with path normalization, protected-file rules,
approval gates, and audit logging.

Using "sandbox" would overpromise the isolation guarantee.

## Decision

Use the terms `workspace boundary`, `path normalization`, `write boundary`,
`protected file`, and `approval gate`.

Avoid calling the MVP environment a sandbox unless a real OS-level isolation
layer is added in future work.

## Consequences

- Safety claims become more precise and easier to defend.
- Diagrams and Project cards should use the same vocabulary.
- A future true sandbox can still be added, but it must be represented as a new
  architecture decision and implementation feature.

## Revisit Conditions

- The implementation adds container, VM, or OS-level isolation.
- Advisor feedback prefers a different controlled terminology.
- Documentation finds a clearer term that does not overstate guarantees.

## Related Documents

- `SAFETY_AND_GUARDRAILS.md`
- `diagrams/UC/README.md`
- `diagrams/UC/UC-03A-reactive-safety-warnings.puml`
