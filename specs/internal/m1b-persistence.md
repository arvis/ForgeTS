# M1b: PostgreSQL persistence and exclusive ownership

Implement the reviewed M1 persistence requirements using explicit additive migrations, validated local configuration, a session advisory owner lock, atomic admission, per-run version checks, and state/event transactions. Test configuration is fixed to a separate tmpfs PostgreSQL service on 5434. No cleanup command truncates/drops data.

Unhappy-path-first evidence must cover a second owner, conflicting idempotency keys, busy admission, competing transitions, forced event-write failure rolling back state, invalid targets, and interrupted-run recovery. Happy paths cover durable reload, ordered bounded event/history pages (including timestamp ties), and constraint/index presence. Queries are parameterized. Migrations respect the same owner lock; query/connect timeouts are bounded. Core receives a repository interface, not a PostgreSQL dependency. Record actual real-PostgreSQL evidence and commit this slice separately.
