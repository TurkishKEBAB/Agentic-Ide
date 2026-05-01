# Threat Model

Status: Pre-implementation baseline

## Scope

This threat model covers the MVP:

- Electron + Monaco desktop shell
- local workspace selection
- retrieval/indexing
- model provider calls
- plan/diff/apply flow
- audit logging
- rollback

Out of MVP scope:

- shell command execution
- package installation by the agent
- autonomous background code modification
- cloud accounts or multi-user collaboration

## Assets

| Asset                        | Why It Matters                             |
|------------------------------|--------------------------------------------|
| Source code                  | May contain proprietary or sensitive logic |
| Secrets and config files     | Must not enter model context or logs       |
| User intent and requirements | Defines authority for verification         |
| Audit log                    | Thesis evidence and accountability record  |
| Workspace boundary           | Prevents unwanted file access              |
| Model provider key           | Enables paid/cloud model access            |

## STRIDE Summary

| Threat                 | Example                                             | Mitigation                                                           |
|------------------------|-----------------------------------------------------|----------------------------------------------------------------------|
| Spoofing               | Malicious file claims to be a trusted instruction   | Treat repo text as data; separate system/developer/user instructions |
| Tampering              | Agent edits files outside intended diff             | Workspace boundary, protected-file rules, approval gate              |
| Repudiation            | User or AI cannot explain why a change happened     | Append-only audit events and explicit accept/reject records          |
| Information disclosure | `.env` or `.npmrc` enters prompt or embedding index | File filter before retrieval, prompt build, and indexing             |
| Denial of service      | Huge diff or indexing pass freezes the app          | large edit threshold, indexing budget, cancellation                  |
| Elevation of privilege | Prompt injection asks agent to run shell commands   | no-shell MVP ADR, tool whitelist, verification agent review          |

## Required Security Tests

- path traversal and Windows path normalization
- symlink escape from workspace
- protected file read/write attempts
- secret-in-diff detection
- prompt injection fixture in repository text
- audit log redaction
- rollback transaction integrity

## Open Decisions

- Whether verifier and implementation roles must use separate models or only separate prompts for MVP.
- Whether the audit log should be encrypted at rest in the first prototype.
- Whether OS keychain storage replaces file-based API-key storage before final demo.
