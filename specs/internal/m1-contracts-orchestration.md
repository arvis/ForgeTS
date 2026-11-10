# M1: Contracts, persisted orchestration, and a safe mock workflow

Status: implementation authorized by the human on 2026-11-09 and completed with local acceptance verification on 2026-11-10. Awaiting human review before M2. See [the verification record](../../docs/m1-verification.md) for evidence and limits.

## Goal

Implement the M1 milestone in [the charter](../../docs/PLAN.md): a Markdown feature spec passes through validated contracts, deterministic mock roles, persisted transitions, and a report accessible through the CLI and local NestJS API. Incorporate the human's requested safeguards, architecture, scaling, and TypeScript recommendations before writing behavior.

This is a simulation of factory stages. Passing M1 does not establish containment of generated code, actual feature implementation, or production readiness. See [ADR 0003](../../docs/adr/0003-m1-safety-and-architecture.md) and [the threat model](../../docs/threat-model.md).

## Implementation sequence

1. After authorization, specify the Markdown format and Zod contracts with negative fixtures first. Define allowed transitions and mock-only execution capabilities.
2. Add persistence and explicit development migrations, including atomic state/event updates, duplicate-request handling, and single-run admission tests.
3. Add deterministic mock planner, implementation, verification, and review responses behind interfaces. Validate every external/mock response before progressing.
4. Add thin CLI and API adapters using the same core use cases; demonstrate a complete persisted mock run and inspection of its report/events.
5. Enable type-aware linting, run unhappy-path and successful-path verification, document actual evidence, and commit each completed implementation spec separately. Stop for milestone review afterward.

Split implementation into small internal specs as needed. This planning commit does not complete M1.

## Architecture and scope

- Use a modular application with explicit contracts, core orchestration, mock agents, persistence, and CLI/API adapters. Create packages only when they are needed. Core depends on interfaces, not NestJS, PostgreSQL driver details, or provider SDKs.
- CLI and API call the same use cases and transition policy. The API accepts bounded Markdown content, not an arbitrary host file path. The CLI may read the explicitly supplied spec file as data; it must not execute it or load code/plugins from it.
- Validate spec data, agent responses, requests, and persisted data at trust boundaries with Zod. Schemas do not grant execution permissions. Reject malformed payloads and unknown capability requests.
- Persist run metadata, ordered events, bounded structured outputs, and a final report in PostgreSQL. For M1, reports can be bounded JSON records; filesystem report export remains later work.
- Record `mode: mock` on runs and reports and identify all implementation, verification, and review results as simulated. Do not fabricate executed commands, diffs, token usage, costs, or security evidence. A mock success has `mergeReady: false`.
- Follow the charter's success path through `AWAITING_HUMAN_APPROVAL`, with explicit `FAILED` and `CANCELLED` paths. Invalid transitions cannot mutate state. M1 exposes no approval, publishing, deployment, or real executor capability. Real repair/retry behavior and enforced approval remain later milestones.

## M1 safeguards

### Execution and filesystem access

- Mock roles return inert data. No model-supplied shell, subprocess, dependency install, generated script, test, migration, Git operation, or target-repository edit can be executed by a run.
- No real provider SDK or paid call is enabled. Reject attempts to select live execution rather than silently falling back to it. Repository/spec content cannot change mode, budgets, endpoints, or tool permissions.
- Keep run-created state in the configured development database. M1 writes no agent-controlled host paths or target repositories. Treat generated file/command descriptions as displayable data only.
- Developer installation, linting, compilation, and tests still execute trusted tooling on the host. Neither this spec nor `AGENTS.md` is an OS sandbox. Git can recover committed project files, not arbitrary personal files. For development isolation, use a disposable VM with only the project and development credentials; no VM is provisioned by M1.

### Production separation and local services

- Bind the unauthenticated API to `127.0.0.1`; explicitly reject public bind addresses in the M1 development configuration. Do not expose it as a hosted or multi-user service. Loopback is not authentication against other local processes.
- Validate database configuration before opening a connection. Permit only explicit local development/test hosts, ports, and database names; reject arbitrary connection strings supplied through specs or API requests. Document the allowed configuration and reject unsupported overrides.
- Do not load provider, SSH, cloud, or production credentials into run context. Never persist full environments, database passwords, raw connection strings, or unrestricted error objects. Persist sanitized, bounded diagnostics.
- Migrations are explicit developer commands using validated development configuration, not run capabilities or automatic production startup actions. M1 migrations create the required schema; provide no automatic database wipe/reset command.
- Integration tests require a dedicated disposable test database with its own explicit configuration and credentials. They must reject the demonstration database and unapproved targets before setup/cleanup. No test may drop a database or reset shared data.
- Local address checks cannot prove that a port is not forwarded to production. Human-controlled development endpoints, isolated credentials, and careful environment setup remain prerequisites; hostname naming and `NODE_ENV` alone are not security barriers.

### Bounded runs and honest failure reporting

