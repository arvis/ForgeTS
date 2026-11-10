# Internal milestone specifications

Read [the charter](../../docs/PLAN.md), [repository instructions](../../AGENTS.md), and [human input](../../docs/human-input.md) first. M1, M2's offline workflow and M3's offline checks/repair are locally verified. The human authorized local M2/M3 integration, while M2 live acceptance remains open and paid calls blocked. Stop before M4. [Local milestone integration](milestone-local-integration.md) records the standing commit/merge rule; future implementation still requires authorization.

| Milestone   | Specification                                                        | Current status and review boundary                                                                                              |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| M0          | [Bootstrap](m0-bootstrap.md), [agent workflow](m0-agent-workflow.md) | Implemented foundation; historical evidence retained in the build log.                                                          |
| M1          | [Contracts and orchestration](m1-contracts-orchestration.md)         | Implemented/locally verified; historical [acceptance evidence](../../docs/m1-verification.md) retained.                         |
| M2          | [Real provider and sandbox](m2-real-agent-sandbox.md)                | Offline fixture workflow locally verified; full live acceptance remains blocked. See [evidence](../../docs/m2-verification.md). |
| M3          | [Actual verification and repair](m3-verification-repair.md)          | Offline implementation locally verified; [actual evidence](../../docs/m3-verification.md). Stop before M4.                      |
| M4          | [Review and human approval](m4-review-human-approval.md)             | Draft; advisory review, immutable evidence, and a separate trusted human decision capability.                                   |
| M5          | [Evaluations and portfolio](m5-evaluation-portfolio.md)              | Draft; reproducible positive/negative fixtures and honest demo/evidence.                                                        |
| Optional M6 | [Dashboard and GitHub](m6-dashboard-github.md)                       | Draft; frontend choices pending; every external write needs separate authorization.                                             |
| Optional M7 | [Scaling and load testing](m7-scaling-load-testing.md)               | Draft; larger workload campaigns and measured justification for scaling.                                                        |

## M3 implementation slices

- [M3a: isolated real checks](m3a-isolated-checks.md)
- [M3b: durable bounded repair](m3b-bounded-repair.md)

## M1 implementation slices

- [M1a: contracts/local policy](m1a-contracts-policy.md)
- [M1b: PostgreSQL persistence](m1b-persistence.md)
- [M1c: bounded mocks/typed lint](m1c-mock-orchestration.md)
- [M1d: transports and acceptance evidence](m1d-transports-evidence.md)

[Performance/human-input planning](m1-performance-and-human-input.md) and [M2–M6 drafting](roadmap-m2-m6-drafts.md) record documentation tasks, not additional implemented runtime milestones. [Example feature input](../examples/add-project-api.md) is for the factory demo.

Before starting any draft, inspect current code/evidence, resolve its open ADRs, split behavior into reviewable task specs if necessary, and write unhappy-path tests first. Run actual verification and update the build/input logs. Review each milestone before starting the next. Later schema changes must preserve historical M1 mock provenance; no draft grants production access, provider spending, publication, push, merge, or deployment permission.
