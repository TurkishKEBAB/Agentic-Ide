# Verification-Driven Development (VDD) Planning Draft

Status: Advisor Review Draft
Purpose: This document is a discussion artifact for the thesis advisor. It is not yet a final thesis claim,
implementation specification, or literature-backed conclusion.

## Core Position

Agentic IDE should be framed around Verification-Driven Development (VDD): a software development approach where
AI-assisted implementation is governed by independently captured requirements, evidence, review decisions, rollback
points, and verification traces.

The strongest version of the claim is:

> TDD is no longer sufficient as the primary control mechanism when AI can generate both the implementation and the
> tests. In AI-assisted software engineering, verification must become the governing layer.

The safer academic version is:

> When AI systems can produce both code and tests, test-first development alone is not enough to establish trust.
> Requirements, tests, review evidence, rollback history, and human/AI adjudication should be organized under a broader
> verification-driven lifecycle.

## Candidate Slogans

Provocative slogan:

> TDD is not dead as a technique; it is dead as the only answer.

Academic slogan:

> From test-first coding to evidence-first software engineering.

Project slogan:

> Build with agents, decide with evidence.

## Why This Matters

Classic TDD assumes that the developer writes the tests as an intentional specification pressure before implementation.
In an AI-assisted workflow, the same AI system, or a closely coupled AI system, may generate the implementation and the
tests. This weakens the independence of the test oracle.

Therefore, the project should not treat generated tests as the final source of truth. Tests remain necessary, but they
become one artifact inside a larger verification system. Other artifacts include:

- prioritized requirements
- stakeholder and shareholder intent
- acceptance criteria
- implementation diffs
- generated and human-authored tests
- static analysis and security checks
- AI verifier comments
- human approval/rejection decisions
- rollback points per spiral iteration
- audit logs and traceability records

## VDD Thesis Claim Boundary

The project should avoid claiming:

- "Tests are useless."
- "TDD has no value."
- "AI can replace all engineering judgement."
- "VDD is already an established standard" unless the literature review supports this.
- "Generated tests prove correctness."

The project can reasonably claim, after implementation and evaluation:

- TDD is still useful, but insufficient as the sole quality-control model for AI-generated software.
- AI-generated implementation and AI-generated tests require independent verification signals.
- A requirements-first, evidence-first, rollback-aware lifecycle can make agentic development more inspectable.
- Separating implementation and verification roles can improve traceability and review quality.
- Student and professional users need different interaction policies over the same verification loop.

## Intended Users

### Student Mode

The student mode should keep the AI assistant more visible and explanatory. For every meaningful change, the AI should
explain possible consequences and affected requirements before the student accepts or rejects the change.

Primary learning outcome:

- understanding the software development lifecycle end to end

Secondary learning outcomes:

- understanding requirements analysis
- learning how to work with AI assistants responsibly
- developing intuition about AI capability limits
- understanding how implementation, testing, review, rollback, and verification relate to each other

### Professional Engineering Mode

The professional mode should be less tutorial and more evaluative. The AI should act as a verification and governance
assistant that records:

- what the engineer accepted
- what the engineer rejected
- why a requirement was changed
- which evidence supported the decision
- which risks were knowingly accepted
- which rollback point protects the current spiral iteration

In this mode, the AI is not merely an assistant that writes code. It becomes the system's verification steward: it
checks decisions against requirements and records the engineering rationale.

## Decision Authority

The final decision maker should follow the source of product intent:

| Requirement Source                          | Final Decision Authority                           |
|---------------------------------------------|----------------------------------------------------|
| User created the requirement                | User                                               |
| AI created the requirement from a user goal | AI proposes, user confirms                         |
| User and AI co-designed the requirement     | Joint user + AI decision                           |
| Professional engineer owns product intent   | Professional engineer, with AI verification record |
| Student exercise defined by instructor      | Instructor/course rubric, with AI explanation      |

This prevents a misleading "admin user" framing. The important role is not an admin. The important role is the authority
that owns intent and the verifier that checks evidence against that intent.

## Implementation Agent vs Verification Agent

VDD should separate two responsibilities:

| Role                 | Responsibility                                                                | Risk If Coupled                                                                |
|----------------------|-------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Implementation agent | Propose code, diffs, migrations, tests, and documentation updates             | May optimize for making its own solution look correct                          |
| Verification agent   | Check requirements, evidence, risks, tests, rollback, and acceptance criteria | May become a rubber stamp if it shares the same prompt and context assumptions |

Minimum thesis version:

- separate prompts
- separate role definitions
- separate logs
- explicit accept/reject decisions

Stronger research version:

- separate model calls
- different context windows
- verifier receives requirements and diff before implementation rationale
- verifier cannot edit implementation directly
- verifier outputs structured evidence and risk findings

Ideal research version:

- multiple independent verifiers
- disagreement tracking
- benchmarked comparison against single-agent development
- measured impact on defect detection, rollback frequency, and first-pass correctness

## Spiral VDD Lifecycle

The project should use a spiral lifecycle because agentic development is iterative, uncertain, and rollback-sensitive.

Each spiral spin should include:

