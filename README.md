# ForgeTS

ForgeTS is an independent learning and portfolio project for a small TypeScript agentic software factory. **Current state: M1 is implemented; M2's fake-provider sandbox workflow is implemented, with live acceptance still blocked.** The local NestJS API persists simulated M1 runs. A separate fixture CLI drives real disposable Docker file edits and persists their hashes/diff, explicitly marked unverified. No generated code is executed and no paid provider call is enabled by the CLI. The roadmap is in [docs/PLAN.md](docs/PLAN.md), and workflow rules are in [AGENTS.md](AGENTS.md).

## Why this exists

The irony is intentional: ChatGPT suggested building an agentic software factory to help its human collaborator learn and demonstrate engineering skills for an application to Levelpath. Codex is now helping implement a factory for coding agents. Eventually, the factory may help improve itself. This is an independent learning project, not a Levelpath product, a production system, or a claim of prior professional factory experience.

Codex's development workflow is separate from ForgeTS's runtime. The internal specs, generated changes, verification evidence, and human review show how the factory was built; ForgeTS itself now processes a separate feature spec through a clearly labelled mock workflow.

For a portfolio walkthrough, start with [human input and project direction](docs/human-input.md), then follow the linked specs, ADRs, and [build log](docs/build-log.md) for implementation and verification evidence.

The [milestone spec index](specs/internal/README.md) links M0–M7. [M2 evidence](docs/m2-verification.md) distinguishes actual containment/persistence checks from fake inference and the unperformed live run. M3 and later remain unimplemented.

## Setup and verification

### M2 fixture demo

The worker supports Windows with Docker Desktop's Linux amd64 engine and cgroup v2 only; other runtimes fail closed. Acquire the approved pinned image during trusted setup:

```powershell
docker pull node@sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152
npm run db:test:up
$env:FORGETS_ENV = 'test'
$env:FORGETS_DB_PASSWORD = 'forgets_test_dev_only'
npm run build
npm run factory:sandbox -- specs/examples/sandbox-greeting.md demo-greeting-1
npm run test:containment -w @forgets/runner
```

Run the fixture CLI while the mock API is stopped: they intentionally share one exclusive database owner. A repeated key returns the previous run without replay. The CLI applies additive local migrations and recovers interrupted records/workers; it never resets the database. Output ends at `IMPLEMENTED_UNVERIFIED`, with fake invocation provenance, actual worker outcomes and inspectable before/after artifacts. A `SANDBOX_FAILED`/cleanup error requires inspecting the engine and retained evidence before retrying. The example test database is disposable; no production endpoint or provider credentials belong in this demo. Use a new key after restarting the tmpfs database.

### Development setup

Use Node 24.x (at least 24.11.0) and npm 11.x. The tested versions are Node 24.11.0 and npm 11.6.1; `.nvmrc` and `packageManager` record them. Git is needed for normal development. Docker Desktop's Linux engine with Compose is required for the documented database, integration tests, and mock demo. Unit verification works without Docker.

From the repository root:

```sh
npm ci
npm run verify
```

No API keys or paid calls are required. `verify` checks formatting, builds in dependency order, runs typed ESLint and its negative/positive promise-rule fixture, strict typechecks, and unit/HTTP-boundary tests. Real PostgreSQL integration checks and the opt-in performance baseline are separate commands. Run `build`/`verify` before the CLI, API, migration, or baseline commands.

| Command                           | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `npm run format`                  | Format authored files                                    |
| `npm run format:check`            | Check formatting without changing files                  |
| `npm run lint`                    | Run ESLint with zero warnings allowed                    |
| `npm run typecheck`               | Check all workspace TypeScript                           |
| `npm run build`                   | Compile all workspace TypeScript                         |
| `npm test`                        | Build and run workspace tests                            |
| `npm run verify`                  | Run the baseline verification gates                      |
| `npm run test:integration`        | Run actual PostgreSQL, NestJS, and CLI integration tests |
| `npm run api`                     | Start the local mock API                                 |
| `npm run factory -- run PATH KEY` | Submit a bounded Markdown file and wait for the report   |
| `npm run db:migrate`              | Explicitly apply additive local migrations               |
| `npm run perf`                    | Run the bounded local test-database baseline             |
| `npm run db:config`               | Validate Compose without starting Docker                 |
| `npm run db:up`                   | Start PostgreSQL and wait for health                     |
| `npm run db:down`                 | Stop PostgreSQL, preserving its data volume              |
| `npm run db:test:up`              | Start the separate tmpfs test database                   |

GitHub Actions configures its own PostgreSQL test service, locked installation, verification, integration tests, and Compose validation on Linux. Hosted CI has not been observed. Actual local evidence is recorded in [the build log](docs/build-log.md).

At the M0 checkpoint, `npm audit` reports 10 moderate development dependency findings associated with the linter's transitive `minimatch` dependency. These remain unresolved; passing `verify` does not mean the audit passed. The [ADR](docs/adr/0001-m0-foundation.md) records why no forced cross-major override was applied.

## Run the mock demo

PowerShell, first terminal:

```powershell
npm run db:config
npm run db:up
$env:FORGETS_ENV = 'development'
$env:FORGETS_DB_PASSWORD = 'forgets_dev_only'
npm run db:migrate
npm run api
```

Second terminal:

```sh
npm run factory -- run specs/examples/add-project-api.md portfolio-example-1
npm run factory -- list
```

Copy the printed UUID to use `inspect RUN_ID`, `events RUN_ID`, `report RUN_ID`, `wait RUN_ID`, or `cancel RUN_ID` after `npm run factory --`. The stable key makes repeated identical requests return the existing run; reusing it for different content returns a conflict. New distinct submissions return busy while another run executes. Awaiting-review runs release that slot.

