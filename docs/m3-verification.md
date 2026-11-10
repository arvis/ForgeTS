# M3 verification — offline acceptance

Date: 2026-11-10. M3's offline verification/bounded repair is implemented and locally verified. Paid calls remain blocked and M2 live acceptance remains unperformed. The human explicitly requested local M2/M3 integration into `master` and reserved remote pushes to themselves. Work began on stacked `m3/verification`; no M4 implementation is authorized.

## M3a isolated checks

[ADR 0012](adr/0012-m3-verification-budgets.md) and [the check spec](../specs/internal/m3a-isolated-checks.md) define fixed command/data boundaries and budgets. Trusted preparation copied 7,780 regular dependency files (68,244,040 bytes) from the locked installation, plus fixed verification assets. No Dockerfile RUN instruction, install hook, generated target, host credentials or host mount enters preparation. Build network is disabled. Bootstrap rejects workspace/symbolic/junction/hard links and unsupported objects and checks cleanup scope before recursive deletion.

Observed local toolchain image: `sha256:461d48bc1611eb092c3602e7af43972eba5c8c2945287b6784f64a466b11c5e4`; content fingerprint: `623c6dea951aef443a70e0a02d04b0498e0f4d701fe1a4269eb60a9a61507810`. Its Node base is the approved M2 digest. Tool versions validated from the copied packages are TypeScript 5.9.3, ESLint 10.14.0, Prettier 3.9.10 and typescript-eslint 8.72.1. The local image ID/fingerprint can differ after an authorized rebuild; bootstrap metadata is ignored trusted operator configuration and runtime pins/validates the selected image. It is not supplied by specs or workers.

Three policy unit tests first failed against compiling placeholders, then passed. Real-tool integration tests were added after the initial adapter implementation; they are actual runtime evidence, not a retroactive claim of test-first coverage for every execution line. Two later test-first regressions demonstrated accepted source mutation and missing expected-image identity checks; both failed before fixes and then passed. Lint exposed nested-config root ambiguity, CommonJS asset imports and cleanup/control-regex issues; explicit config roots, ESM assets and clearer cleanup/sanitization resolved them without rule suppressions.

Actual workers observed uid 1000, 512 MiB memory, 64 PIDs, one CPU quota, only loopback networking, no provider key and no Docker socket. Real target format, lint, type and assertion failures produced nonzero captured results. Credential/network attempts, hung checks, output flooding and cancellation could not pass. A clean four-check round passed and was invalidated by a changed input digest; omitted required checks could not pass. Source mutation is now recorded and fails even if a generated test exits zero. Every check uses a fresh worker and immutable tool/test/config paths, with bounded sanitized streams and actual durations.

An early combined containment run timed out in the existing M2 PID-exhaustion probe while image preparation overlapped. The unchanged M2 suite passed a quiet rerun with its original resource/time limits. This does not establish a root cause or erase the failed observation. Final serial full-suite results are recorded in the build log after execution.

A later combined run captured an unavailable clean-lint result and correctly refused to pass the round. A focused lint invocation passed, and the final serial run passed `npm run verify` (46 unit/HTTP tests) and all 15 worker/check integration tests. Earlier PostgreSQL/API checks passed 13/13. Fixed sanitized error codes now distinguish uncaptured worker failures. These observations establish one tested local run, not a load/stability envelope; no failing result was relabeled as passing and no budget was increased to bypass failure.

## M3b durable repair

[ADR 0013](adr/0013-m3-durable-repair.md) and [the repair spec](../specs/internal/m3b-bounded-repair.md) record source/artifact binding, same-state transactional checkpoints, central transitions and a maximum of two repairs/three rounds. The initial six core tests, lifecycle contract test, PostgreSQL checkpoint test, CLI validation and CLI integration first failed against compiling missing behavior. Two later test-first regressions exposed loss of observed cancellation cleanup and duplicate check IDs corrupting a failure snapshot; both were fixed. Unit fixtures also reject stale, oversized, foreign-identity and scope-expanding repair data. Unit port fixtures are not described as actual tools.

