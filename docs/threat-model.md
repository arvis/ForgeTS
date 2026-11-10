# Threat model

Date: 2026-11-09. Scope: implemented M1 mock workflow and future execution boundaries. Evidence and residual limits are recorded separately; this is not a security certification.

## Assets and actors

Assets include the developer's repository and host files, credentials, future provider keys, run events, artifacts, database contents, and the integrity of verification and approval evidence. The human developer controls the trusted bootstrap. Future specs, target repositories, model responses, generated code, tool output, and test output must be treated as untrusted, even when they appear helpful or claim authority.

## Current M1 boundaries

- `npm ci`, compiler, linter, formatter, and test runner execute trusted development tooling on the host. Third-party dependencies remain a supply-chain risk. Exact direct versions and the lockfile improve repeatability; they do not prove safety or reproducible bytes for every environment.
- The observed dependency audit reports 10 moderate findings associated with a transitive `minimatch` pattern-amplification denial-of-service advisory in the linter stack. This is a known open finding, not a passing security check. M0 uses repository-owned lint patterns and must not be generalized to processing hostile inputs on the host. See [ADR 0001](adr/0001-m0-foundation.md) for the dependency compatibility decision.
- Git and npm workspaces organize files; neither contains hostile code. Do not run generated changes through host development scripts. M1 roles return static fixture data and have no subprocess, filesystem-write, provider, or executor adapters. Feature-spec instructions remain inert data; this demonstrates capability absence, not hostile-code containment.
- Compose exposes separate loopback development/test PostgreSQL services. Demo data uses a persistent volume; test storage is tmpfs. Public credentials are local development defaults, and other local processes can access them. Explicit migrations create run/event tables; startup requires exclusive owner locking, recovers interrupted work without replay, and preserves awaiting-review reports.
- The NestJS API binds to IPv4 loopback and rejects foreign Host/Origin, unknown modes/fields, malformed requests, and oversized JSON. The CLI reads only a user-named bounded file and calls the local API. Loopback is not authentication against local software, and it does not prove a port is not forwarded to production.
- Core/schema checks bound structured data, mock transitions, deadlines, and cancellation. PostgreSQL connection/query timeouts and state/event transactions constrain persistence. These controls cover trusted mocks, not hostile synchronous code or process/resource containment. Database outages can prevent durable failure evidence; errors must not claim otherwise.
- Configuration rejects unsupported database endpoints, demo-as-test targets, ambient `PG*`/database URLs, public bind addresses, and unknown application overrides. Diagnostics expose fixed sanitized codes; mock reports contain no raw exception messages. Structured specs themselves are retained as development data: never put secrets in specs. M1 is not a general secret scanner or prompt-redaction system.
- CI has read-only repository permissions, disables persisted checkout credentials, and has a job timeout. The external Actions references and database image are version tags, not immutable digests. A compromised dependency or action remains a risk.
- `.env` variants, generated output, future artifacts, and execution directories are ignored by Git. Ignore rules are convenience controls, not secret scanning or access controls. `.env.example` intentionally contains only public development defaults.

## Future risks and required controls

| Threat                                         | Current evidence and required later controls                                                                         | M1 status                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Spec/output changes permissions                | Strict contracts and no live/executor mode; tests prove injected instructions do not invoke capabilities             | Mock-only policy implemented                           |
| Host writes or symlink escape                  | No agent file-write capability in M1; strong sandbox and escape checks required before generated execution           | M2 containment pending                                 |
| Arbitrary shell/network commands               | No command/provider adapters in mock workflow; enforced execution allowlists/network denial still required later     | M2 pending                                             |
| Generated code reads credentials/Docker socket | No generated execution; future worker must receive neither credentials nor socket                                    | M2 pending                                             |
| Runaway execution/output/retries               | Bounded mock data/transitions/deadline and cancellation, no retries; real resource/process limits remain future work | Mock limits tested                                     |
| Credential leakage                             | Fixed error codes and local configuration guards tested; specs are retained and must contain no secrets              | Limited diagnostics policy, no general secret scanning |
| Reviewer overrides failure                     | Failed simulated checks stop before review; reports remain `mergeReady: false`; no approval endpoint                 | Mock gate tested; actual human approval M4             |
| Invalid data or inconsistent events            | Zod, version guards, transactional event writes, uniqueness and admission indexes, restart recovery                  | Real PostgreSQL tests passed                           |
| Misleading portfolio claims                    | Raw local baseline and acceptance evidence distinguish simulation, actual checks, and limitations                    | Documented; hosted CI unobserved                       |

## Residual uncertainty

M1 tests do not establish an OS sandbox, worker credential isolation, arbitrary secret redaction, process/resource containment, enforced human approval, or adversarial generated-code safety. Actual PostgreSQL readiness, API integration, and the small local baseline were observed; hosted CI has not been observed. Future isolation depends on the selected runtime/OS and needs direct negative containment tests. Database backups, remote hosting, authentication, and production operation remain outside M1.

## M1 evidence and later execution gate

The human requested the safeguards before implementation and subsequently authorized M1 after reading its specs. [The M1 spec](../specs/internal/m1-contracts-orchestration.md) defines acceptance criteria; [ADR 0004](adr/0004-m1-runtime-boundaries.md) records implemented choices. [The acceptance record](m1-verification.md) links actual evidence.

Negative tests cover local-only configuration, separate test targets, explicit migration ownership, bounded data/deadlines, sanitized diagnostics, atomic writes, idempotency, one active run, cancellation, and restart recovery. TypeScript and lint checks complement these tests and do not restrict OS access.

Real code execution remains blocked until M2's separate sandbox spec implements and verifies filesystem, credential, network, privilege, process, and resource boundaries. An allowlisted `npm test` or installation command still executes potentially hostile code; command names alone do not make it safe. Adversarial checks must use disposable canaries and development resources, never personal files or production data.

The coding agent used to build ForgeTS still has the permissions of its development session. Git history and `AGENTS.md` cannot prevent host-wide damage or restore arbitrary untracked files. Development inside a disposable VM with only the project and development credentials is a separate environment choice, not a protection delivered by this repository. Loopback database validation also cannot establish that a local port is not forwarded to production; controlled credentials and endpoints remain prerequisites.
