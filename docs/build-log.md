# ForgeTS build log

## Current checkpoint

On 2026-11-09 the human explicitly instructed: implement M1 after reading the specs. M1 is now complete with local verification and awaits human review. The human also requested M2–M6 draft specs after M1; drafting is authorized, later implementation is not. Earlier pending-review statements below describe historical checkpoints.

[Human input and project direction](human-input.md) provides a concise index of the human's substantive questions, directions, and pending decisions. This log records development activity and actual verification.

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

## 2026-11-09 — Planning follow-up: Performance and human input

### Human input and agent involvement

The human asked where load testing belongs and whether their questions are recorded for recruiters to see their contribution. Earlier follow-up questions covered frontend timing, CSS choice, a possible later scaling milestone, and why basic database indexes should not wait for scaling. The build log recorded major requested changes but did not systematically index those questions. Codex wrote [the documentation task spec](../specs/internal/m1-performance-and-human-input.md), added a linked human-input record and maintenance rule, and updated the M1 draft and proposed ADR. No implementation or milestone approval was inferred from these questions.

### Result and attribution

[The input record](human-input.md) distinguishes human requests from Codex recommendations, links resulting artifacts, and identifies pending decisions. Tailwind/shadcn, `apps/web/`, optional M7, and later performance milestone additions remain proposals. The human's process requirements and instruction to document safeguards are recorded as explicit directions. The README now provides an entry point for portfolio readers.

The M1 draft now explicitly requires query-driven indexes/constraints, bounded pagination, query-plan evidence, and a modest opt-in local mock-backed load baseline. The proposed initial profile is capped at 5 API clients, 200 requests including warm-up, and 60 seconds, while retaining one executing run. Measurements must separate expected admission rejections from successful work and unexpected errors. No latency, throughput, load result, index, test script, or frontend implementation was created by this documentation task.

### Verification

- `npm run format` and `npm run format:check`: exit 0; authored Markdown formatting passes.
- One-off Node verification: exit 0; all 49 local Markdown links resolve, only the seven intended documentation/instruction files changed, and `docs/PLAN.md` remains byte-identical to Git.
- Staged diff and whitespace are inspected before committing the completed documentation task.

No runtime/tooling configuration was changed; the repository instruction update concerns attribution only. No load tests, unit tests, database queries, or paid calls were run for this documentation-only task. Existing M0 findings remain open. The distinction between concurrency correctness and measured performance is now explicit in the draft and attributable to the human's follow-up questions.

### Review and next step

The documentation task is complete for a scoped local commit after the staged checks. Review the M1 draft, including the added efficiency/performance scope, before authorizing implementation. Formal roadmap additions and frontend selection remain undecided. M0 review is still pending, and no push is authorized.

## 2026-11-09 — Roadmap update: M7 load testing

### Human direction and agent work

The human explicitly asked to add load testing to M7. Codex inspected the clean repository and current instructions, wrote [the M7 planning spec](../specs/internal/m7-scaling-load-testing.md) before supporting edits, and added optional M7 to the roadmap. This intentionally changes the charter after the earlier tasks preserved it byte for byte. Only the new M7 section is intended to change; earlier charter sections remain intact.

The milestone now calls for average-load, stress, spike, and soak profiles, reproducible budgets/thresholds, latency and successful-work measurements, expected rejection classification, backpressure, recovery, and consistency/isolation checks. M1 retains its modest baseline. Codex updated the M1/ADR references and appended the human's explicit direction to the input record, preserving the history of the earlier proposal. No implementation, runtime test, production action, or provider spending is authorized by this documentation update.

### Verification

