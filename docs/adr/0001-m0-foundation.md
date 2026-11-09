# ADR 0001: Minimal M0 workspace and verification foundation

- Date: 2026-11-09
- Status: implemented defaults; pending human review
- Scope: M0 only

## Context

`PLAN.md` specifies a TypeScript factory but leaves package manager, test runner, package creation timing, and local database details open. The starting directory contains only the charter. M0 needs reproducible installation and verification without implying that later factory behavior exists.

## Decisions

- Use Node 24.x and npm 11.x, matching the installed toolchain. Record the tested versions rather than claiming compatibility with untested majors. Keep one root lockfile and exact direct development dependency versions.
- Use npm workspaces with a single private `@forgets/core` package. Declare `apps/*` for later milestones but create no empty application packages. Do not add NestJS, Zod, a provider SDK, or database clients until their milestone requires them.
- Use strict TypeScript and NodeNext ESM. Compile before using Node's built-in test runner. A package-export smoke test verifies the build/module boundary without inventing a runtime API to test. This gives no evidence about future factory correctness.
- Use ESLint flat configuration with TypeScript recommendations and Prettier for formatting. Keep scripts portable across Windows and Linux. Verification must fail on a missing workspace script or a failed command.
- Use supported ESLint 10.14.0 with `@eslint/js` 10.0.1 and TypeScript ESLint 8.72.1. The initial installation of ESLint 9.39.5 emitted an end-of-support warning, prompting the update before handoff. The resulting dependency tree still has an open moderate `minimatch` advisory: consumers request major 10 while the published fix is in 11.0.1. Do not silently force a cross-major override or downgrade supported tooling just to clear the audit. This unresolved development-tooling risk is submitted for human review, not accepted on the human's behalf.
- Use PostgreSQL 17 for local Compose infrastructure only. Bind its development port to `127.0.0.1:5433`, use explicit non-production defaults, a named volume, and a readiness health check. The major image tag is mutable; this is not a bit-for-bit database environment or a sandbox. Defer database schema and migration tooling to M1.
- Keep baseline verification independent of Docker. CI runs locked installation and local verification on Linux; Compose runtime checks are separate. A workflow file does not prove a successful hosted CI run.
- Initialize Git locally for reviewable changes, with no commit, remote, push, deployment, or API spending. Keep `PLAN.md` intact as the charter, including its formatting.
- M0 executes trusted developer tooling on the host. Strong isolation and network/file policies for untrusted generated code are future M2 work. Do not represent workspaces, Git, or the database container as that boundary.

## Consequences

The initial workspace has no usable factory feature. Its small dependency surface and explicit smoke test make the baseline understandable. Future milestones must add their own behavioral tests, contracts, persistence, sandbox implementation, and security evidence. Linux is covered by the authored CI configuration, but only an observed run can establish it passed. Updating exact tool versions or the PostgreSQL major should include fresh verification.

## References

- [Project charter](../../PLAN.md)
- [M0 specification](../../specs/internal/m0-bootstrap.md)
- [TypeScript ESLint configuration](https://typescript-eslint.io/getting-started/)
- [Node release policy](https://github.com/nodejs/Release)
- [ESLint support policy](https://eslint.org/version-support/)
- [Open minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