1. Intent capture
2. Stakeholder/shareholder requirement clarification
3. Requirement priority check
4. Acceptance criteria and evidence plan
5. Implementation proposal
6. Diff generation
7. Independent verification
8. User/AI adjudication
9. Accept, revise, or rollback
10. Evidence archive

The key research direction is not just "AI writes code." The key research direction is whether the system can move
verification earlier in the spiral so that bad implementation paths are caught closer to the first spin and first layer.

## Requirements Control Model

Before implementation, each requirement should have:

- requirement owner
- source stakeholder or shareholder
- priority
- acceptance criteria
- test target
- verification target
- risk level
- rollback expectation
- evidence required for approval

During each spiral spin, the system should ask:

- Did the requirement change?
- Who has authority to change it?
- Which tests or verification artifacts must change with it?
- What implementation decisions are now invalid?
- Is rollback safer than patching forward?
- What evidence is required before acceptance?

## Evidence Matrix

| Evidence Type                  | Student Mode                        | Professional Mode               | Research Value                      |
|--------------------------------|-------------------------------------|---------------------------------|-------------------------------------|
| Requirement priority           | Explained step by step              | Enforced as review gate         | Tracks requirements discipline      |
| Stakeholder/shareholder intent | Shown as learning material          | Used as decision authority      | Supports traceability               |
| Acceptance criteria            | Converted into learning checkpoints | Converted into approval gates   | Links requirements to verification  |
| Generated tests                | Explained and critiqued             | Treated as non-final evidence   | Tests AI-test trustworthiness       |
| Static/type/lint checks        | Used as feedback                    | Used as baseline quality signal | Reproducible metric                 |
| Security/privacy checks        | Explained with consequences         | Required before approval        | Safety evidence                     |
| Diff review                    | Guided explanation                  | Concise risk review             | Measures review usefulness          |
| Rollback point                 | Taught as lifecycle concept         | Required per spin               | Measures recovery discipline        |
| AI verifier comments           | Educational feedback                | Decision log                    | Enables audit and analysis          |
| Human decision                 | Learning reflection                 | Engineering approval/rejection  | Captures human-in-the-loop behavior |

## Research Questions To Discuss

| ID       | Research Question                                                                                                                            | Current Status                       |
|----------|----------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------|
| RQ-VDD-1 | Does separating implementation and verification agents improve defect detection compared with a single AI coding agent?                      | Needs benchmark                      |
| RQ-VDD-2 | Does VDD reduce requirement drift in spiral AI-assisted development?                                                                         | Needs requirements trace logs        |
| RQ-VDD-3 | Can AI verifier warnings help students understand software lifecycle consequences better than ordinary coding assistance?                    | Needs user study                     |
| RQ-VDD-4 | Which evidence types are most predictive of successful acceptance: tests, requirements traceability, verifier critique, or rollback history? | Needs telemetry and task dataset     |
| RQ-VDD-5 | How often should the system rollback instead of patching forward during agentic development?                                                 | Needs rollback instrumentation       |
| RQ-VDD-6 | Does moving verification earlier improve first-pass implementation quality?                                                                  | Needs staged verification experiment |

## Advisor Review Questions

1. How strongly can the thesis state the TDD claim without becoming academically weak?
2. Should VDD be framed as a new methodology, a design framework, or a thesis-specific process model?
3. Is "all *DD methods should be reorganized under VDD" acceptable as a research hypothesis, or should it remain a
   discussion claim?
4. What should the first artifact of the lifecycle be: stakeholder request, requirement card, acceptance test, use case
   diagram, or AI-generated plan?
5. Should implementation and verification use separate agents, separate prompts, separate models, or only separate roles
   for the graduation scope?
6. What metrics best represent professional engineering value?
7. What metrics best represent student learning value?
8. How should stakeholder and shareholder requirements be distinguished in the thesis?
9. What is the minimum rollback mechanism needed to make the spiral model credible?
10. Which claim is more publishable: VDD as an educational model, VDD as a professional engineering process, or VDD as
    an agent architecture?

## Minimum Viable Evaluation

The smallest credible evaluation should include:

- a small set of programming tasks with explicit requirements
- one baseline AI-assisted workflow without independent verification
- one VDD workflow with separate implementation and verification roles
- logged acceptance/rejection decisions
- generated tests and verifier findings
- rollback events
- requirement drift events
- task completion time
- defect count after review
- human intervention count

## Stronger Evaluation

A stronger version should add:

- student user study
- professional engineer review session
- multiple task categories
- ablation of verifier role
- ablation of rollback mechanism
- comparison of AI-generated tests vs human/requirement-derived checks
- qualitative analysis of accepted and rejected AI suggestions

## Project Backlog Impact

This document should create Advisor Review backlog cards for:

- VDD terminology and TDD stance
- implementation agent vs verification agent separation
- spiral requirement control and rollback
- student vs professional interaction modes
- professional metrics and student learning outcomes
- advisor questions before thesis claim hardening

## Open Decision

The current recommended thesis framing is:

> Verification-Driven Development is a requirements-first, evidence-first process model for AI-assisted software
> engineering. It treats tests as necessary evidence, not sufficient proof, and organizes agentic implementation under
> independent verification, explicit decision authority, and rollback-aware spiral development.