- `npm run format` and `npm run format:check`: exit 0; authored Markdown formatting passes. The charter remains excluded from automated formatting.
- The first one-off documentation check exited 1 because PowerShell changed the checker's literal em dash to `?` when piping JavaScript to Node. A character-code diagnostic confirmed that the charter's heading was correct. Using an ASCII `\u2014` escape in the checker corrected the transport issue without modifying the document.
- The corrected check exited 0: all 54 local Markdown links resolve, only the six intended planning-documentation files changed, and removing the new M7 section reproduces the prior charter exactly.
- Inspect the staged diff and require `git diff --cached --check` before committing.

No load tests or runtime checks are claimed; this task changes planning documentation only. Existing M0 limitations remain open.

### Review checkpoint

The documentation task is complete for a local commit after the staged checks. M7 remains future optional work requiring a reviewed implementation spec and separate authorization. M0 review is still pending, M1 implementation remains unstarted, and no push is authorized.

## 2026-11-09 — M1a: Contracts and local policy

The human authorized M1 implementation after reading the specs. Codex wrote the M1a implementation spec, updated the instruction checkpoint, and recorded ADR 0004. The first tests exercised invalid/missing Markdown sections, malformed bullets, UTF-8 budgets, live-mode/policy overrides, forbidden transitions, remote/public/database settings, and pagination. With typed contract stubs, compilation succeeded and the actual test run failed 6/6 for unimplemented behavior. After implementing strict Zod contracts, the data-only parser, state policy, and local configuration validation, the same run passed 6/6 with no skips.

Commands: `npm install` (exit 0, 10 moderate audit findings remain), `npm run build --workspace @forgets/contracts` (exit 0), and `npm test --workspace @forgets/contracts` (first exit 1, then exit 0). The Markdown example documents the supported format; permission-looking content remains inert data rather than being executed.

Docker Desktop was started as authorized local infrastructure. Its Linux engine responded, and the separate tmpfs-backed test PostgreSQL service reached healthy status. This resolves the earlier stopped-engine environment blocker; it does not establish sandbox containment. Compose/persistence changes will be included with M1b, not this contract commit.

M1a repository verification: `npm run format` and `npm run verify` exited 0; formatting, lint, strict typechecks, 6 contract tests, and the existing module smoke test passed. Staged whitespace/scope are checked before the scoped commit.

## 2026-11-09 — M1b: Real PostgreSQL persistence

Codex specified M1b before implementation and added integration tests against the dedicated loopback test service. The initial compiled integration test exited 1 at the unimplemented explicit migration. After parameterized SQL, migrations, owner locking, transactional admission/transitions, bounded keyset/event pages, and interruption recovery were implemented, the same command passed 9/9 tests without skips. An initial compilation caught an unused import, which was removed before the green run.

The tests directly verified that a second owner/migrator is rejected; conflicting idempotency keys and busy admission cannot create extra runs; an injected event constraint failure rolls back the preceding state update; competing transitions have one winner; illegal transitions preserve state; restart records interruption without replay; and history pagination handles timestamp ties. No database was dropped or truncated. The only fault fixture was a temporary test-only event constraint removed in `finally`.

`npm run verify` passed formatting, lint, builds, strict typechecks, and 8 unit/smoke tests. `npm run test:integration --workspace @forgets/persistence` passed 9 real-PostgreSQL tests. Dependency audit still reported 10 moderate findings. Root builds now follow dependency order, and Compose defines distinct demo/test ports and credentials; test storage is tmpfs. Transaction cleanup destroys a connection if rollback itself fails, rather than returning uncertain state to the pool. No sandbox claim is made.

## 2026-11-09 — M1c: Bounded mock workflow

Codex specified M1c and ran compiled unhappy-path tests against typed service stubs: 7 new tests failed for unimplemented orchestration while the module smoke test passed. After implementation, all 8 core tests passed, covering live-mode rejection before admission, malformed/wrong/oversized/throwing mocks, sanitized errors, failed verification blocking review, unavailable persistence, cancellation, real short deadlines, transition budgets, and simulated success. The deterministic role test first failed against an unimplemented mock and then passed against all four schema-validated fixture outputs.