- Fix concurrency at one actively executing persisted mock run across CLI/API submissions. Admit a run atomically; return a clear busy result for a second distinct submission. Repeated identical idempotency keys return the existing run; a reused key with different input is rejected. `AWAITING_HUMAN_APPROVAL` releases the execution slot and remains read-only in M1.
- Use transactional state/event updates and a version or equivalent compare-and-set guard. A losing concurrent transition must not append a success event, advance state, or overwrite a terminal result. Define event ordering per run independently of timestamps.
- Set initial limits in trusted configuration: 64 KiB UTF-8 input, 64 KiB per structured output/report, 20 stage transitions excluding the final failure/cancellation transition, a 30-second run deadline, and database operation timeouts of at most 5 seconds. Validate requests before expensive processing and persist only bounded diagnostics. Mock stages have no repair retries in M1.
- Cancellation is cooperative for trusted mock stages. Stop later stages on cancellation/deadline and record the terminal outcome when persistence is available. If the database is unavailable, return a clear persistence failure without claiming a durable terminal event or completed report.
- Require exclusive application ownership before restart recovery; a second live owner must fail startup without changing existing runs. After restart, detect interrupted executing mock runs and mark them failed with an interruption reason before accepting new work. Preserve completed reports and `AWAITING_HUMAN_APPROVAL` checkpoints. Do not automatically replay stages. Document the recovery procedure if persistence is unavailable.
- These bounds control trusted mock orchestration; they do not contain hostile code, synchronous infinite loops, or host processes. Real worker termination/resource enforcement belongs to M2/M3.

## TypeScript and code-quality requirements

