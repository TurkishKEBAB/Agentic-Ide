# Incident Response Runbook

Status: Pre-implementation baseline

Use this runbook when the prototype leaks data, applies an unsafe diff, writes outside the workspace boundary, exposes a
token, or produces misleading thesis evidence.

## Severity

| Severity | Meaning                                                  | Required Response                                         |
|----------|----------------------------------------------------------|-----------------------------------------------------------|
| S0       | Secret leaked publicly or unsafe write outside workspace | Stop work, revoke secrets, preserve evidence              |
| S1       | Protected file entered model context or audit log        | Stop affected feature, sanitize logs, add regression test |
| S2       | Incorrect diff applied but rollback works                | Roll back, record issue, add test                         |
| S3       | Documentation or evidence inconsistency                  | Fix docs/backlog before next advisor review               |

## Response Steps

1. Stop the affected workflow.
2. Preserve the audit log and failing input as evidence.
3. Revoke any exposed API key or token.
4. Roll back unsafe file changes.
5. Create a `SECURITY:` issue using the security-hardening template.
6. Add or update a regression test before re-enabling the feature.
7. Update the threat model or ADR if the incident changes an assumption.

## Do Not Do

- Do not delete evidence before extracting a sanitized reproduction.
- Do not continue benchmark runs with known-invalid evidence.
- Do not broaden tool permissions as a quick workaround.
