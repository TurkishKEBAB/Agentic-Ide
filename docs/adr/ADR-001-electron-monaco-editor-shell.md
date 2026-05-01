# ADR-001: Electron + Monaco Editor Shell

## Status

Accepted

## Context

The project needs a desktop coding environment with local file access, a mature
code editor, diff review, and enough TypeScript ecosystem support for LLM APIs,
retrieval, testing, and packaging. The evaluated alternatives are Electron,
Tauri, a browser-only application, and a VS Code extension.

## Decision

Use Electron with Monaco Editor for the MVP application shell.

The implementation should start with a simple Electron/Vite-style structure and
Monaco for the editor and diff viewer. Packaging can stay minimal until the demo
and thesis evaluation phases.

## Consequences

- The team can stay in TypeScript across UI, desktop integration, and agent
  orchestration.
- Monaco gives a realistic IDE-quality editor surface without building editor
  primitives from scratch.
- Electron increases memory footprint and application size, which should be
  measured but is acceptable for the thesis MVP.
- Renderer/main-process boundaries must be handled carefully because Electron
  security mistakes can weaken the safety claims.

## Revisit Conditions

- Electron memory or startup time blocks the benchmark or demo experience.
- Monaco integration requires a capability that Electron cannot support cleanly.
- A hard distribution constraint makes the Electron bundle unacceptable.

## Related Documents

- `ARCHITECTURE_OPTIONS.md`
- `SYSTEM_PLAN.md`
- `TECH_STACK_AND_AI.md`
