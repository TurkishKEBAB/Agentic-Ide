# Agentic IDE

Agentic IDE is a graduation thesis prototype for a safety-oriented AI coding editor that measures whether a user-triggered, plan-first, approval-gated agent loop improves multi-file code changes through diff review, rollback, audit logs, and evidence-backed verification.

[PRODUCT_PLAN.md](PRODUCT_PLAN.md) is the source of truth for product scope and academic positioning. Verification-Driven Development (VDD) is treated as a supporting thesis framing for evidence, traceability, and rollback decisions, not as a separate MVP product.

## Current Status

This repository is currently in the thesis planning and requirements phase. The main artifacts are research notes, architecture decisions, safety design, evaluation planning, and GitHub Project seed data. Implementation work will start from the Electron + Monaco + TypeScript stack described in the project documents.

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

## First Advisor Meeting — 8 October 2026

The [review package](working-notes/advisor-2026-10-08/README.md) contains the detailed architecture, evaluation and
GitHub backlog reviews, the decision agenda, and a ready-to-copy Claude Design presentation prompt. Recommendations
are explicitly separated from advisor approvals and implemented evidence. Milestone dates remain pending confirmation
of the academic calendar.

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
