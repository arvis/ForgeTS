# ADR 0005: Evidence and capability boundaries between milestones

- Date: 2026-11-10
- Status: proposed design for the requested M2–M6 drafts; later implementation unapproved
- Context: M1 is locally verified, and the human requested the missing later milestone specs after its completion.

## Proposed handoffs

Each milestone adds a narrow capability with a specific evidence gate. M1 supplies real persistence/orchestration with simulated role outputs. M2 adds a selected provider and bounded file edits only after actual isolation tests; M3 adds real deterministic checks and bounded repair; M4 adds advisory review, artifact-bound eligibility, and a trusted human decision capability; M5 supplies reproducible evaluations/portfolio evidence. Optional M6 adds UI and separately authorized publishing integrations. M7 remains optional measured scaling/load work.

Carry immutable target/artifact/check identities and honest provenance across these handoffs. Additive schema migrations must keep historical mock records readable and prevent their promotion into verified real results. Reviewer output is advisory; client UI and agent content cannot grant capabilities. Approval does not itself authorize an external write.

Keep worker capabilities separate from provider credentials, database ownership, and human/publisher authorization. Real generated dependency hooks, builds, tests, and patches stay within the execution boundary. On ownership loss, containment failure, stale evidence, budget exhaustion, or uncertain persistence, fail closed and record the actual uncertainty rather than replaying potentially duplicated actions.

## Open decisions and limits

Provider/model/SDK, isolation runtime/images/budgets, approval authorization, browser build/CSS setup, and publisher implementation need ADRs and human review when their milestone is authorized. Suggested `apps/web/`, Tailwind, and shadcn/ui remain proposals. A browser-safe contracts entry point must separate shared schemas/types from the current Node-only parsing/configuration helpers before UI adoption. No provider credits, remote repository access, production operation, deployment, or M2–M6 implementation is authorized by writing these drafts.

The short M1 performance sample establishes no scaled operating envelope; M7 must compare actual workloads/configurations and preserve earlier correctness/isolation. Optional frontend and scaling priorities can be reconsidered by the human without weakening prerequisites.

References: [milestone index](../../specs/internal/README.md), [M1 evidence](../m1-verification.md), [threat model](../threat-model.md), [project charter](../PLAN.md).
