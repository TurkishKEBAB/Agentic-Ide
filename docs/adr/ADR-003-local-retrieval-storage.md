# ADR-003: Local Retrieval Storage

## Status

Accepted

## Context

The product promise is local-first and privacy-aware. The retrieval layer must
support codebase Q&A, agent planning, source citations, and benchmark evidence
without requiring a hosted vector database.

## Decision

Use SQLite as the local metadata store and sqlite-vec as the first vector search
candidate for MVP retrieval.

Keep retrieval behind a small `ContextStore` or equivalent adapter so a future
change to another vector index does not leak into the agent loop or UI.

## Consequences

- The prototype can run with a portable local database.
- Benchmark runs can archive retrieval inputs and citation outputs more easily.
- sqlite-vec maturity risk is real, so the adapter must hide extension-specific
  query details.
- The privacy filter must run before indexing and before prompt construction.

## Revisit Conditions

- sqlite-vec install or runtime behavior is unstable on the target demo machine.
- Retrieval latency is too high for the benchmark task set.
- Multi-language parsing or chunking requirements outgrow the simple MVP store.

## Related Documents

- `SYSTEM_PLAN.md`
- `DATA_AND_PRIVACY.md`
- `TESTING_AND_CI.md`