The API is `http://127.0.0.1:4310`. It exposes `POST /runs`, `GET /runs`, `GET /runs/:id`, `GET /runs/:id/events`, `GET /runs/:id/report`, `GET /runs/:id/wait`, and `POST /runs/:id/cancel`. Submit JSON with `markdown`, `idempotencyKey`, and optional `mode: "mock"`. The API accepts no filesystem paths. The CLI's optional `FORGETS_API_URL` must be an HTTP IPv4-loopback URL. Lists default to 20 records, capped at 100; API run history uses `cursor` and optional `state`, and events use `after` sequence. Pagination is a live view, with timestamp/ID tie-breaking rather than snapshot guarantees.

Input format is demonstrated in the example: one `# Title`, a `## Goal`, and bullet lists under exact `## Requirements`, `## Acceptance Criteria`, and `## Constraints` headings. Unknown sections and fields fail validation. Limits: 64 KiB input/structured values, 128 KiB HTTP JSON bodies, 20 stage transitions, 30 seconds per mock run, and database operation timeouts no greater than 5 seconds. No repair retries exist in M1.

Development PostgreSQL is fixed to `127.0.0.1:5433`, database/user `forgets`; test PostgreSQL is `127.0.0.1:5434`, database/user `forgets_test`. Public development passwords are `forgets_dev_only` and `forgets_test_dev_only`, respectively. The API/config validator rejects unsupported targets, public bind addresses, arbitrary URLs, ambient `PG*` settings, and unknown `FORGETS_*` overrides. The service reads environment variables directly, without loading `.env`; Compose may read `.env`. Keep Compose's targets consistent with the fixed application policy and never use production credentials or forwarded production ports. Supply `FORGETS_DB_PASSWORD` explicitly. Unix shells can use `export NAME=value` instead of PowerShell syntax.

The demo volume retains data across `db:down`; the test service uses disposable tmpfs storage and separate credentials. Migrations run only by explicit command before startup; there is no reset/drop command. Start only one API owner per database. A competing owner/migration is refused. On restart, interrupted executing runs become `FAILED` with `INTERRUPTED` evidence, while completed awaiting-review reports survive. If the database is unavailable, restore the same local database/migrations and restart; the service cannot claim durable outcomes during an outage. No stage is automatically replayed. The `postgres:17` tag is mutable. These database containers are infrastructure, not code execution sandboxes.

## Integration and bounded performance evidence

```powershell
npm run db:test:up
$env:FORGETS_DB_PASSWORD = 'forgets_test_dev_only'
npm run test:integration
$env:FORGETS_ENV = 'test'
npm run perf
```

Integration tests apply migrations only to the fixed test target, exercise transactions/recovery, and start their own temporary API. Stop other test API owners before running them. The performance command also owns its own test API, seeds 32 deterministic mock runs, inspects read-only query plans, then issues 10 warm-up and 190 measured requests with at most 5 clients and a 60-second cap. It reports actual classifications, p50/p95 latency, successful-run counts, query plans, and combined client/API process resource observations. Database CPU/memory is marked unavailable. Initial measurements establish a baseline; there is no invented performance SLO or production-capacity claim. Performance is opt-in and separate from ordinary CI. M7 contains larger load/scaling work.

Specs and reports are development data: do not paste secrets into them. Stored diagnostics use bounded error codes, not raw exception messages. Authentication, hostile-code containment, real verification/repair, and an enforced human approval mechanism are future work. M1 stops at `AWAITING_HUMAN_APPROVAL` with `mergeReady: false` and offers no approval or publishing command.

## Architecture and scope

```text
AGENTS.md                       Repository-wide development and commit rules
docs/PLAN.md                    Project charter and milestone roadmap
specs/internal/                 Reviewed task specs and acceptance criteria
packages/contracts/             Zod schemas, Markdown and local configuration policy
packages/core/                  Typed orchestration and repository port
packages/agents/                Deterministic mock roles with no execution adapters
packages/persistence/           PostgreSQL migrations, owner lock, transactions, pages
apps/api/                       Local NestJS transport
apps/cli/                       Bounded-file-input HTTP client
docs/adr/                       Architectural decisions
docs/threat-model.md             Current and intended trust boundaries
docs/build-log.md                Agent assistance and actual verification
.github/workflows/ci.yml         Linux unit/integration workflow (hosted run unobserved)
compose.yaml                    Separate development and test PostgreSQL
```

The root uses npm workspaces, one lockfile, strict NodeNext TypeScript, typed ESLint, Prettier, and Node's built-in test runner. The [runtime ADR](docs/adr/0004-m1-runtime-boundaries.md) explains interface boundaries, locking, persistence, and verification choices.

The current pipeline validates a real spec, persists transitions, and simulates planning, implementation, verification, and advisory review. Later milestones add a strong execution boundary, real verification/repair, and enforced human approval. Host development commands execute trusted tooling under host permissions. See the [threat model](docs/threat-model.md).

## Review checkpoint

The human authorized M1 after reading the specs. Review the [M1 specification](specs/internal/m1-contracts-orchestration.md), [verification record](docs/m1-verification.md), ADRs, and commits before authorizing M2. Local verification passed 18 unit/HTTP tests and 12 PostgreSQL/end-to-end checks, including a clean locked export; the small load baseline and open audit findings are recorded separately. Hosted CI remains unobserved. No M2 implementation, provider spending, push, merge, or deployment is authorized by M1 completion.
