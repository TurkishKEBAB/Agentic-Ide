# ADR-009: Prompt And Model Versioning

## Status

Accepted

## Context

Agentic IDE's thesis evidence depends on reproducible AI behavior. If prompts, model names, provider settings, retrieval policy, or verifier instructions change without a version record, benchmark results and advisor-review evidence become difficult to trust.

This risk is stronger in VDD because the project distinguishes implementation evidence from verification evidence.

## Decision

Version all high-impact AI behavior inputs:

- implementation prompt template
- verification prompt template
- model provider and model id
- temperature and relevant generation settings
- retrieval policy version
- safety policy version
- benchmark task version

Audit events and benchmark exports must record these versions.

## Consequences

- Benchmark runs can be compared across changes.
- Advisor review can distinguish a model failure from a prompt/policy change.
- Prompt edits become architecture-relevant changes, not invisible text tweaks.
- The first implementation can use simple semantic versions such as `impl-prompt@0.1.0` and `verifier-prompt@0.1.0`.

## Revisit Conditions

- Prompt templates move into a database or user-editable configuration.
- Multiple model providers are compared in the same benchmark.
- The verifier role becomes a separate model or separate agent runtime.

## Related Documents

- `VERIFICATION_DRIVEN_DEVELOPMENT.md`
- `EVALUATION_PLAN.md`
- `docs/schemas/audit-event.schema.json`
- `docs/QUALITY_GATES.md`