Type-aware ESLint now checks promise handling. A negative lint fixture demonstrated both selected rules firing and a handled equivalent passing. The first lint run identified unused test-fixture parameters and an undeclared Node global in the lint script; these were corrected without weakening the rules. Top-level test registrations are explicitly awaited. Abort listeners/timers are cleaned up after stage completion. Core has no executor, subprocess, provider, or filesystem adapter.

`npm run format` and `npm run verify` exited 0: typed lint plus its negative/positive fixture, dependency-ordered builds, strict typechecks, and 16 unit/smoke tests passed with no skips. M1d will add real transport/persistence end-to-end evidence; mock verification is still explicitly simulated.

## 2026-11-09 — M1d: API, CLI, actual integration and baseline

Codex specified M1d and ran the API/CLI boundary tests against typed stubs; both failed for unimplemented behavior before their adapters were added. The NestJS API uses the same core service as the loopback HTTP CLI, which reads bounded user-selected Markdown data. Responses and stored errors expose fixed codes. There is no approval, provider, arbitrary file path, or executor endpoint. Explicit migration and API startup commands were added; CI now defines a separate PostgreSQL test service and actual integration checks (hosted execution remains unobserved).

Verification found and corrected setup/systemic issues: strict compilation required the explicit Express type package; Node fetch replaced a forged Host header, so that test now uses raw HTTP; a restarted local API caused a stale client socket reset, so restart tests use fresh connections. A new failing configuration case demonstrated that unsupported application overrides were silently ignored; the implemented guard now rejects them. A failing regression also exposed that a late wait could hide an already-rejected background persistence operation; bounded in-memory error tracking now keeps wait failures visible without inventing durable terminal evidence.

Real API/PostgreSQL integration passed 3 tests (the parent workflow plus persisted cancellation and deadline subtests). It submits a mock spec, observes all seven ordered events, checks idempotent/conflicting submissions, reloads an awaiting-review report after API restart, and runs actual CLI inspect/run subprocesses. Real PostgreSQL persistence checks passed 9 tests. Unit/HTTP checks passed 18 tests before the final clean-export pass; no mocked result is presented as real generated-feature verification.

The opt-in baseline ran on the dedicated test database and exited 0. Its raw output is retained in [the evidence file](evidence/m1-baseline.json): 10 warm-ups, 190 measured requests, five clients, about 419 ms measured duration, zero unexpected errors, p50 about 9.97 ms and p95 about 19.66 ms. Responses included 162 reads, 4 accepted, 11 idempotent, 8 expected busy, and 5 expected validation rejections. Only 3 new mock runs completed within the measured interval; all 4 accepted runs were drained/checked afterward. HTTP request rate includes rejections/reads and is not successful-run throughput. A negative invocation with development mode exited 1 (`CONFIG`) before opening a database.

Captured read-only plans used the history index and event primary-key index; state-filtered history chose a sequential scan/sort on the small synthetic fixture. The dataset contained 38 awaiting-review, 17 failed, and 1 cancelled run, including 32 deterministic seed runs and earlier integration fixtures. These observations justify no production-capacity claim. Process CPU/memory combines client and API; database resource metrics were unavailable. Larger load work remains optional M7.

The explicit dependency audit exited 1 with the existing 10 moderate linter/minimatch findings and zero high/critical. An intermediate install printed zero findings; the explicit audit supersedes that summary. No forced override was applied. Final locked export, repository verification, documentation links, and staged checks are pending below. No M2 work, provider spending, deployment, push, or merge occurred.

### 2026-11-10 — Resumed final acceptance

The human asked to continue, with an additional instruction to draft M2–M6 specs after M1. The previous terminal sessions no longer existed, so Codex did not assume their unfinished checks passed. Docker Desktop was restarted and the dedicated test service reached healthy status. Root `npm run verify` exited 0 with 18 unit/HTTP tests, typed lint fixtures, builds, and strict typechecks.

