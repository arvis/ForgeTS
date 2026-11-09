# ForgeTS build log

## 2026-11-09 — M0 foundation

### Task and authorization

The human asked Codex to read `PLAN.md`, follow Section 13, implement M0 only using a spec-first process, record architectural decisions, run actual verification, and stop for review before M1. No additional human choices have been supplied. Implementation defaults are proposals for this review checkpoint.

### Starting state and agent involvement

Codex read the complete charter and inspected the directory and ancestor locations for repository instructions. Only `PLAN.md` existed, and Git reported that the directory was not a repository. No `AGENTS.md` was found. Codex wrote `specs/internal/m0-bootstrap.md` and ADR 0001 before substantial implementation, then authored the workspace, configuration, smoke test, CI, Compose, and documentation. No sub-agents or live model providers were invoked by ForgeTS. The development agent consulted official tool documentation and npm package metadata to check compatibility.

### Decisions and scope

See [ADR 0001](adr/0001-m0-foundation.md). The workspace intentionally has one empty core runtime package; there are no contracts, migrations, agents, API, CLI, sandbox, repair loop, or approval implementation. Node's compiled package-import test is baseline tooling evidence only. The starting `PLAN.md` is preserved and excluded from formatting; the generated lockfile is also excluded.

### Verification

Environment inspection observed Node 24.11.0, npm 11.6.1, Git 2.52.0.windows.1, Docker CLI 29.3.1, and Compose v5.1.1. Verification was performed on Windows; no Linux or hosted CI execution is claimed.

