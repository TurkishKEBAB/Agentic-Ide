# Planning Schemas

## Active v2 lifecycle contracts — 4 November 2026

The v1 `plan.schema.json` and `audit-event.schema.json` remain historical readers. New runtime records use
the strict v2 schemas below. No application records need migration yet because no app implementation exists.
Config/task/requirements schemas retain their existing version; they have different purposes.

| Schema | Purpose |
|--------|---------|
| [contract-types](contract-types.schema.json) | Shared opaque IDs, SHA-256 hashes, relative paths, model and version manifest |
| [plan-v2](plan-v2.schema.json) | Revisioned plan, requirement references, source hashes and required policy/prompt versions |
| [patch-set](patch-set.schema.json) | Exact base/proposed hashes, dependency groups and staged-content references |
| [approval](approval.schema.json) | Human decision bound to workspace, patch fingerprint, scope and 10-minute expiry |
| [transaction](transaction.schema.json) | Durable journal, file state, recovery and distinct human/experimental authorization |
| [evidence](evidence.schema.json) | Patch/tree-bound external test or review evidence, including explicit not-run |
| [audit-event-v2](audit-event-v2.schema.json) | Sanitized lifecycle events and cross-record correlation; no raw payload escape hatch |
| [benchmark-run](benchmark-run.schema.json) | External A/B/C results with fixture/model/protocol versions, budgets, explicit not-run and nullable metrics |

Seven [synthetic examples](examples/plan-v2.json) describe formats, not executed experiments. They deliberately use a
synthetic model and `not-run` evidence. [Validator](../../scripts/validate-planning-contracts.py) checks schemas,
cross-record invariants, unsafe examples, pilot task paths and the requirements DAG.

```powershell
uv run --with-requirements scripts/requirements-planning.txt python scripts/validate-planning-contracts.py
```

Schema validation does not prove sender authorization, real byte hashes, provider credentials, safe filesystem
handles, complete journals or external evidence provenance; the broker and runtime tests must establish those.

### Fingerprint and selection rules

Fingerprint v1 is SHA-256 of UTF-8 canonical JSON for `planId`, `planRevision`, `workspaceId`, `safetyPolicyVersion`
and each file's `path`, `operation`, `baseHash`, `proposedHash`, `dependencyGroup`. Sort files by UTF-8 path bytes;
sort object keys lexicographically, use compact separators, unescaped Unicode and JSON string escaping, and no NaN.
The projection contains strings/null and the integer revision only. Staging refs/timestamps are excluded.
The build/validator scripts provide the exact canonical example; cross-language parity is required before apply.

Selecting independent file groups stages a new selected patch set and re-computes this fingerprint before final
approval. Partial dependent groups are rejected. A stale expiry/base/policy or modified preview invalidates approval.
Experimental B transactions have fixture/capability authorization and never fabricate a human approval.
Normal product records cannot select that capability via config or renderer input.

### Compatibility and ownership

- v1 records are read-only historical artifacts and cannot authorize a v2 write.
- Unsupported schema versions fail closed. No permissive coercion/default approval is allowed.
- A record's producer owns it: the model proposes a plan, broker stages and commits, human decides, external harness
  supplies test evidence. A schema-valid claim from the wrong producer is not trusted.
- `versions.requirementsVersion` pins the canonical requirement/criterion set (commit or immutable manifest version).
  Requirement and criterion IDs resolve against that version; a changed requirement does not reuse prior evidence.
- `completionEvidence` in requirements points to document/test artifacts; `Done` still requires merged evidence.
- Stable `githubIssueNumber` prevents a title edit from creating a duplicate issue. Workflow/readiness are explicit,
  and an ordinary metadata sync preserves live operational state unless a reset sync is deliberately requested.

## Legacy and other planning schemas

These schemas are planning contracts. They do not force the implementation shape
yet, but they make the core data types explicit before code starts.

| Schema | Purpose |
|---|---|
| [plan.schema.json](plan.schema.json) | Agent plan shown before any write |
| [audit-event.schema.json](audit-event.schema.json) | Append-only audit log event |
| [config.schema.json](config.schema.json) | Local user/project configuration |
| [benchmark-task.schema.json](benchmark-task.schema.json) | Thesis benchmark task definition |
| [requirements-project.schema.json](requirements-project.schema.json) | GitHub Project seed structure for editor validation |

The implementation can refine these schemas, but incompatible changes should be
recorded in the related Project card and, if architectural, in an ADR.

Prompt, model, retrieval-policy, safety-policy, and benchmark-task versions must
be recorded in audit and evaluation artifacts. See
[ADR-009](../adr/ADR-009-prompt-model-versioning.md).