The independent clean export of 71 authored/lock files (no copied `node_modules` or build output) at `C:\Users\viest\AppData\Local\Temp\forgets-m1-b55e3fd806dc48849d04156076dd92f5` ran `npm ci` (223 packages installed, exit 0), `npm run verify` (18 tests, exit 0), and the actual PostgreSQL/API integration commands (9 + 3 checks, exit 0, no skips). The temporary export remains outside the repository. The root Compose configuration, whitespace inspection, and 59 local documentation links passed. The final status/metadata edits are documentation-only; staged checks precede the M1d commit.

M1 is complete for review with the known dependency audit findings and hosted-CI limitation. The Nov 9 raw performance evidence is preserved without claiming a new run on Nov 10. No sandbox, live model, generated-code execution, approval mechanism, push, or deployment has been introduced. The next authorized work is documentation for M2–M6, then a review checkpoint before any M2 implementation.

## 2026-11-10 — M2–M6 specification drafts

### Human direction and agent involvement

After M1 the human requested the missing M2 through M6 specs, then instructed Codex to continue. Codex completed and committed M1d as `ea56b1b` before drafting these documents. It wrote [the planning task spec](../specs/internal/roadmap-m2-m6-drafts.md), then five milestone drafts with prerequisites, boundaries, implementation sequence, unhappy-path-first acceptance criteria, actual verification requirements, open decisions, and review gates. No sub-agents were used and no later runtime code was written.

The [spec index](../specs/internal/README.md), roadmap, and README now make the drafts discoverable. [ADR 0005](adr/0005-milestone-handoffs.md) records proposed evidence/capability handoffs: real isolation before edits, actual checks before eligibility, advisory review plus a trusted artifact-bound human decision, and separately authorized publication. Drafts preserve historical mock provenance and carry explicit migration requirements. The optional frontend stack/provider/runtime/publisher choices remain unapproved; no release versions or performance results were invented.

M2 specifies actual negative containment tests before a live change, with provider credentials outside workers and no host fallback. M3 fixes the maximum at two repairs and requires fresh actual verification for changed artifacts. M4 binds decisions to current evidence/digests without giving approval to models or a UI. M5 requires at least five distinct reproducible evaluation cases with truthful results. Optional M6 covers a browser-safe contract boundary, local accessible UI, and separately authorized GitHub operations using a fake publisher first. M7 remains independent scaling/load work.

### Verification and review

`npm run format` and `npm run format:check` exited 0. One-off Node verification passed all 107 final local Markdown links, with no local fragment targets; only the 12 intended documentation files changed, and the charter differs only by its five new draft links. Unstaged whitespace checks passed; staged diff/scope/whitespace are inspected before committing this completed planning task separately from M1d.

No runtime/dependency/tooling files changed during drafting, so M1 runtime checks were not repeated for documentation-only changes. All M2–M6 drafts remain unimplemented and require explicit authorization. M1 awaits human result review. The dedicated test PostgreSQL service remains running for inspection; the API instances used by tests shut down. No live provider call, GitHub write, push, merge, or deployment occurred.

## 2026-11-10 — Codex development model policy

The human requested lower-overhead, task-aware Codex development settings, with stronger reasoning for architecture/security, Medium coding, Low lightweight work, one primary, bounded delegation/repairs, and a clear distinction between enforced settings and advisory/external routing. They explicitly excluded ForgeTS runtime agents and a custom router without further approval.

Codex used the OpenAI Docs skill, inspected installed help/native model metadata and current configuration, then wrote [the task spec](../specs/internal/codex-development-routing.md) before changes. CLI is 0.162.1, VS Code's bundled CLI is 0.164.0-alpha.11.1; the newer model-cache version was not mistaken for the installed binary. The actual catalog lists Astra/Sol/Luna and the selected reasoning levels. The existing user default is Sol/High with priority service. No project `.codex` configuration existed.

