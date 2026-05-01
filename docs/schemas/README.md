# Planning Schemas

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
