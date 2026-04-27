# Contributing

This project is maintained as a graduation thesis and research prototype. Contributions should preserve the thesis scope, the safety-first architecture, and the documented evaluation plan.

## Standards

Use the detailed project standards in [CONTRIBUTION_AND_STANDARDS.md](CONTRIBUTION_AND_STANDARDS.md).

Short version:

- Use Conventional Commits.
- Keep changes small and reviewable.
- Add tests for new behavior when implementation code exists.
- Treat safety, path handling, rollback, and audit behavior as high-risk areas.
- Update documentation when architecture or evaluation assumptions change.

## Pull Requests

Before opening a PR:

- Run the available validation scripts.
- Explain the motivation and scope clearly.
- Link related issues or requirement items.
- Avoid committing local IDE state, secrets, generated caches, or environment files.

## Scope Discipline

This project deliberately prioritizes a focused MVP over feature parity with commercial AI IDEs. Large refactors, new model providers, proactive behavior, and multi-agent coordination should be tied to documented requirements before implementation.
