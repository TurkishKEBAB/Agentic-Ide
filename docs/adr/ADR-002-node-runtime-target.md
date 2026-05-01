# ADR-002: Node Runtime Target

## Status

Accepted

## Context

The original technical stack referenced Node 20 LTS. As of 2026-05-01, Node 20 is
end-of-life in the official Node.js release schedule. Starting new application
work on an EOL runtime would create avoidable security and dependency risk.

Electron also embeds its own Node version, so the project must distinguish the
CI/development Node target from the Node version available inside a specific
Electron release.

## Decision

Target Node 24 LTS for CI, local development scripts, and app tooling.

Use Node 22 LTS as the temporary fallback only if Electron, native modules, or a
required dependency blocks Node 24 during early implementation. If the fallback
is used, the reason must be recorded in the related GitHub Project card and
revisited before the first demo package.

## Consequences

- The implementation starts on a supported runtime line with a longer runway.
- Native dependencies such as SQLite/vector tooling must be smoke-tested early.
- The repo should eventually add `.nvmrc`, `package.json` engines, and a CI
  matrix once application code exists.
- Electron's embedded Node version must not be confused with the Node version
  used by repository tooling.

## Revisit Conditions

- Electron's supported Node line conflicts with Node 24-only code.
- A required native dependency fails on Node 24 but passes on Node 22.
- Node.js release dates change or a security advisory makes a different LTS line
  preferable.

## Related Documents

- `TECH_STACK_AND_AI.md`
- `TOOLING_AND_REFERENCE_RECOMMENDATIONS.md`
- `docs/IMPLEMENTATION_READINESS.md`