Final commands and observed results:

- `npm ci`: succeeded; existing 10 moderate findings remain. No external dependency version changed.
- `npm run verify`: all format/build/typed-lint/strict-typecheck gates and 56 unit/HTTP tests passed. The expanded core fixture cases were compiled and rerun successfully afterward.
- `npm run test:integration -w @forgets/persistence`, then `npm run test:integration -w @forgets/api`: 14/14 passed, including event-write rollback, repair admission and restart without replay.
- `npm run test:containment -w @forgets/runner`: final fully serial suite passed 16/16. It includes actual tools, containment/ownership/cancellation, a repaired defect, a persistent defect, malformed repair, idempotent retry, database reload and contiguous event sequences.

Actual retained records were read from the disposable PostgreSQL instance after the successful suite:

| Record                                                                                   | Outcome                    | Repairs | Verification rounds/check results             |
| ---------------------------------------------------------------------------------------- | -------------------------- | ------- | --------------------------------------------- |
| [Repaired run](evidence/m3-repaired.json), `82953b4a-3ae6-40b9-96c0-5cd25016605b`        | `VERIFIED_AWAITING_REVIEW` | 1       | 2 rounds, 8 real results; final four all pass |
| [Persistent defect](evidence/m3-persistent.json), `f432182d-4343-4f5b-be15-6226548e21b7` | `FAILED`                   | 2       | 3 rounds, 12 real results; no further repair  |

The initial type defect was `message: 123` where a string is required. A fake repair proposed the corrected greeting, the broker actually applied it in Docker, and every check reran against the new digest. The repaired digest is `e265602c59868a1d80a82bf93627783de3032365882f58d62be20169615364f5`; the persistent broken digest is `991756edf2330c7472149f6350fefa41c438d565f0af984a1d074c71daa93a8a`. Test checks include fresh compilation; `commandsExecuted` distinguishes an assertion run from a compilation prerequisite failure. No skipped prerequisite is counted as passing. Check durations include worker lifecycle time, while `toolDurationMs` measures child execution when captured.

Original M2 inference/tool evidence stays intact, repairs have explicit fake provenance/null usage, and actual check results have source/workspace/attempt/toolchain identities. A repeated completed or interrupted command returns prior evidence without another repair. Unknown cleanup/persistence cannot yield eligibility. `VERIFIED_AWAITING_REVIEW` is a handoff to unimplemented M4 review/approval; `mergeReady` remains false in both records.

## Setup and remaining boundaries

After `npm ci` and a successful repository build, `npm run worker:prepare` creates the offline local tool image and `.workspaces/m3-toolchain.json`. Stop active factory work before rebuilding tools. The existing disposable database and Docker Desktop Linux amd64/cgroup-v2 prerequisites remain. Run the worker integration suite with the local test database password; production targets and paid providers are excluded.

Use `npm run factory:verify -- specs/examples/sandbox-greeting.md repair KEY` with the local test database and prepared tool image. Fixed scenarios are `clean`, `repair`, `persistent`, `malformed` and `provider-failure`; failed scenarios return exit code 1 with their record. Scenario-scoped keys prevent accidental reuse between demonstrations. The original HTTP submission remains mock-only, and no CLI switch enables paid inference, arbitrary commands or remote repositories.

Passing these sample checks proves only the recorded cases; it is not general correctness/security, human approval or merge readiness. Live provider/repair validation is unperformed and M2's currency/account/live gate remains open. Tool/dependency/kernel trust, transient timeout observations and redaction limits remain as documented. The authorized Git merges concern ForgeTS development code, not applying generated sample artifacts or bypassing ForgeTS's future approval gate. Stop before M4.

Development token usage: **unavailable**. Remaining Codex account allowance: **unavailable (%)**. No account quota API is exposed. No native/paid runtime provider request has been made; retained fixture repair usage is null and is separate from Codex consumption.
