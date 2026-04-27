# Security Policy

Agentic IDE is a research prototype for safer AI-assisted code editing. Security-related reports are welcome, especially around file boundaries, path traversal, secret handling, unauthorized writes, rollback, and audit logging.

## Supported Versions

The project is pre-release. Security fixes will target the current `main` branch unless a release branch exists.

## Reporting a Vulnerability

Do not publish secrets, exploit payloads, or private data in a public issue.

For non-sensitive security improvements, open a GitHub issue using the requirement or bug template. For sensitive reports, contact the repository owner privately through GitHub until private vulnerability reporting is enabled for this repository.

## Security Design References

- [Safety and guardrails](SAFETY_AND_GUARDRAILS.md)
- [Data and privacy](DATA_AND_PRIVACY.md)
- [Testing and CI](TESTING_AND_CI.md)