Added a minimal trusted-project Sol/Medium default, a one-child concurrency cap, and three small role files (architect Astra/High, TypeScript Sol/Medium, lightweight Luna/Low). AGENTS now sets single-primary/task/context/repair/deterministic-verification guidance. [ADR 0006](adr/0006-codex-development-routing.md) documents exact enforcement, manual commands, open activation limits, and the absence of automatic semantic primary routing. No extra feature flag, profile, router, application code, or global setting was changed.

Actual configuration verification: Python TOML parsing passed all four files. Native strict configuration reads in an isolated trusted validation home returned the expected project model/effort/agent settings in both clients. An unknown-key negative control was rejected. IDE prompt metadata exposes the three model-pinned roles; the older standalone CLI does not expose those roles, including after a one-off feature-flag probe, so that ineffective flag was not added. An early strict probe against the real user configuration could not initialize because of the existing ignored `windows_wsl_setup_acknowledged` key; the isolated check avoids changing that unrelated setting. `codex doctor` loads configuration but reports unrelated optional integrations and the old warning, so its overall nonzero exit was not misrepresented as a clean health check.

Crucially, a native read using the actual user profile reports ForgeTS as untrusted: its effective values remain Sol/High until the human explicitly trusts the project and reloads/starts a session. No trust entry was silently written. The user config SHA-256 remained unchanged. Metadata inspection generated no model turn/subagent, and no application tests or provider calls were used to validate developer preferences. No savings or allowance guarantee is claimed. M1 review/M2 implementation status is unchanged.

Final deterministic checks passed: four TOML files parsed, three role/model/effort mappings matched, all 112 local Markdown links resolved, and exactly nine intended development-config/documentation files changed with no application/dependency modification. Initial formatting warnings in AGENTS and ADR 0006 were corrected; `npm run format:check` exited 0. Staged whitespace/scope are inspected before the local commit. Current-user project trust and primary model changes remain explicit manual steps, not unperformed checks reported as automatic activation.

## 2026-11-10 — M2 starts: bounded capability policy

The human declared planning complete, directed milestone-by-milestone implementation, and requested development token usage/remaining allowance percentages after milestones. One primary Codex agent started `m2/sandbox` from clean local `master` without delegation, network Git access, merging, or rewriting history. The earlier branching-policy commit remains on `docs/branching-workflow`; it was not silently merged. M2 implementation is now authorized, with review before M3. The question about the worker image and provider/model/paid-test budget remains unanswered; no permission or spending is inferred.

The first spec adds a pure capability policy to the agents package, with bounded portable source snapshots, deterministic hashes, and exact-preimage atomic replacement results. Unsupported fields/operations, unsafe paths, collisions, stale hashes, and size limits are denied. There are no filesystem/subprocess/provider operations. ADR 0008 records why this is validation evidence, not containment. M2's provider, actual disposable worker, persistence/provenance integration, sample target, ownership integration, containment suite, and live run remain incomplete.

Test-first evidence: the new five-test suite compiled successfully, then failed all five against explicit missing-behavior placeholders. The implementation initially hit an ES2023 typing error for `String.isWellFormed`; a bounded UTF-8 round trip fixed compatibility without broad compiler changes. The policy suite then passed 5/5. `npm ci` succeeded and reported the existing 10 moderate findings; no audit fix or dependency change was made. `npm run verify` exited 0, passing formatter, build, typed lint (including promise-rule controls), strict typechecks, and all 23 unit/HTTP tests. No database integration, generated-code execution, actual containment, or live-provider checks were run or claimed. Final documentation formatting/local-link and staged whitespace/scope checks precede the local spec commit.

Usage reporting for this M2 increment: development token count **unavailable**; remaining Codex account allowance **unavailable (%)**, because the session exposes neither measured token accounting nor account limits. No additional runtime provider invocation was performed. Runtime provider-reported tokens will be recorded separately when available. The milestone remains in progress; this is not a completed-milestone usage total. The lesson is to establish precise input-policy evidence before adding runtime capabilities, while preserving the distinction between validation, containment, and live completion.