| Command/check                                                          | Actual outcome                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git init`                                                             | Exit 0; local repository initialized. No commit or remote created.                                                                                                                                                                                                                                      |
| `npm install`                                                          | Exit 0; root lockfile generated. Initial ESLint 9.39.5 installation warned that the release was unsupported and reported 7 moderate audit findings.                                                                                                                                                     |
| `npm run format`                                                       | Exit 0; authored files formatted. `PLAN.md` and generated lockfile excluded.                                                                                                                                                                                                                            |
| Initial `npm run verify`                                               | Exit 0; formatting, lint, strict typecheck, compilation, and one package-import test passed.                                                                                                                                                                                                            |
| `npm install --save-dev --save-exact eslint@10.14.0 @eslint/js@10.0.1` | Exit 0; supported ESLint major installed. This did not resolve the transitive advisory; npm reported 10 moderate findings.                                                                                                                                                                              |
| Final-toolchain `npm run verify`                                       | Exit 0; formatting, lint with zero warnings, strict typecheck, compilation, and 1/1 tests passed; no skipped tests.                                                                                                                                                                                     |
| Independent clean export: `npm ci` then `npm run verify`               | Both exit 0. Copied 24 non-ignored authored/lock files into a fresh OS temporary directory outside the repository, without `.git`, `node_modules`, or `dist`. Installed 100 packages and passed all baseline checks, including 1/1 tests. This was a clean export, not a clone of a nonexistent commit. |
| `npm run db:config`                                                    | Exit 0; Compose configuration validates without a daemon.                                                                                                                                                                                                                                               |
| `docker compose config --format json` plus assertions                  | Exit 0; resolved PostgreSQL service has loopback-only binding, a health check, and named storage.                                                                                                                                                                                                       |
| `npm run db:up`                                                        | Exit 1; Docker Desktop Linux engine pipe unavailable. Could not start PostgreSQL or verify readiness. No container or volume was created by this attempt.                                                                                                                                               |
| `npm audit --json`                                                     | Exit 1; 10 moderate, 0 high, and 0 critical findings at verification time. Findings propagate from the same `minimatch` advisory through the linter stack. Audit is not a passing gate.                                                                                                                 |
| `npm ls --depth=0`                                                     | Exit 0; one core workspace and the exact declared development tools are installed without peer dependency errors.                                                                                                                                                                                       |
| `git check-ignore`                                                     | Confirmed `.env`, `.env.local`, dependencies, compiled output, artifacts, and execution directories are ignored; `.env.example` remains reviewable.                                                                                                                                                     |

The clean export and local checks need neither PostgreSQL nor provider credentials. The test verifies compilation and public ESM package resolution only; there are no factory behavior tests or evaluation results yet. The CI workflow is authored but has not run on GitHub.

After recording the results, documentation was formatted and `npm run format:check` passed again. Automatic approval review rejected the attempted cleanup of the temporary export with the reason "blocked by policy". No cleanup was performed; the copy remains at `C:\Users\viest\AppData\Local\Temp\forgets-m0-a3be16fec2e348899842aa313c3d2729`. The repository files are unaffected.

The current [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) lists a fix in 11.0.1 while installed linter consumers request major 10. No forced downgrade or incompatible override was applied. Review this remaining tooling risk explicitly; zero reported high/critical findings does not establish dependency safety.

### Human review and next step

Review M0 acceptance criteria, the minimal test scope, exact tool versions, local PostgreSQL defaults, open audit findings, and unverified Docker runtime/hosted CI. No human approval of the implementation or acceptance of the dependency risk has been recorded. The next optional M0 verification is to start Docker's Linux engine and rerun `npm run db:up` plus the documented readiness command. M1 remains unstarted and requires the human's review and authorization.

### Lessons learned

Dependency version selection must respect peer compatibility rather than blindly taking every latest release: the current TypeScript ESLint package advertises TypeScript below 6.1, so this baseline conservatively uses TypeScript 5.9.3. A working Docker CLI does not prove that its daemon is running. Keep these facts separate from claims that the application or database works.

## 2026-11-09 — M0 follow-up: Repository instructions

### Task, human decisions, and agent involvement

The human explicitly instructed Codex to adopt the proposed root `AGENTS.md` workflow, including local commits after completed specs and unit tests before behavior with unhappy paths first. Codex recorded the verified M0 baseline as local commit `807bb28` after rerunning `npm run verify` and `npm run db:config` successfully. This supersedes the original no-commit default; it does not approve M0's open findings or authorize M1.

Codex wrote [the follow-up spec](../specs/internal/m0-agent-workflow.md) before implementing the instruction/layout changes, added root `AGENTS.md`, moved the original charter to `docs/PLAN.md`, updated live links and the formatting exclusion, and recorded [ADR 0002](adr/0002-repository-instructions.md). Historical descriptions above refer to the original root charter. No behavior or tests were changed, and no retrospective test-first claim is made.

### Verification

- `npm run format`: exit 0; authored files already formatted.
- `npm run verify`: exit 0; formatting, lint, strict typecheck, compilation, and the unchanged 1/1 smoke test passed.
- `npm run db:config`: exit 0; Compose configuration validates.
- A one-off Node check of local Markdown links and charter relocation: exit 0; all 22 local links resolved, root `PLAN.md` was absent, and `docs/PLAN.md` matched the original M0 Git blob byte for byte. The SHA256 hash also matched before and after the move.
- No unit tests were added for these instruction/documentation changes. The unhappy-path-first test requirement applies to subsequent behavior changes.

The final staged diff and whitespace check are inspected before committing the scoped follow-up. Existing Docker runtime and dependency audit limitations remain open; this follow-up does not rerun or claim to resolve them.

### Review and next step

The follow-up is complete and verified for a scoped local commit. No push is authorized. M0 remains at the human review checkpoint, and M1 remains unstarted.

## 2026-11-09 — M1 planning: Safeguards and architecture

### Task, human decisions, and agent involvement

The human asked Codex to add the discussed safeguards, architecture/scaling, and TypeScript recommendations to M1. This authorizes documentation, not M1 implementation, production access, sandbox execution, or acceptance of M0's open findings. Codex inspected the current instructions, charter, threat model, ADRs, specs, and clean Git state, then wrote [the M1 draft](../specs/internal/m1-contracts-orchestration.md) before updating supporting documents. No sub-agents were used.

### Changes and rationale

Codex added testable requirements for inert mock execution, local development/test targets, no production credentials or agent-controlled execution, transactionally consistent events, idempotent submissions, one active run, bounded inputs/outputs/deadlines, cancellation, and interrupted-run recovery. The spec requires strict TypeScript plus type-aware promise lint rules and unhappy-path-first behavioral tests when implementation is authorized.

[ADR 0003](adr/0003-m1-safety-and-architecture.md) records proposed defaults and future scaling boundaries. The threat model and README link the draft. M2 has a blocking prerequisite for separately specified and directly verified containment, including install scripts/tests, filesystem and symlink escape attempts, credential/network restrictions, and process/resource limits. Documentation distinguishes trusted host development from a future runtime sandbox and does not claim that instructions, Git, or lint can protect arbitrary personal files.

### Verification

- `npm run format`: exit 0; formatted the new M1 acceptance-criteria table.
- `npm run format:check`: exit 0; authored-file formatting passes.
- A one-off Node documentation check: exit 0; all 32 local Markdown links resolve, changes are limited to the five intended documentation files, and the charter is byte-identical to the current Git version. No runtime, dependency, tooling, or instruction file changed.
- `git diff --cached --check`: exit 0; the staged documentation diff was inspected before committing.

This task changes documentation only, so no artificial unit tests are added and no M1 runtime, lint-rule implementation, or containment verification is claimed. Existing dependency findings and unverified Docker readiness remain open; they are not rechecked or resolved by this planning task.

Spec review clarified that awaiting-review runs release the execution slot and survive restart, recovery requires exclusive application ownership, and development migrations remain allowed while test cleanup against the demonstration database is denied. Resolving these distinctions before code avoids ambiguous failure and recovery behavior.

### Review and next step

The documentation task is complete for a scoped local commit after the staged checks. The M1 implementation spec remains a draft: review the defaults, complete the M0 checkpoint, and explicitly authorize M1 before behavioral implementation. The spec will be split into reviewable implementation tasks where needed. No push or later milestone work is authorized.
