# Staged implementation readiness

4 November 2026 technical handoff. [IMPLEMENTATION_BASELINE](IMPLEMENTATION_BASELINE.md) is the active contract.
No advisor meeting has occurred; first meeting is 5 November. Academic approval is never inferred from priority or an ADR.

## S1 safe foundation gate

- Repo ADR-001–009, typed lifecycle contracts, privacy/accessibility/threat baselines and active G0 CI exist.
- A single slice has explicit scope, acceptance cases, source, risk, owner, test and evidence target.
- The slice's real upstream dependencies are completed. Merely listing an unresolved blocker does not satisfy DoR.
- #33 safe Electron/Monaco shell and #49 pure workspace policy were the first ready implementation items. Both are
  Done with runtime evidence in [S1 acceptance evidence](evidence/S1-issue-33-49-acceptance.md) (7 November 2026).
- No model execution, agent write or human study is part of S1. Formal benchmark approval does not block this read-only foundation.

## Later gates

S2 adds typed IPC/credentials/read-only providers and context only after security boundaries exist.
Its manual file flow (#44: open, reload, save, five-file working set) is Done with runtime evidence in
[S2 #44 acceptance evidence](evidence/S2-issue-44-acceptance.md); providers, credentials and context are still open.
S3 actual write requires current v2 plan/patch/approval, mandatory policy, audit, durable journal and fault/recovery tests.
S4 adds dependency-aware partial approval and multi-file transactions after single-file recovery evidence.
S5 formal research requires real #20/#54/#66/#25 decisions, #113 participant decision, independent oracle and immutable
model/task/fixture/protocol freeze. No participant data collection precedes the required consent process.

## Definition of Ready

One PR-sized outcome; testable positive/negative/error criteria; linked authoritative source; explicit non-goals;
owner/risk/test/evidence/quality gate; all real upstream prerequisites resolved. Epics and future umbrella test
coverage are not automatically Ready. A discussion-ready question can be Review while implementation readiness is unknown.

## Definition of Done

Relevant change merged, acceptance evidence captured, applicable validation passed, issue/seed/Project consistent.
Document tasks close on merged document/schema evidence; application tasks need runtime acceptance evidence.
Done does not mean advisor approved or a model benchmark succeeded. Ready is explicit, never priority-derived.

Ordinary metadata sync preserves live Status/Readiness. `-SyncWorkflowStatus` is an intentional reviewed reset;
keep canonical stable issue numbers, explicit workflow/readiness and completion evidence current when using it.
