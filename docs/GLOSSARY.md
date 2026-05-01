# Glossary

Status: Pre-implementation baseline

| Term                    | Meaning                                                                                                                           |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Agentic IDE             | The thesis prototype: an AI-assisted IDE with plan-first, approval-gated, evidence-oriented development flow.                     |
| VDD                     | Verification-Driven Development; the proposed umbrella process where tests are evidence, not the only control mechanism.          |
| Requirement authority   | The person or AI/user partnership that owns the product intent for a requirement.                                                 |
| Implementation agent    | The AI role that proposes code, diffs, tests, and documentation changes.                                                          |
| Verification agent      | The AI role that checks requirements, risks, evidence, rollback, and acceptance criteria.                                         |
| Approval gate           | A mandatory checkpoint before any AI-proposed write is applied.                                                                   |
| Workspace boundary      | The selected project root that limits allowed file reads and writes.                                                              |
| Write boundary          | The subset of workspace paths where writes are allowed.                                                                           |
| Protected file          | A file that should not be read, indexed, sent to a model, or edited unless an explicit future policy allows it.                   |
| Reactive safety warning | A warning generated after a plan/diff exists but before apply, such as protected-file write or secret-in-diff.                    |
| Proactive analysis      | Background analysis without direct user request; out of MVP scope.                                                                |
| Audit log               | Append-only evidence trail for retrieval, plan, diff, approval, apply, rollback, model, and safety events.                        |
| Requirement drift       | A change where implementation or tests move away from the approved requirement intent.                                            |
| Spiral spin             | One iteration of intent capture, requirement check, implementation proposal, verification, adjudication, and rollback/acceptance. |
| First-pass correctness  | Whether the first implementation proposal satisfies requirements before later repair.                                             |
