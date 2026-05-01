# ADR-006: No Shell Execution In MVP

## Status

Accepted

## Context

Shell execution would make the agent more powerful, but it would also expand the
safety problem dramatically. The project is being evaluated on controlled,
approval-gated coding assistance, not general computer control.

## Decision

Do not include terminal, shell, `exec`, `eval`, package-install, or arbitrary
process execution tools in the MVP agent toolset.

The allowed tool surface is limited to controlled file reads, retrieval, diff
generation, approval-gated writes, rollback, and explanation.

## Consequences

- The safety model is smaller and more defensible.
- The system cannot automatically run test commands in MVP; test execution must
  be a manual or future-work step.
- Benchmark tasks should be designed so success can be judged from code changes,
  deterministic fixtures, and manually invoked tests where needed.
- Future shell support must require a separate ADR, threat model, UI approval
  design, and audit-log extension.

## Revisit Conditions

- The advisor requires test-running automation as a mandatory thesis feature.
- A restricted command runner can be specified with allowlisted commands,
  working-directory boundaries, timeout limits, and explicit approval.
- The MVP safety evaluation is complete and shell execution becomes future work.

## Related Documents

- `SYSTEM_PLAN.md`
- `SAFETY_AND_GUARDRAILS.md`
- `TESTING_AND_CI.md`
