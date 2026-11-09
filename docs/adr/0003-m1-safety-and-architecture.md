# ADR 0003: M1 mock-only execution and bounded orchestration

- Date: 2026-11-09
- Status: proposed for M1 implementation; documentation requested by the human
- Scope: M1 planning and the prerequisite gate for later real execution

## Context

The human asked how to protect personal data and production systems, how architecture should support scaling, and which TypeScript checks matter. They then asked Codex to add the recommendations to M1. M0 has development tooling and instructions but no execution sandbox. Documenting requirements does not implement protections or authorize M1.

## Decisions proposed for review

- Keep M1 mock-only. Structured descriptions of files, commands, and verification are inert data, with no shell/executor, live provider, target edits, approval, or publishing capability. Persist explicit simulation labels and `mergeReady: false`.
- Use thin CLI/API adapters over the same core use cases, with contracts and persistence behind explicit interfaces. Use PostgreSQL transactions for state/event consistency, version guards for competing transitions, and atomic admission for one active run. Make duplicate submissions idempotent.
- Keep the unauthenticated API on IPv4 loopback and validate explicit local development/test database targets before connecting. Specs/API input cannot supply arbitrary host file paths or database URLs. Migrations are deliberate developer actions, and integration tests use a separate disposable database. Local targets still depend on trusted environment setup and must not forward to production.
- Start with conservative trusted limits: 64 KiB input and each structured output/report, 20 stage transitions, a 30-second mock run deadline, and database operations capped at 5 seconds. Do not add repair retries or distributed queues to M1. Detect interrupted runs on restart and fail them explicitly instead of automatically replaying stages.
- Preserve strict TypeScript and add type-aware ESLint, including `no-floating-promises` and `no-misused-promises`, with demonstrated negative/positive lint fixtures. Runtime Zod validation remains necessary at external boundaries. Test unhappy paths before implementing behavior.
- Make hard execution isolation a separate, blocking M2 prerequisite. Generated dependency installations, builds, tests, and scripts all require the worker boundary. Use a disposable environment, no credentials or host-wide mounts, no Docker socket, no default network, restricted privileges, resource limits, and actual adversarial checks against disposable canaries.

## Consequences and limits

This gives M1 a small scope with testable failure behavior and a clear path to later workers. It intentionally offers no parallel-run throughput, production deployment, hostile-code safety, or enforced human approval. Timeouts and cancellation in trusted mock code are not process isolation. The development agent and npm tooling still operate under their host permissions; repository instructions do not enforce filesystem access control. A disposable VM with only development assets can reduce development exposure but is not created by M1.

Raising concurrency later requires durable job ownership, crash recovery, duplicate-work protection, cancellation, resource admission, and bounded provider spending. More workers must not share unrestricted execution workspaces. Existing M0 dependency findings and unverified Docker readiness remain open review items.

## References

- [M1 specification and acceptance criteria](../../specs/internal/m1-contracts-orchestration.md)
- [Threat model](../threat-model.md)
- [Docker security and daemon authority](https://docs.docker.com/engine/security/)
- [npm installation scripts](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Type-aware linting](https://typescript-eslint.io/getting-started/typed-linting/)
