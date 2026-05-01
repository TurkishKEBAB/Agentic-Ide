# VS Code Workspace Analysis

Status: Pre-implementation baseline

VS Code does not behave like IntelliJ IDEA or Fleet by default. Many VS Code language extensions report diagnostics
mainly for open files. To get project-wide signals in the Problems panel, this repo uses a workspace task with a custom
problem matcher.

## How To Use

Run the default build task:

```text
Ctrl+Shift+B -> Problems: Scan Workspace
```

This runs:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\vscode-problems.ps1 -Owner TurkishKEBAB
```

The task emits diagnostics in VS Code problem matcher format, so repo-level findings appear in the Problems panel.

## What Is Checked Today

- required repo readiness files
- JSON parse errors
- broken local Markdown links
- PlantUML start/end structure
- banned `Sandbox` terminology in MVP diagrams
- GitHub Actions guardrails
- tracked local-path or secret-like patterns
- app scaffold readiness once `package.json` exists
- GitHub Project seed dry run

## Extension-Based Diagnostics

Recommended extensions are stored in `.vscode/extensions.json`.

| Area                                  | Extension      |
|---------------------------------------|----------------|
| TypeScript/JavaScript linting         | ESLint         |
| Formatting                            | Prettier       |
| Markdown style                        | markdownlint   |
| PowerShell analysis                   | PowerShell     |
| YAML and Dependabot schema validation | YAML           |
| GitHub Actions workflow validation    | GitHub Actions |
| CodeQL query/code scanning support    | CodeQL         |
| PlantUML diagrams                     | PlantUML       |
| Electron E2E tests later              | Playwright     |
| Code smell assistance                 | SonarLint      |

## App Code Phase

After `package.json` is introduced, add:

- strict `tsconfig.json`
- `eslint.config.js`
- Prettier config
- Vitest config
- Playwright config
- Husky + lint-staged + commitlint

The existing `Application CI` workflow and `Problems: Scan Workspace` task are already prepared to start enforcing
`format:check`, `lint`, `typecheck`, `test`, `test:security`, and `build` scripts once they exist.

## Honest Limitation

VS Code can approximate project-wide analysis with tasks, problem matchers, and language-server settings. It is not as
coherent as IntelliJ/Fleet for whole-project indexing, inspections, refactor analysis, and always-on workspace
diagnostics.

For this repo right now, VS Code is enough because the project is mostly Markdown, JSON, YAML, PowerShell, and PlantUML
planning artifacts. Once the Electron + TypeScript application grows, IntelliJ IDEA/WebStorm or Fleet may provide a
stronger whole-project static-analysis experience, especially for TypeScript refactors and cross-file inspections.
