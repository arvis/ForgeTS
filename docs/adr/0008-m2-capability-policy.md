# ADR 0008: Bounded source replacements before runtime integration

- Date: 2026-11-10
- Status: adopted for the first M2 implementation increment

Start M2 with a pure policy in the agents package, next to its future trusted broker caller. This minimizes dependency/build changes; a Docker process adapter belongs in the runner package when its runtime is approved. The policy handles bounded JSON source snapshots and exact-preimage full-file replacements. It has no filesystem or subprocess imports. It cannot enforce containment and is not presented as a sandbox.

Accept only existing portable lowercase `src/**/*.ts` paths, no aliases or prefix collisions, and eight files maximum. Reject additional fields and unsupported operations. The restricted initial capability intentionally cannot change dependencies, create files, remove files, or grant commands/mounts. Deterministic source/snapshot hashes bind changes to content; validation copies records and completes before replacements are returned. These limits deliberately narrow the tiny sample workflow rather than support arbitrary repositories.

No host snapshot traversal is implemented. Future approved fixture ingestion must transfer regular-file bytes into a disposable worker without exposing host directories or keys. Host symlink/junction checks and containment require separate runtime evidence; a valid relative path alone does not prevent filesystem races. Worker materialization must use controlled fresh directories and exclusive/no-follow operations, with no concurrently executing generated code in M2.

The human authorized sequential milestone implementation and requested token reporting. Development-session usage and remaining account quota are not exposed through this session's tools. Record their absence in the build log and milestone report; do not equate runtime provider usage with Codex account consumption. No custom monitoring/router is introduced. Paid live tests and image acquisition remain pending the specific question sent to the human.

The previous branching-policy commit remains separately reviewable on `docs/branching-workflow`. This implementation branch starts from the current local `master`, as instructed, without merging or rewriting either branch; remote freshness remains unverified.

References: [increment spec](../../specs/internal/m2-capability-policy.md), [M2 acceptance](../../specs/internal/m2-real-agent-sandbox.md).
