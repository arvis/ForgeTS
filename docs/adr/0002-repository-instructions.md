# ADR 0002: Root agent instructions and spec completion commits

- Date: 2026-11-09
- Status: adopted by explicit human instruction
- Scope: repository workflow; no M1 authorization

## Context

The project charter originally lived at root `PLAN.md`, combining the roadmap with working principles. The human asked where to put agent instructions, local commits after each completed spec, and unit tests written before behavior with unhappy paths first, then instructed Codex to adopt the proposed workflow.

## Decision

Use root `AGENTS.md` as the concise repository instruction entry point and move the charter into `docs/PLAN.md` without changing its contents. Link to the charter, internal specs, ADRs, and build log rather than duplicating the roadmap. Paths in the charter remain repository-root-relative. Update live links while retaining historical descriptions of the original location.

Require spec-first development and unit tests before behavior changes, starting with invalid inputs, denied operations, boundaries, and failures. Observe the expected failing test before implementing the behavior. Documentation and configuration changes need appropriate actual checks rather than invented unit tests. The existing M0 smoke test is historical infrastructure evidence, not proof of a test-first behavioral workflow.

Require a scoped local commit after each completed spec passes its required checks. The human's new instruction supersedes the initial M0 decision to leave the repository uncommitted. Record the previously verified M0 baseline in its own commit and the instructions/layout follow-up in a separate commit. Do not push or treat either commit as approval to start M1. Known audit findings and the unavailable Docker engine remain review items.

## Consequences

Future sessions have a small instruction entry point, and the full roadmap stays in documentation. The workflow relies on actual failing/passing test evidence and scoped diffs; writing a rule does not enforce it mechanically. Changes to runtime behavior will need meaningful tests, while this documentation-only follow-up does not add runtime code or artificial tests.

## References

- [Repository instructions](../../AGENTS.md)
- [Project charter](../PLAN.md)
- [Follow-up spec](../../specs/internal/m0-agent-workflow.md)
