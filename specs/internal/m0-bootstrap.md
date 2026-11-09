# M0: Repository and specifications

Status: specified before implementation on 2026-11-09; M0 implemented and locally verified, pending human review. Docker runtime verification is blocked by the stopped engine; dependency audit findings remain open.

## Goal

Create the smallest reviewable TypeScript workspace that supports the later ForgeTS milestones. This spec implements only M0 from `PLAN.md`, especially Section 13.

## Starting state

The directory contains only `PLAN.md`. There is no Git repository, application code, dependency manifest, or existing verification setup. The available tools include Node 24.11.0, npm 11.6.1, Git, Docker, and Docker Compose on Windows.

## Implementation plan

1. Record conservative defaults and architectural boundaries in an initial ADR.
2. Initialize a local Git repository without committing or configuring a remote. Add npm workspaces, a lockfile, strict TypeScript, ESLint, Prettier, and a minimal core workspace. Keep future packages absent until needed.
3. Add a compiled TypeScript module-load smoke test using Node's built-in runner. Provide root commands for formatting, linting, typechecking, building, and testing, with one aggregate verification command.
4. Add a GitHub Actions workflow that installs with `npm ci` and runs the same verification command. Add local PostgreSQL Compose infrastructure with a health check, loopback binding, and a named volume.
5. Document setup, the honest origin story, current capabilities, architectural boundaries, threat model, and the development audit trail.
6. Run actual verification, including an independent clean export and Compose validation/runtime checks where the environment supports them. Record failures and environmental limitations explicitly.
7. Stop for human review before any M1 implementation.

## Acceptance criteria

- AC1: A fresh exported copy, excluding dependencies and generated output, installs with `npm ci` and passes `npm run verify` without API keys, PostgreSQL, or paid calls.
- AC2: TypeScript uses strict checking and native Node ESM resolution. The baseline test compiles TypeScript and loads the emitted core module through its package export. It is an infrastructure smoke test, not evidence of factory behavior.
- AC3: Formatting and lint checks run over authored files; generated output, dependencies, secrets, and local artifacts are ignored appropriately. Root workspace commands do not silently skip missing workspace scripts.
- AC4: CI runs locked installation and the same verification as local development, with read-only repository permissions and a job timeout. Hosted execution is reported only if actually observed.
- AC5: Compose configuration validates and defines PostgreSQL with health checking, local-only port exposure, development credentials, and persistent storage. Runtime readiness is checked if the Docker daemon is accessible; any blocker is documented.
- AC6: README, an ADR, threat model, and build log describe the actual M0 state, verification evidence, limitations, and origin story. The spec precedes substantial implementation.
- AC7: No contracts, state machine, database schema/migrations, agents, provider calls, CLI/API workflow, sandbox executor, repair loop, or approval implementation is added. The next milestone requires human review.

## Non-goals and boundaries

Compose is development database infrastructure, not the future execution sandbox. M0 checks execute trusted bootstrap code on the developer machine. No claims of runtime containment, security guarantees, factory evaluations, or successful hosted CI are made.

## Review

Human review should confirm the foundation and ADR defaults before authorizing M1. Verification outcomes and any exceptions belong in `docs/build-log.md`.

## Acceptance evidence

- AC1–AC3: Passed local verification and `npm ci` followed by `npm run verify` in an independent temporary export with no copied dependencies or build output. One compiled package-import smoke test passed. Git ignore checks confirmed local secrets/output are excluded while `.env.example` remains reviewable.
- AC4: Workflow authored with the required commands, permissions, and timeout. No hosted run was performed.
- AC5: Compose validation and inspection of its resolved loopback/health/storage configuration passed. `npm run db:up` failed because the Docker Desktop Linux engine was unavailable; database readiness remains unverified.
- AC6–AC7: Documentation and the build log are present; only M0 scaffolding exists. Human review is still pending, and M1 has not started.
- Additional finding: `npm audit` exits 1 with 10 moderate dependency findings associated with the linter's transitive `minimatch` dependency. This is unresolved and explicitly separate from the passing baseline checks; see the ADR and build log.
