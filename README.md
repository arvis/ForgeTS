# ForgeTS

ForgeTS is an independent learning and portfolio project for a small TypeScript agentic software factory. **Current state: M0 foundation only, awaiting human review.** There is no runnable factory, API, CLI, database schema, agent, or sandbox yet. The roadmap is in [PLAN.md](PLAN.md).

## Why this exists

The irony is intentional: ChatGPT suggested building an agentic software factory to help its human collaborator learn and demonstrate engineering skills for an application to Levelpath. Codex is now helping implement a factory for coding agents. Eventually, the factory may help improve itself. This is an independent learning project, not a Levelpath product, a production system, or a claim of prior professional factory experience.

Codex's development workflow is separate from ForgeTS's future runtime. The current spec, generated changes, verification evidence, and human review are the first part of the meta-demo; ForgeTS cannot process a feature specification yet.

## Setup and verification

Use Node 24.x (at least 24.11.0) and npm 11.x. The tested bootstrap versions are Node 24.11.0 and npm 11.6.1; `.nvmrc` and `packageManager` record them. Git is needed for normal repository development. Docker with Compose is optional for M0 checks and required only for the development database commands.

From the repository root:

```sh
npm ci
npm run verify
```

No API keys, paid calls, Docker daemon, or database are required for baseline verification. `verify` checks formatting, ESLint, strict TypeScript, and then builds and runs the baseline test. The test imports the compiled core package through its ESM export; it proves only that the workspace build/test wiring works. It does not test any factory behavior.

| Command                | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `npm run format`       | Format authored files                       |
| `npm run format:check` | Check formatting without changing files     |
| `npm run lint`         | Run ESLint with zero warnings allowed       |
| `npm run typecheck`    | Check all workspace TypeScript              |
| `npm run build`        | Compile all workspace TypeScript            |
| `npm test`             | Build and run workspace tests               |
| `npm run verify`       | Run the baseline verification gates         |
| `npm run db:config`    | Validate Compose without starting Docker    |
| `npm run db:up`        | Start PostgreSQL and wait for health        |
| `npm run db:down`      | Stop PostgreSQL, preserving its data volume |

GitHub Actions is configured to run `npm ci`, `npm run verify`, and `npm run db:config` on Linux. Adding a workflow does not establish that hosted CI has passed. Actual local results and environment limitations are recorded in [the build log](docs/build-log.md).

At the M0 checkpoint, `npm audit` reports 10 moderate development dependency findings associated with the linter's transitive `minimatch` dependency. These remain unresolved; passing `verify` does not mean the audit passed. The [ADR](docs/adr/0001-m0-foundation.md) records why no forced cross-major override was applied.

## Optional local database

```sh
npm run db:config
npm run db:up
docker compose exec postgres pg_isready -U forgets -d forgets
npm run db:down
```

Compose defaults to PostgreSQL 17 at `127.0.0.1:5433`, database/user `forgets`, password `forgets_dev_only`. These are public development credentials. `.env.example` documents optional overrides; copy it to an ignored `.env` if needed. Do not put provider keys in that file or reuse these credentials elsewhere. M0 tooling does not connect to PostgreSQL.

The named volume retains data across `db:down`. Existing database volumes retain their original credentials even if `.env` changes. The `postgres:17` tag may receive updates, so image bytes are not pinned. This database container is infrastructure, not the future sandbox for generated code. If Docker Desktop is installed but stopped, configuration validation still works; database startup requires its Linux engine.

## Architecture and scope

```text
specs/internal/m0-bootstrap.md   M0 scope and acceptance criteria
packages/core/                  Empty runtime boundary + compiled ESM smoke test
docs/adr/                       Architectural decisions
docs/threat-model.md             Current and intended trust boundaries
docs/build-log.md                Agent assistance and actual verification
.github/workflows/ci.yml         Baseline Linux verification
compose.yaml                    Optional development PostgreSQL
```

The root uses npm workspaces (`packages/*` and future `apps/*`), one lockfile, strict NodeNext TypeScript, ESLint, Prettier, and Node's built-in test runner. Only `@forgets/core` exists. Its runtime export is intentionally empty. The [initial ADR](docs/adr/0001-m0-foundation.md) explains the defaults and deferred choices.

The intended later pipeline is spec validation, planning, isolated implementation, deterministic verification with bounded repairs, advisory review, and a human approval gate. None of those stages is implemented at M0. Host development commands execute trusted bootstrap tooling; they do not establish isolation for untrusted generated code. See the [threat model](docs/threat-model.md).

## Review checkpoint

Review the [M0 specification](specs/internal/m0-bootstrap.md), ADR, changes, and build log before authorizing M1. M1 will introduce contracts, orchestration, persistence, and a simulated CLI/API workflow. No milestone beyond M0 has been started. There are no factory evaluation metrics or security guarantees to report yet.
