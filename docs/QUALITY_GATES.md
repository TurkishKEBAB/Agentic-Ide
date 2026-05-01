# Quality Gates

Status: Pre-implementation baseline

This document defines the gates that must protect Agentic IDE before and during implementation. The project is still in
planning, so some gates are armed as workflow placeholders and become blocking once `package.json` exists.

## Gate Levels

| Level | Gate                                     | Blocks PR?                            | Active Now? | Activation Trigger                         |
|-------|------------------------------------------|---------------------------------------|-------------|--------------------------------------------|
| G0    | Repository governance validation         | Yes                                   | Yes         | Always                                     |
| G0    | Markdown link and PlantUML validation    | Yes                                   | Yes         | Always                                     |
| G0    | Secret scan                              | Yes                                   | Yes         | Always                                     |
| G1    | App lint, format, typecheck, test, build | Yes                                   | Armed       | `package.json` + `package-lock.json` exist |
| G1    | Dependency review                        | Yes                                   | PR only     | Dependency manifest changes                |
| G1    | npm audit high/critical                  | Yes                                   | Armed       | `package-lock.json` exists                 |
| G1    | CodeQL JS/TS analysis                    | Yes when enabled in branch protection | Armed       | `package.json` exists                      |
| G1    | SBOM artifact                            | No, evidence artifact                 | Armed       | `package-lock.json` exists                 |
| G2    | Security property tests                  | Yes                                   | Planned     | Security modules exist                     |
| G2    | Electron smoke/E2E                       | Yes for release branches              | Planned     | Electron shell exists                      |
| G2    | Benchmark evidence export                | Yes for thesis milestones             | Planned     | Evaluation harness exists                  |

## Required npm Scripts

Once application code exists, `package.json` should expose these scripts:

```json
{
  "scripts": {
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --coverage",
    "test:security": "vitest run --config vitest.security.config.ts",
    "build": "electron-vite build"
  }
}
```

Optional but recommended scripts:

```json
{
  "scripts": {
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "knip": "knip",
    "sbom": "npm sbom --sbom-format cyclonedx > sbom.cdx.json"
  }
}
```

## Branch Protection Recommendation

Protect `main` before the first implementation PR:

- require pull requests before merging
- require conversation resolution
- require up-to-date branch before merge
- require these checks:
  - `Repository Governance / Validate repository governance`
  - `Documentation Checks / Validate documentation and diagrams`
  - `Security Checks / Secret scan`
  - `Application CI / App quality gate`
- add later, after app scaffold:
  - `CodeQL Analysis / Analyze JavaScript and TypeScript`
  - `Supply Chain Checks / npm audit and SBOM`

## VDD Evidence Rule

A PR is not done just because tests pass. For VDD, the PR must show:

- which requirement it satisfies
- what verification evidence was produced
- which risks were checked
- whether rollback/undo behavior changed
- whether the implementation agent and verification judgement are recorded separately

## Tooling Recommendation

Use a small mandatory stack first:

- ESLint + typescript-eslint
- Prettier
- Vitest + coverage-v8
- fast-check for security invariants
- Playwright for Electron E2E
- CodeQL for JS/TS semantic analysis
- npm audit and npm SBOM
- Gitleaks

Delay optional tools until the first prototype is stable:

- SonarCloud
- Codecov
- Knip
- Semgrep custom rules
- OpenSSF Scorecard as a tracked security-health signal

Do not add Trivy as a required gate yet. It is useful for container/filesystem scanning, but this project has no
container image today and action supply-chain risk should be reviewed before adding another privileged third-party
action.
