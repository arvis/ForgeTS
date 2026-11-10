# M2 capability policy

Status: first M2 increment implemented and verified on 2026-11-10; milestone incomplete.

Implement a pure trusted policy for bounded file snapshots and replacement requests before adding a Docker adapter or provider. This increment alone does not enable live execution or satisfy M2 containment criteria.

## Acceptance criteria

- Accept only plain JSON records describing at most eight unique regular UTF-8 source files, each at most 8 KiB and a combined serialized payload at most 32 KiB. Paths use portable relative `src/` segments and `.ts` extensions; reject traversal, absolute/UNC/drive paths, backslashes, Windows reserved names, trailing dots/spaces, hidden segments, ambiguous case aliases, and prefix collisions.
- Only `replace` is permitted. A request contains one to eight complete replacements of existing snapshot files, each bound to its exact SHA-256 previous content. Reject unknown fields, commands, mounts, permissions, links, creation/deletion, duplicate paths, stale hashes, and oversized payloads before changing anything.
- Validation returns copied data and never reads or writes the host filesystem. Hash complete snapshots deterministically independent of input order. Treat returned content as untrusted data; never execute it on the host.
- Write negative tests first, observe behavioral failures using compiling placeholders, implement, then run repository verification. Retain M1 behavior unchanged.
- Record the human's milestone implementation authorization and usage-reporting request. Codex development token counts and remaining allowance percentage are recorded only when available; absence is explicit. Runtime provider usage is separate.
- Commit this spec with its implementation/tests/evidence locally on `m2/sandbox`. Do not push/merge; M2 remains incomplete until its full acceptance criteria and human review.

## Actual verification

All five policy tests initially failed against compiling `NOT_IMPLEMENTED` placeholders for the expected missing behavior. After implementation, all five passed. An intermediate compile error exposed the ES2023 target's lack of `String.isWellFormed` types; UTF-8 round-trip validation resolved it without changing the compiler target. `npm ci` passed, retaining the previously known 10 moderate dependency findings. `npm run verify` exited 0: formatting, compilation, typed lint, strict typechecks, and all 23 unit/HTTP tests passed. No database, Docker containment, or provider/live behavior changed or was claimed tested by this increment.
