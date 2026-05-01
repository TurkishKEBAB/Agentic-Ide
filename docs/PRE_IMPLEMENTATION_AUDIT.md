# Pre-Implementation Audit

Status: Updated before first app scaffold

## Verdict

The repository is strong as a thesis planning repository, but implementation should not start until the P0 gates below
are either complete or explicitly accepted as risk.

## P0 Before First App Scaffold

| Area                    | Gate                                                                      | Status |
|-------------------------|---------------------------------------------------------------------------|--------|
| Runtime                 | `.nvmrc` targets Node 24                                                  | Done   |
| GitHub Project          | Seed has fields, labels, views, and stricter validation                   | Done   |
| CI                      | App quality gate workflow exists and activates when `package.json` exists | Done   |
| Security                | Gitleaks and dependency review exist                                      | Done   |
| Code scanning           | CodeQL workflow exists and activates when app code exists                 | Done   |
| Supply chain            | npm audit and SBOM workflow exists and activates when lockfile exists     | Done   |
| Issue intake            | ADR, spike, research, security, and quality gate templates exist          | Done   |
| Branch protection       | Main branch ruleset configured in GitHub UI                               | Manual |
| Prompt/model versioning | ADR exists                                                                | Done   |
| Threat model            | MVP threat model exists                                                   | Done   |

## P1 During First Implementation Sprint

| Area           | Gate                                                                             |
|----------------|----------------------------------------------------------------------------------|
| App scaffold   | `package.json`, `package-lock.json`, strict `tsconfig`, ESLint, Prettier, Vitest |
| Local hooks    | Husky + lint-staged + commitlint after package manager is initialized            |
| Security tests | Path traversal, protected file, secret filter, rollback transaction tests        |
| Coverage       | coverage-v8 threshold configured                                                 |
| Electron       | smoke test for app launch and file-open flow                                     |
| VDD            | separate implementation and verification traces in audit schema                  |

## Manual GitHub UI Checklist

- Protect `main`.
- Require PR before merge.
- Require status checks listed in `docs/QUALITY_GATES.md`.
- Group Advisor Review view by `Area`.
- Group Quality Gates view by `Readiness`.
- Confirm repository secret scanning/push protection settings if available.
