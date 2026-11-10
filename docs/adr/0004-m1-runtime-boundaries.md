# ADR 0004: M1 runtime and verification choices

- Date: 2026-11-09
- Status: implementing under the human's explicit M1 authorization

Use separate contracts, core, deterministic agents, and PostgreSQL persistence packages. NestJS is a loopback HTTP adapter; the CLI submits to that service rather than starting a competing orchestrator. A session-level PostgreSQL advisory lock gives one service exclusive ownership; a partial unique index independently limits active runs. Migrations and startup both respect ownership. Release the slot at the awaiting-review checkpoint. Restart fails interrupted executing runs without replay.

Use parameterized SQL and version-checked state/event transactions on a single pooled client. Store bounded validated JSON and an ordered event sequence; compute request fingerprints with SHA-256 of the validated spec. Run history uses `(createdAt, id)` keyset cursors; events use sequence cursors. State-filtered history and unfiltered history need separate query-driven indexes. Cursor pagination is a live view, not a stable snapshot of mutable state filters.

Mock stages have no tool adapters or code loading and return fixed data. Core checks deadlines/cancellation around each awaited stage, bounds input/output and transitions, and persists sanitized error codes rather than arbitrary exception messages. Reports label simulation and never indicate merge readiness. PostgreSQL availability is required for durable evidence; a database failure is reported without pretending a terminal event was stored.

Choose Node's existing test runner and a small native-fetch baseline script instead of adding another test/load framework. The CLI/API share the core service; tests use injected mock stages/clock and a real disposable PostgreSQL instance for transactional evidence. NestJS uses explicit dependency values and decorator metadata, with no provider SDK, telemetry registration, or generator.

Use two distinct local PostgreSQL services: demo on 5433 and opt-in test profile on 5434, with different names/users. Test storage is container tmpfs; never reset/drop the demo database or use arbitrary connection strings. Test isolation uses unique runs and owner locking, not shared-data truncation. Docker Desktop was started for this authorized verification and its engine responded. This database is infrastructure, not an untrusted-code sandbox.

The API binds only to IPv4 loopback, rejects foreign Origin/Host headers, limits JSON bodies, and exposes no approval or executor route. Loopback is not authentication against local software. Dependencies, builds, and tests still execute developer tooling under host permissions. M2 containment remains required before any generated code execution.

Background persistence failures are retained in a bounded in-memory error map so a late `/wait` cannot silently turn a failed background operation into a seemingly healthy active run. This does not claim a durable terminal state during a database outage; restart recovery remains required. Tests first reproduced the late-wait bug before the fix.

References: [M1 spec](../../specs/internal/m1-contracts-orchestration.md), [verification record](../m1-verification.md), [node-postgres transactions](https://node-postgres.com/features/transactions), [NestJS](https://docs.nestjs.com/first-steps).
