# GitHub Project Operations

Status: Pre-implementation baseline

This document explains how the seeded GitHub Project should be used before implementation starts.

## Source Of Truth

The canonical backlog is:

- `github-projects/requirements-analysis.json`

The setup automation is:

- `scripts/setup-requirements-github-project.ps1`

Do not treat manually created Project cards as authoritative unless they are later copied back into the seed JSON.

## Project Fields

Required custom fields:

- `Requirement Status`
- `Area`
- `Requirement Type`
- `Phase`
- `Priority`
- `Source Doc`
- `Acceptance Criteria`
- `Target Date`
- `Parent Epic`
- `MVP Scenario`
- `Risk`
- `Test Target`
- `Thesis Evidence`
- `Readiness`

Use GitHub's built-in `Status` field for operational workflow state:

- `Backlog`
- `Ready`
- `In Progress`
- `Review`
- `Done`
- `Deferred`

Do not overload `Requirement Status` with PR workflow states such as `In Review` or `Testing/QA`. `Requirement Status`
is for thesis requirement maturity; built-in `Status` is for work execution.

## Recommended Views

| View                | Purpose                          | Grouping    | Filter                              |
|---------------------|----------------------------------|-------------|-------------------------------------|
| Requirements Master | Full backlog audit               | Parent Epic | None                                |
| Advisor Review      | Advisor decision queue           | Area        | Requirement Status = Advisor Review |
| By Phase            | Phase planning                   | Phase       | None                                |
| Roadmap             | Time and milestone planning      | Phase       | Optional dates                      |
| Quality Gates       | CI, safety, evaluation readiness | Readiness   | Area = Testing/Evaluation/Safety    |

The setup script stores these view intentions in JSON. GitHub's stable automation support for fine-grained view filters
is limited, so final grouping and visible columns may still need one manual UI pass.

## Label Policy

Use project fields for structured thesis data. Use labels for quick triage:

- type labels: `epic`, `req:*`, `task:*`, `adr`, `spike`
- operations labels: `bug`, `enhancement`, `documentation`, `tech-debt`
- automation labels: `dependencies`, `github-actions`, `quality-gate`
- risk labels: `blocked`, `security`
- research framing: `vdd`

Avoid duplicating every Project field as a label. For example, `Priority` belongs in the Project field, not as the
primary tracking mechanism.

## Sync Rules

Run a dry run first:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 -Owner TurkishKEBAB -DryRun
```

Sync the live Project only after reviewing the dry-run result:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 -Owner TurkishKEBAB
```

Only use `-SyncWorkflowStatus` during initial setup or planned backlog resets. It can overwrite day-to-day workflow
status.
