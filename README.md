# Agentic IDE

Agentic IDE is a graduation thesis prototype for a safety-oriented AI coding editor that measures whether a user-triggered, plan-first, approval-gated agent loop improves multi-file code changes through diff review, rollback, audit logs, and evidence-backed verification.

[PRODUCT_PLAN.md](PRODUCT_PLAN.md) is the source of truth for product scope and academic positioning. The engineering scope and handoff are fixed in [IMPLEMENTATION_BASELINE.md](docs/IMPLEMENTATION_BASELINE.md). VDD is proposed as a bounded traceability framework; the academic name/hypothesis awaits the first advisor meeting on 5 November 2026.

## Current Status

S1 ([#33](https://github.com/TurkishKEBAB/Agentic-Ide/issues/33), [#49](https://github.com/TurkishKEBAB/Agentic-Ide/issues/49); [acceptance evidence](docs/evidence/S1-issue-33-49-acceptance.md)) delivered the hardened Electron + Monaco + TypeScript shell behind the main-process workspace boundary. The desktop editor now also opens and manually saves existing UTF-8 files through that boundary ([#44](https://github.com/TurkishKEBAB/Agentic-Ide/issues/44)): saves are atomic, detect external changes and obey the protected-file rules.

The **İlk Göreve başla** tutorial shows the planned plan → diff → approval → rollback flow with a **simulated** agent on a synthetic in-memory project (`auth-lab`). There is no real agent or model provider yet, and nothing in the tutorial touches files on disk. The UI lives in [design-prototype/](design-prototype/README.md), which also runs as a browser preview. The research notes, architecture decisions, safety design and evaluation planning below remain the source of scope.

## Running the App

Requirements: Windows 10/11 (the demo OS) and Node.js 24 ([.nvmrc](.nvmrc)).

```powershell
.\start-app.cmd                                                        # or double-click it in Explorer
powershell -ExecutionPolicy Bypass -File .\scripts\start-app.ps1 -Dev  # Vite dev server with hot reload
```

[scripts/start-app.ps1](scripts/start-app.ps1) checks the Node.js version, runs `npm ci` when dependencies are missing or older than `package-lock.json` (`-Reinstall` forces it), clears `ELECTRON_RUN_AS_NODE` for the run (some IDE terminals set it, which stops Electron from opening a window), then builds and opens the app. Close the window to exit. On Linux or macOS run `npm ci` and `npm start`.

Choose **Klasör aç** to open a local workspace or **İlk Göreve başla** to learn in `auth-lab`. Use `Ctrl+P` to find a file and `Ctrl+S` to save. Local saves use a disk revision to detect conflicts and keep the draft open if the file has changed. The separate [browser preview instructions](design-prototype/README.md) cover the tutorial and its two extra exercises.

Quality gates are `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (Vitest with coverage, then the tutorial's Node tests), `npm run test:security`, `npm run build`, and `npm run test:e2e`.

## Core Documents

- [Supervisor brief](SUPERVISOR_BRIEF.md)
- [Advisor meeting decision list](ADVISOR_MEETING_AGENDA.md)
- [Product plan](PRODUCT_PLAN.md)
- [Verification-Driven Development planning draft](VERIFICATION_DRIVEN_DEVELOPMENT.md)
- [System plan](SYSTEM_PLAN.md)
- [Architecture options](ARCHITECTURE_OPTIONS.md)
- [Implementation readiness](docs/IMPLEMENTATION_READINESS.md)
- [Pre-implementation audit](docs/PRE_IMPLEMENTATION_AUDIT.md)
- [Quality gates](docs/QUALITY_GATES.md)
- [VS Code workspace analysis](docs/VSCODE_WORKSPACE_ANALYSIS.md)
- [GitHub Project operations](docs/GITHUB_PROJECT_OPERATIONS.md)
- [Glossary](docs/GLOSSARY.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Architecture decision records](docs/adr/README.md)
- [Agent architecture analysis](AGENT_ARCHITECTURE_ANALYSIS.md)
- [Safety and guardrails](SAFETY_AND_GUARDRAILS.md)
- [Testing and CI](TESTING_AND_CI.md)
- [Evaluation plan](EVALUATION_PLAN.md)
- [Evaluation protocol for advisor review](docs/EVALUATION_PROTOCOL.md)
- [Change lifecycle implementation contract proposal](docs/CHANGE_LIFECYCLE_CONTRACT.md)
- [Requirements traceability](docs/REQUIREMENTS_TRACEABILITY.md)
- [Literature and claims audit](docs/LITERATURE_AND_CLAIMS.md)
- [Project roadmap](PROJECT_ROADMAP.md)
- [Thesis outline](THESIS_OUTLINE.md)

## Planning Handoff — 4 November 2026

[The implementation baseline](docs/IMPLEMENTATION_BASELINE.md) defines the fixed MVP, interfaces, invariants,
S0–S6 delivery order and the separate advisor/research gates. The [planning closure report](working-notes/planning-2026-11-04/REVIEW.md)
records the evidence and GitHub reconciliation. Five pilot task examples and strict v2 lifecycle schemas are validated in CI.
Implementation and experiments have not been run. Milestone deadlines await the academic calendar.

The [7 October preparation archive](working-notes/advisor-2026-10-08/README.md) is historical; its assumed
8 October meeting date did not occur. The actual first meeting is 5 November 2026.

## GitHub Project Seed

The requirements backlog is defined in [github-projects/requirements-analysis.json](github-projects/requirements-analysis.json). The setup script creates labels, a GitHub Project, custom fields, epics, and requirement issues.

Dry run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 -Owner TurkishKEBAB -DryRun
```

Create or update the live project:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 -Owner TurkishKEBAB
```

## Repository Governance

The repository includes a lightweight governance CI workflow that validates:

- required GitHub metadata files
- the requirements project seed JSON
- the GitHub Project setup dry run
- common accidental secret or local IDE path patterns

Run it locally:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-github-governance.ps1 -Owner TurkishKEBAB
```

## Planned Tech Stack

- Electron
- Monaco Editor
- TypeScript
- Vitest
- Playwright for Electron E2E tests
- Local-first safety boundaries with optional cloud model providers

## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the repository owner.
