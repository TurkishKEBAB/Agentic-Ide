# ADR-005: Cloud And Local Provider Boundary

## Status

Accepted

## Context

The project needs to compare local-first privacy behavior with practical cloud
model quality. At the same time, the codebase should not become tightly coupled
to one vendor SDK.

## Decision

Define a small provider boundary around chat, streaming, model metadata, health
checks, and usage/cost reporting.

Initial providers are:

- Cloud: Anthropic-compatible provider path for Claude models.
- Local: Ollama-compatible provider path for local models and embeddings.

The rest of the system talks to the boundary rather than directly to provider
SDKs.

## Consequences

- Provider changes are contained.
- Audit and benchmark logs can use a common model identity format.
- Provider-specific errors still need normalization before they reach the UI.
- API key storage and local model availability checks become first-class
  onboarding requirements.

## Revisit Conditions

- The MVP adds another cloud provider before evaluation.
- Provider SDK differences make the boundary too thin to be useful.
- Cost/latency tracking needs richer usage metadata than the first boundary
  exposes.

## Related Documents

- `TECH_STACK_AND_AI.md`
- `DATA_AND_PRIVACY.md`
- `COST_AND_PERFORMANCE.md`