- Retain the existing strict compiler settings, including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noEmitOnError`. Avoid weakening types, broad `any`, or unchecked assertions to bypass boundary validation.
- Enable type-aware ESLint for workspace TypeScript with `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises`. Keep Prettier separate from behavior checking and preserve the zero-warning lint gate.
- Add a small verification fixture demonstrating that the selected promise rules reject unsafe asynchronous code and accept a handled equivalent. These are tooling checks, not factory sandbox tests.
- Validate external JSON at runtime; TypeScript types alone do not validate spec text, HTTP bodies, model responses, or database records. Keep domain errors explicit and log sanitized diagnostics.
- Record dependency audit results and review changes to the existing M0 findings. Do not force incompatible overrides or claim that lint/typechecking proves dependency security.

## Test-first acceptance criteria

Write and run the relevant unhappy-path test before each behavior implementation, observe the expected failure, implement, then verify the successful path. Inject clocks/mock boundaries rather than adding long sleeps or paid calls.

| ID  | Required evidence when M1 is implemented                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Missing requirements/acceptance criteria, malformed structured responses, unknown fields that could alter policy, and oversized input/output are rejected without advancing to a successful stage. A valid example Markdown spec completes the mock path.                                                                  |
| AC2 | Spec text requesting deletion, shell execution, production access, a live provider, or changed permissions cannot invoke any execution capability. Attempts to select an unsupported mode are rejected. Tests verify that forbidden adapters are never called; this proves M1 capability absence, not sandbox containment. |
| AC3 | Invalid transitions and competing updates preserve prior state and event ordering. Injected persistence failure rolls back state and event changes together; no success report is claimed. Verify with a real disposable PostgreSQL test database.                                                                         |
| AC4 | Duplicate submissions are idempotent; conflicting keys are rejected. Two concurrent distinct submissions admit only one active run. Cancellation, deadline, transition limit, and interrupted-run recovery terminate or report failure as specified, without duplicate stages.                                             |
| AC5 | Public API bindings, migrations against unapproved targets, and test setup/cleanup against demonstration or unapproved databases fail before connection or mutation. Logs/reports omit configured credential values, raw environments, and unbounded diagnostics.                                                          |
| AC6 | CLI and API use the same orchestration behavior. Reports and persisted records survive application restart and clearly identify simulated results, `mergeReady: false`, and no actual execution. A reviewer recommendation cannot bypass failure or turn a mock run into `APPROVED`.                                       |
| AC7 | Strict typecheck, type-aware lint including promise-rule negative fixtures, formatting, unit tests, and PostgreSQL integration checks actually pass. Commands, expected initial test failures, final results, and environmental blockers are recorded in the build log. No test is reported as run when skipped.           |
| AC8 | README documents local-only setup, sample input, inspection commands, limits, recovery, and residual risks. No claim of production readiness, safe hostile execution, throughput, or security guarantees is made. Human review remains required before the next milestone.                                                 |

## Scaling strategy

M1 prioritizes correctness with one active run and atomic persisted transitions. Do not add distributed queues, Kubernetes, multiple workers, or scaling claims. Keep the core independent of worker placement so a later milestone can add durable jobs and a bounded worker pool. Before raising concurrency, test job ownership, leases/recovery, idempotent processing, cancellation, database contention, and admission limits. Before paid providers, add concurrency/token/cost budgets based on real reported usage. Each future worker needs its own disposable workspace and enforced resource boundaries.

### Database efficiency belongs in M1

- Add indexes and constraints with the schema migrations: primary keys, a unique idempotency key in its documented scope, and unique `(run_id, sequence)` event ordering. Do not create redundant indexes already supplied by primary/unique constraints.
- Choose additional indexes from implemented queries. For example, state-filtered run history ordered by creation time may justify `(state, created_at, id)`; do not add speculative indexes on every column. Record the read benefit and write/storage cost.
- Bound run/event listing with deterministic cursor ordering, a default page size of 20, and a maximum of 100. Test invalid limits and cursor input, ties in timestamps, ordering across pages, and absence of an unbounded list path. Clearly document behavior when records change during pagination.
- Inspect representative read queries with `EXPLAIN (ANALYZE, BUFFERS)` using a documented synthetic development/test dataset and current statistics. This command executes its query: use read-only statements against the dedicated test database. Record dataset size/distribution and plans; a sequential scan on a small dataset is not automatically a failure. Synthetic results describe the fixture, not a production workload.

### Small load baseline in M1

- After the local API/database workflow works, add an opt-in local-only performance script, separate from fast unit tests. Use mock roles and the dedicated disposable test database; no live model, production endpoint, or generated-code worker is involved. A load-testing tool such as k6 can be selected in the implementation spec; no tool is installed by this draft.
- Define and record the endpoint mix, deterministic seed data, warm-up, measured duration, and abort behavior before execution. Cap concurrency at 5 API clients and stop after 200 total requests including warm-up or 60 seconds elapsed, whichever occurs first. Keep one executing mock run regardless of client count; overlapping submissions exercise admission control rather than concurrent workers.
- Measure run/status/event reads and bounded submissions. Record endpoint-level sample counts, p50/p95 latency, request throughput, unexpected errors/timeouts, accepted/busy/idempotent responses, and API/database CPU/memory observations where actually available. Separate API response time from end-to-end mock-run duration.
- Expected busy/validation responses must match their specified semantics. Report them separately from unexpected failures and successful work throughput; a fast rejection must not inflate successful-run performance. A duplicate submission must still produce only one run.
- Correctness failures, unhandled errors, data corruption, and exceeded test safety limits fail the test. Initial latency/throughput observations establish a baseline; choose any later regression thresholds before subsequent measurement and record their rationale. Report sample counts and avoid unsupported capacity claims from a small local test.
- Keep the baseline reproducible with a documented command, tool/database versions, hardware/resource settings, workload, raw summary, and limitations. Run it separately from ordinary CI initially. If no measurement ran, report it as unverified rather than generating representative numbers.

| ID   | Additional M1 acceptance evidence                                                                                                                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC9  | Migrations enforce scoped idempotency uniqueness and per-run event sequence uniqueness; actual listing queries have bounded cursor pagination. Query-plan evidence explains chosen indexes without forcing an index scan or claiming production representativeness.                        |
| AC10 | An actual bounded, mock-backed API/database baseline runs against approved local test resources, preserves single-run admission and persisted consistency, and records its profile, request classifications, sample counts, and measurements. No unexecuted performance result is claimed. |

M3 should verify actual execution time/resource enforcement under deliberately broken workloads. Repeatable baseline reporting in M5 remains a proposed follow-up. The human has requested [optional M7 scaling and load testing](m7-scaling-load-testing.md), now included in the roadmap for larger workload profiles and any multi-worker release. M7 implementation still requires separate authorization. This M1 baseline remains in scope; the dashboard is independent of these backend checks.

References: [PostgreSQL index usage](https://www.postgresql.org/docs/17/indexes-examine.html), [EXPLAIN execution semantics](https://www.postgresql.org/docs/17/sql-explain.html), [API load-test profiles](https://grafana.com/docs/k6/latest/testing-guides/api-load-testing/), and [performance thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/).

## Gate before real execution in M2/M3

Before allowing generated code or target-repository commands, a separate approved sandbox spec must implement and directly verify:

- Disposable strong isolation, with only the run workspace accessible and path/symlink escape checks; no personal directories, host credentials, Docker socket, or privileged containers.
- A non-root process, minimal capabilities, read-only base filesystem where applicable, and enforced CPU/memory/process/output/time limits, plus actual process termination and cleanup.
- Network denied by default, no production endpoints/credentials, and provider credentials held outside the execution worker. Any narrowly scoped dependency acquisition must be a separately controlled phase.
- Allowlisted capabilities with validated arguments outside model control. Dependency installation hooks, builds, and tests all execute potentially hostile code and require isolation even when the command name is allowed.
- Negative containment tests covering host write/delete attempts against disposable canaries, path and symlink escapes, credential reads, unauthorized network access, arbitrary command requests, runaway processes, output flooding, and prompt injection. Never test by attacking real personal or production data.
- An observed failure to enforce any boundary blocks real execution. Document runtime/OS limitations; container usage, Git worktrees, lint success, or reviewer approval alone cannot satisfy this gate.

## Review checkpoint

The human reviewed the specs and authorized M1 implementation. Contracts, mock orchestration, local API/CLI, persistence, typed linting, and the bounded baseline are implemented with recorded local evidence. Review the acceptance record, open dependency findings, one-run policy, recovery semantics, and distinction between mock policy and future containment before authorizing M2. Drafting later milestone specs is separately authorized and does not start their implementation.
