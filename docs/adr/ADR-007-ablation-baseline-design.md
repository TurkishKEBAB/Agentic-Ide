# ADR-007: Ablation Baseline Design

## Status

Accepted

## Context

The thesis needs to evaluate whether the plan-first, approval-gated workflow
improves trust, safety, and reviewability. A fair comparison must isolate the
approval and diff-review mechanics instead of comparing unrelated tools.

## Decision

Use a three-condition A/B/C evaluation design:

- `A`: direct LLM answer outside the Agentic IDE workflow.
- `B`: same Agentic IDE codebase with an experimental
  `--experimental-disable-approval-gate` condition.
- `C`: full Agentic IDE workflow with plan, diff preview, approval, audit log,
  and rollback.

Condition B is not a separate product. It is the same implementation with the
approval gate disabled for evaluation only.

## Consequences

- The approval gate becomes an isolatable variable.
- Benchmark logs must record `condition`, `run_id`, `task_id`, model, and user
  decision data.
- The disabled-gate flag must be clearly marked experimental and unavailable in
  normal user-facing MVP mode.
- Advisor review should approve the task categories before implementation of the
  benchmark harness.

## Revisit Conditions

- The advisor requests a different baseline.
- The disabled-gate condition creates safety concerns that cannot be contained.
- The benchmark task set changes in a way that makes direct LLM comparison
  misleading.

## Related Documents

- `EVALUATION_PLAN.md`
- `docs/benchmark/README.md`
- `diagrams/UC/UC-04-benchmark-ve-degerlendirme.puml`