## 2026-11-10 — M2 disposable Docker worker

The human approved the official Node image and explicitly required fake provider testing with paid calls blocked, then asked Codex to continue. One primary agent added the runner spec before behavior and observed the three unit tests and six containment checks fail against compiling placeholders. The approved image pull completed with index digest `sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152`; no external Git repository was accessed. ADR 0009 records the selected local Docker Desktop boundary, quotas, cleanup policy and residual limits.

During development, the human created commit `7796704` titled `m2 done` containing the worker files. Codex preserved it without amendment/rewrite. The title is not evidence that M2 is complete. Codex's follow-up fixes the observed cleanup lint error and records actual checks. A host probe quoting error was corrected using stdin; it did not execute a worker or establish a containment result. `npm ci` passed with the known 10 moderate findings. `npm run verify` passed all 26 unit/HTTP tests and format/build/lint/strict typecheck gates. Actual containment passed 6/6, and existing disposable PostgreSQL/API regressions passed 12/12. Version/hash/canary/resource results and remaining gaps are in [M2 verification](m2-verification.md).

The worker transfers bytes without host mounts or keys, runs as uid 1000 with network disabled and bounded CPU/memory/PIDs/disk/time/output, and verifies deletion after success/failure/cancellation. Real negative probes demonstrated network/resource denial, descendant cleanup and unchanged disposable host data. This standalone capability is not yet a durable M2 pipeline or a live provider demonstration. Paid testing remains blocked. Development tokens and remaining allowance percentage remain unavailable, and no runtime provider was invoked. The lesson is to validate the runtime directly and preserve the distinction between a commit label, passing containment checks and completed milestone acceptance.

## 2026-11-10 — M2 provider adapter with fake transports

One primary Codex agent used the OpenAI Docs skill to inspect official Structured Outputs and model documentation, then implemented the provider increment under the human's fake-only testing instruction. A fixed Responses endpoint, native Node fetch, versioned prompts/strict role schemas, bounded attempts/input/output/deadlines, disabled-by-default native calls and explicit fake/network invocation provenance replace no M1 behavior. No live model was silently selected: the initially inspected GPT-4.1 Mini is documented as deprecated. ADR 0010 records the choice and open live decisions.

The initial six provider tests compiled and failed against placeholders; after implementation they passed. Two focused test-first regressions then demonstrated an escaped-key echo bypass and uncancelled hanging fake stream. Both were fixed, and all eight tests passed. Full `npm run verify` exited 0 with 34 unit/HTTP tests and all format/build/lint/strict typecheck gates. An intermediate unused-variable lint failure was fixed without suppressions. No external provider request was made; fixture token values are synthetic parser test data. Codex token counts and remaining allowance percentage remain unavailable. Durable workflow/persistence integration and a paid live demonstration are still incomplete; no M3 work started. The lesson is that structured-output validation still needs independent secret, capability, provenance and cancellation checks.

## 2026-11-10 — M2 durable offline fixture workflow

Following the human's continuation instruction, one primary agent completed the durable fixture increment on `m2/sandbox`, without delegation, remote writes, merging or paid provider calls. The spec preceded behavior changes; ADR 0011 records ports/composition, the fixed approved sample, shared PostgreSQL ownership/admission, additive state/provenance migration, pending-versus-observed tools, bounded before/after artifacts and `IMPLEMENTED_UNVERIFIED`. The old HTTP API still submits mock runs only; a separate fixture CLI offers no provider/model/key/image/command/target override. Host compilation/tests cover trusted development assets, not worker-edited generated bytes.

