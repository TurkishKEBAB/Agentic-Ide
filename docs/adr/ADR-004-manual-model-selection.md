# ADR-004: Manual Model Selection For MVP

## Status

Accepted

## Context

The system supports both cloud and local model paths. Automatic routing by task
complexity is attractive, but it introduces another model, another evaluation
surface, and another possible source of user surprise.

The thesis needs the effect of plan-first, approval-gated interaction to remain
measurable without mixing in an opaque model-router variable.

## Decision

Use manual model selection in the MVP.

The user chooses local-only, manual hybrid, or cloud-only behavior in onboarding
and preferences. The system may show availability, cost, latency, and privacy
signals, but it must not automatically switch providers in MVP.

## Consequences

- Model choice is explicit and easier to explain in the thesis.
- The UI must make the active provider visible before each agent run.
- A future automatic router can be researched later without contaminating the
  MVP evaluation.
- Benchmark reports must record which provider/model was selected.

## Revisit Conditions

- Advisor feedback explicitly asks for automatic routing as a core research
  contribution.
- Manual choice creates enough user friction to block evaluation.
- A safe, deterministic routing policy can be defined and tested separately.

## Related Documents

- `TECH_STACK_AND_AI.md`
- `diagrams/UC/UC-05-konfigurasyon-ve-onboarding.puml`
- `diagrams/UC/UC-06-bulut-yerel-model-fallback.puml`
