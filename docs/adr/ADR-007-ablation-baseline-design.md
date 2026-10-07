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

- The approval gate can become an isolatable B/C variable when other generation,
  retrieval, and mandatory safety behavior is held constant. A/C compares whole
  workflows rather than isolating the gate.
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

## Proposed Evaluation Clarification — Advisor Review Pending

The accepted core A/B/C decision remains in force. Detailed methods below are
advisor-review proposals, not a retrospective claim that an experiment ran.

- Disable only the general plan/diff approval gate in B. Keep mandatory
  workspace, protected-file, secret, and large-edit behavior the same in B/C;
  automatic large-edit continuation must not be an unreported second change.
- Run B only in disposable research fixtures without real secrets.
- Separate candidate correctness, human decision, and final task outcome.
- Use real C review decisions; approve-all does not measure human review value.
  Participants are not called blind when they see the gate UI.
- Freeze independent task oracles, versions, budgets, and paired analysis before
  main data collection. Report 16 writing tasks and 4 Q&A separately.
- Resolve VDD's thesis role before claiming this ablation validates a broader
  methodology or independent verifier role.

Details: [Evaluation Protocol](../EVALUATION_PROTOCOL.md).

## Related Documents

- `EVALUATION_PLAN.md`
- `docs/benchmark/README.md`
- `diagrams/UC/UC-04-benchmark-ve-degerlendirme.puml`