Initial expected failures were observed after compilation for five core tests, cross-mode contract validation, additive PostgreSQL admission, sample greeting, CLI validation, the end-to-end CLI invocation and the new ownership-before-start check. They failed against missing behavior or missing constraints, not unavailable dependencies. An unused import, test lint parameter and patch syntax error were fixed. Fixture identity checking caught a formatter-induced source mismatch; the approved in-memory bytes were synchronized to the formatted trusted sample, preserving the identity assertion. No lint/test rule or acceptance criterion was bypassed.

Actual final checks: `npm ci` passed with the known 10 moderate findings; no installed package version was upgraded. `npm run verify` exited 0 with formatting, build, typed lint/promise controls, strict typechecks and all 43 unit/HTTP tests. Sequential workspace PostgreSQL/API integration commands passed 13/13. `npm run test:containment -w @forgets/runner` passed 8/8 with the disposable test database: real fixture CLI/Responses-fake/Docker/PostgreSQL persistence and reload, idempotent retry, historical mock provenance, ordered events, owner-gated orphan cleanup, actual owner-connection termination, resource/network/cancellation probes and descendant cleanup. No labeled workers remained.

A separate actual run was retained in `docs/evidence/m2-fixture.json`, with two fake invocations, null provider usage and an actual completed file replacement/diff/hash record. Development token count and remaining account allowance percentage remain unavailable; fixture values are not Codex billing measurements. The offline implementation is ready for human review, but the full M2 milestone remains incomplete because live model/account/currency-budget validation and the authorized live demonstration are blocked by the human's paid-test instruction. No exception or M3 approval is inferred. The lesson is that durable artifact evidence, successful containment and inference provenance must be recorded independently, especially when a run is deliberately unverified.

Final deterministic review resolved all 143 local Markdown links, confirmed that existing installed dependency versions/integrities/resolved URLs did not change, and independently validated the retained run's schema, source/result/diff/invocation hashes and fake/null-usage provenance. Formatting and whitespace checks passed. The expected topic branch and unchanged local `master` were confirmed; scoped staging is inspected before the local commit. The human's existing commit history remains intact.

## 2026-11-10 — M3a immutable tools and actual checks

The human explicitly authorized M3 after the M2 evidence handoff, retaining blocked paid tests and unverified M2 live acceptance. One primary agent created stacked local `m3/verification` from unmerged M2 without changing `master` or rewriting history. A spec and ADR 0012 preceded execution changes. Trusted offline preparation copied 7,780 locked regular dependency files (68,244,040 bytes) plus fixed check assets into a scoped disposable context, rejected links/unsupported files, executed no Dockerfile RUN/install hooks and used no build network. The observed image/fingerprint/versions and residual bootstrap trust are in [M3 evidence](m3-verification.md).

Three policy unit tests first failed against compiling placeholders. Actual target-tool integration fixtures followed the initial adapter; their chronology is not misrepresented as full test-first execution coverage. Two later failing regressions exposed accepted source mutation and absent expected-image pinning; post-check byte comparisons and an image guard corrected them. Explicit parser roots, ESM worker assets and cleanup/sanitization changes resolved observed lint/setup failures without suppressions. Real tools detected format/lint/type/assertion defects; missing/stale checks, hostile network/credential attempts, hangs, floods and cancellation could not pass. Detached processes were removed with the container namespace.

`npm ci` passed with the known 10 moderate dependency findings. Final `npm run verify` exited 0 with all 46 unit/HTTP tests and formatter/build/typed-lint/strict-typecheck gates. PostgreSQL/API regressions passed 13/13. An initial combined worker suite hit an M2 PID timeout while preparation overlapped; the unchanged M2 suite passed a quiet rerun. A later clean-lint capture failure blocked a round; focused lint passed. The final fully serial worker/check suite passed 15/15 with original limits and no criteria weakened. No labeled workers remained. These transient failures are retained as uncertainty, not erased or assigned an unproven root cause.

