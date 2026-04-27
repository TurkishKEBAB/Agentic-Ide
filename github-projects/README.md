# GitHub Requirements Project Seed

This folder contains the seed data and automation for the `Agentic IDE - Requirements Analysis` GitHub Project.

## Files

- `requirements-analysis.json`: canonical project spec, field definitions, labels, epics, and requirement issues
- [`setup-requirements-github-project.ps1`](/c:/Develop/Projects/Agentic%20Ide/Agentic-Ide/scripts/setup-requirements-github-project.ps1): creates the project, fields, labels, issues, and adds them to the project

## What Gets Created

- A new GitHub Project named `Agentic IDE - Requirements Analysis`
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
- Repository labels for epics, requirements, research items, and risks
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

Optional overrides:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-requirements-github-project.ps1 `
  -Owner TurkishKEBAB `
  -Repo TurkishKEBAB/Agentic-Ide `
  -ProjectTitle "Agentic IDE - Requirements Analysis"
```

## Notes

- The script is designed to be safely rerunnable for labels, fields, and issues.
- Project view creation is best-effort because GitHub exposes fewer stable automation hooks for fine-grained view configuration than it does for fields and items.
- If view creation succeeds, you still may want to fine-tune grouping and visible columns once in the GitHub UI.
