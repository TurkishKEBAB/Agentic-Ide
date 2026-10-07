# Benchmark Planning

The benchmark is the thesis evidence engine. It should be small, repeatable, and
aligned with the product claim: plan-first, approval-gated coding assistance can
improve reviewability and safety without destroying task success.

## Minimum Task Set

| Category              | Count | Main metric                                          |
|-----------------------|------:|------------------------------------------------------|
| Bug fix               |     4 | Task success and correct target file                 |
| Multi-file refactor   |     4 | Reference update correctness and unwanted diff count |
| Test writing          |     3 | Independent fault detection and requirement coverage |
| Codebase Q&A          |     4 | Citation accuracy and claim coverage                 |
| Safe single-file edit |     5 | Workspace/protected-file behavior                    |

Total: **20 tasks** (16 writing tasks and 4 Q&A). This is the canonical planned
distribution from `EVALUATION_PLAN.md`; advisor signoff and actual fixtures are
pending. A separate adversarial security suite has its own denominator.

## Evaluation Conditions

- `A`: direct LLM answer.
- `B`: Agentic IDE with approval gate disabled by experimental evaluation flag.
- `C`: full Agentic IDE workflow.

A/C compares whole workflows. Only B/C targets approval, with the same model,
generation, retrieval, and mandatory safety policies. Proposed clarification:
large-edit continue/cancel behavior stays the same in B/C; B does not bypass
this safety decision. The experimental flag is unavailable in normal product
mode. Read-only Q&A is reported separately from gate effects.

[Evaluation Protocol](../EVALUATION_PROTOCOL.md) defines the method and open
advisor decisions. It is a proposal, not completed experimentation or proof of
VDD effectiveness.

## Evidence To Capture

- `run_id`
- `task_id`
- condition `A`, `B`, or `C`
- model provider and model name
- selected context sources
- plan summary
- diff summary
- approval decision
- rollback decision
- safety warnings
- final rubric score

Also capture fixture commit/hash, task/prompt/policy/model versions, repeat and
operator pseudonym, candidate/final hashes, external oracle evidence, total/review
timing, complete usage, failure/timeout reasons, and protocol deviations. A needs
an external logger because it does not produce IDE audit events. The audit event
schema is not a complete run-result schema.

## Before Implementation

Create the first five benchmark tasks as plain JSON examples that validate
against `docs/schemas/benchmark-task.schema.json`. Do this before building the
benchmark runner so the runner is shaped by real task data, not the other way
around.

Keep these five development pilot examples separate from the final 20. Freeze
independent acceptance/regression checks before main runs; generated tests are
not the final oracle. Evaluators run checks outside the agent. No shell or
arbitrary process execution tool is added to the MVP.