During M3a the human directed completion of M3 and explicit local merges of M2/M3 into `master`, reserving remote pushes to themselves, and requested a standing commit/merge rule. That changes the pending integration authorization, not the outcome of M2's unperformed live test. Durable repair/workflow policy changes follow this increment. No provider credits, remote access or M4 work occurred. Development tokens and remaining account percentage remain unavailable. The lesson is that check provenance, immutable tool identity, source mutation and missing-capture failures need independent gates alongside OS containment.

## 2026-11-10 — M3b durable bounded repair

One primary agent implemented the repair spec and ADR 0013 under the human's instruction to finish M3. Six initial core tests, central lifecycle validation, real PostgreSQL checkpoint validation, CLI validation and the actual CLI integration first failed against compiling missing behavior. Later test-first regressions exposed dropped cancellation cleanup evidence and duplicate check IDs poisoning a failure snapshot. Both were fixed before completion. Stale/oversized/foreign/scope-expanding provider replies, failed invocations, persistent defects, ownership loss and persistence uncertainty are covered. The original M1/M2 records/ports remain usable; source/artifact identity is checked before continuation.

Each pending round, counted attempt, proposed repair and observed check is persisted through optimistic version/event transactions. `REPAIRING` participates in the same single-active-run index, and restart marks uncertain attempts unknown without replay. At most two repairs and three fresh four-check rounds are possible. Actual tools are in a pinned local offline image; fixture inference is explicit and no native provider was called. Success is `VERIFIED_AWAITING_REVIEW`, never approval or merge readiness. All generated target execution stays in disposable workers.

Actual gates passed: clean `npm ci` (known 10 moderate findings retained), `npm run verify` with 56 unit/HTTP tests plus formatting/build/typed lint/strict typechecks, 14 sequential PostgreSQL/API integration tests, and 16 final serial worker/check/repair integration tests. The expanded core fixture cases were explicitly recompiled/rerun after the full gate. The actual CLI demonstration repaired a genuine type error with one fixture repair and eight real check results, stopped a persistent defect after two repairs/twelve results, and persisted a malformed repair as one failed attempt. Reloaded rows matched, idempotent retries performed no work and events were contiguous. No labeled workers remained.

The [repaired](evidence/m3-repaired.json) and [persistent-failure](evidence/m3-persistent.json) records were read from the disposable PostgreSQL database after the successful suite. They retain actual hashes, exits/flags/durations and explicit fixture/null usage. No metric was invented or inferred from unit stubs. Development token count and remaining account percentage are unavailable; no native/paid provider invocation or M4 work occurred. Earlier timeout observations remain in M3 evidence rather than being hidden by the final passing run. The remaining step is the authorized local integration policy and merges; the human will push. The lesson is that attempts must be counted before invocation and that unknown/cancelled/duplicate evidence must fail without manufacturing a durable pass.

Final deterministic checks independently parsed both retained runs, replayed their bounded patch chains as data, verified source/result/diff/output hashes and distinct check identities, and confirmed actual-tool versus fixture/null-usage provenance. All 167 local Markdown links resolved and formatting/staged whitespace passed. No generated target bytes were executed on the host during this artifact verification.

## 2026-11-10 — Standing local milestone integration policy

The human explicitly instructed Codex to finish M3 and merge M2/M3 into local `master`, then record that all completed milestones must be committed and merged, with remote pushes reserved to the human. The workflow spec preceded documentation changes. AGENTS, ADR 0014, README, current milestone status and human attribution now make local integration standing authorization after required gates. Failed/blocked work still requires an explicit accepted exception; the known M2 live limitation stays open and is not relabeled as passing. The rule applies to ForgeTS development, not runtime approval or the next milestone.

One primary agent made documentation-only changes and checks formatting, local links, staged scope and existing tested-code identity before committing. Local M2 then M3 merges are authorized; no remote access, push, deployment, paid call, branch deletion or M4 work is performed. Actual merge hashes and post-integration checks are recorded afterward rather than predicted. Development tokens/account quota remain unavailable. The lesson is to separate standing local workflow authority, runtime trust boundaries and remote publication authority explicitly.
