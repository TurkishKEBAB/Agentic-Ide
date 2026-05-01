# Benchmark Planning

The benchmark is the thesis evidence engine. It should be small, repeatable, and
aligned with the product claim: plan-first, approval-gated coding assistance can
improve reviewability and safety without destroying task success.

## Minimum Task Set

| Category              | Count | Main metric                                          |
|-----------------------|------:|------------------------------------------------------|
| Bug fix               |     5 | Task success and correct target file                 |
| Multi-file refactor   |     5 | Reference update correctness and unwanted diff count |
| Test writing          |     5 | Test relevance and pass/fail result                  |
| Codebase Q&A          |     5 | Citation accuracy and hallucination count            |
| Safe single-file edit |     5 | Workspace/protected-file behavior                    |

## Evaluation Conditions

- `A`: direct LLM answer.
- `B`: Agentic IDE with approval gate disabled by experimental evaluation flag.
- `C`: full Agentic IDE workflow.

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

## Before Implementation

Create the first five benchmark tasks as plain JSON examples that validate
against `docs/schemas/benchmark-task.schema.json`. Do this before building the
benchmark runner so the runner is shaped by real task data, not the other way
around.
