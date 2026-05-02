# GitHub Requirements Project Seed

This folder contains the seed data and automation for the `Agentic IDE - Thesis Backlog` GitHub Project.

## Files

- `requirements-analysis.json`: canonical project spec, field definitions, labels, epics, and requirement issues
- [`setup-requirements-github-project.ps1`](../scripts/setup-requirements-github-project.ps1): creates the project, fields, labels, issues, and adds them to the project

## What Gets Created

- A new GitHub Project named `Agentic IDE - Thesis Backlog`
- Custom project fields:
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
  - `Blocked by`
  - `Blocking`
  - `Dependency Count`
  - `Blocking Count`
  - `Child Issue Count`
- Project views for:
  - `Requirements Master`
  - `Workflow Board`
  - `Advisor Review`
  - `By Phase`
  - `Evidence Matrix`
  - `Risks`
  - `Dependency Map`
  - `Dependency Map Detailed`
  - `Faz 1 Readiness Gate`
  - `Implementation Queue`
  - `Implementation Queue Detailed`
  - `VDD Research`
  - `Safety & Privacy`
  - `Quality Gates`
  - `CI / Project Ops`
  - `Roadmap`
- Repository labels for epics, requirements, research items, and risks
- Operational labels for bugs, dependencies, documentation, security, quality gates, and VDD research framing
- Repository milestones (`Faz 1 - Implementation Readiness`, `Faz 2 - MVP`, `Faz 3 - Evaluation & Thesis`) auto-assigned from each issue's `Phase` field
- Native GitHub parent / sub-issue links created from each issue's `parentKey` (epic relationship is wired through the real GraphQL `addSubIssue` mutation, not just the `Parent Epic` text field)
- Native GitHub issue dependencies created from optional `blockedByKeys` entries (`blocked by` relationships are synced through GitHub's REST issue dependencies API)
- Readable dependency summary fields are populated from the same source: `Blocked by`, `Blocking`, `Dependency Count`, `Blocking Count`, and `Child Issue Count`
- Epic issues and requirement issues derived from the current thesis documents

## Why `Requirement Status` Instead Of `Status`

GitHub Projects already ships with a built-in `Status` field. The seed uses a custom field named `Requirement Status` so we can keep the thesis-specific states from the plan:

- `Draft`
- `Advisor Review`
- `Approved`
- `Planned`
- `In Progress`
- `Done`
- `Deferred`

## Before Running

The local `gh` CLI must be authenticated with repository and project scopes before creating the live GitHub Project:

```powershell
gh auth login -h github.com
gh auth refresh -h github.com -s project
```

## Usage

Dry run first:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 -Owner TurkishKEBAB -DryRun
```

Create the live project:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 -Owner TurkishKEBAB
```

Synchronize the workflow `Status` field during initial setup or planned backlog resets:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 `
  -Owner TurkishKEBAB `
  -ProjectTitle "Agentic IDE - Thesis Backlog" `
  -SyncWorkflowStatus
```

Optional overrides:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 `
  -Owner TurkishKEBAB `
  -Repo TurkishKEBAB/Agentic-Ide `
  -ProjectTitle "Agentic IDE - Thesis Backlog"
```

## Notes

- The script is designed to be safely rerunnable for labels, fields, and issues.
- Verification-Driven Development planning cards are seeded with `Requirement Status = Advisor Review` so the TDD/VDD stance, spiral requirements control, and implementation-verification separation can be discussed before approval.
- View metadata in `requirements-analysis.json` records intended filters, visible fields, grouping, sorting, board columns, swimlanes, roadmap date field, slice field, and field-sum intent.
- Use the built-in GitHub Project `Status` field for workflow execution (`Backlog`, `Ready`, `In Progress`, `Review`, `Done`, `Deferred`). Use `Requirement Status` for thesis requirement maturity only.
- Project view creation uses GitHub's REST Project views endpoint for user-owned projects (`/users/{user_id}/projectsV2/{project_number}/views`). Creating new views can include `visible_fields`; existing view updates are best-effort because GitHub's documented endpoint is creation-focused.
- If a view already exists and GitHub rejects the automatic update, use the GitHub UI once to align that view with the seed. The `Dependency Map Detailed` view exists as a clean fallback when an older manually-created `Dependency Map` cannot be patched in place.
- Recommended workflow columns for the built-in `Status` field are `Backlog`, `Ready`, `In Progress`, `Review`, `Done`, and `Deferred`.
- `-SyncWorkflowStatus` sets epics to `Review`, Faz 1 P0 child issues to `Ready`, and the rest to `Backlog`; omit it after active development starts so day-to-day status is not reset.
- `Readiness` is set automatically from the seed: advisor-review or Faz 1 P0 cards become `Ready`, approved/done cards become `Validated`, deferred/blocked cards become `Blocked`, and the rest stay `Needs Clarification`.
- GitHub's stable CLI/API support can create fields and update item values, but fine-grained view layout, grouping, and visible-column tuning should still be finished in the GitHub UI.
