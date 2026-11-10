# M3 verification — in progress

Date: 2026-11-10. The human explicitly authorized M3 after the M2 handoff, while paid calls remain blocked and M2 live acceptance remains unperformed. Work uses stacked local `m3/verification` from unmerged M2; no merge, push or M4 implementation is authorized.

## M3a isolated checks

[ADR 0012](adr/0012-m3-verification-budgets.md) and [the check spec](../specs/internal/m3a-isolated-checks.md) define fixed command/data boundaries and budgets. Trusted preparation copied 7,780 regular dependency files (68,244,040 bytes) from the locked installation, plus fixed verification assets. No Dockerfile RUN instruction, install hook, generated target, host credentials or host mount enters preparation. Build network is disabled. Bootstrap rejects workspace/symbolic/junction/hard links and unsupported objects and checks cleanup scope before recursive deletion.

Observed local toolchain image: `sha256:461d48bc1611eb092c3602e7af43972eba5c8c2945287b6784f64a466b11c5e4`; content fingerprint: `623c6dea951aef443a70e0a02d04b0498e0f4d701fe1a4269eb60a9a61507810`. Its Node base is the approved M2 digest. Tool versions validated from the copied packages are TypeScript 5.9.3, ESLint 10.14.0, Prettier 3.9.10 and typescript-eslint 8.72.1. The local image ID/fingerprint can differ after an authorized rebuild; bootstrap metadata is ignored trusted operator configuration and runtime pins/validates the selected image. It is not supplied by specs or workers.

Three policy unit tests first failed against compiling placeholders, then passed. Real-tool integration tests were added after the initial adapter implementation; they are actual runtime evidence, not a retroactive claim of test-first coverage for every execution line. Two later test-first regressions demonstrated accepted source mutation and missing expected-image identity checks; both failed before fixes and then passed. Lint exposed nested-config root ambiguity, CommonJS asset imports and cleanup/control-regex issues; explicit config roots, ESM assets and clearer cleanup/sanitization resolved them without rule suppressions.

Actual workers observed uid 1000, 512 MiB memory, 64 PIDs, one CPU quota, only loopback networking, no provider key and no Docker socket. Real target format, lint, type and assertion failures produced nonzero captured results. Credential/network attempts, hung checks, output flooding and cancellation could not pass. A clean four-check round passed and was invalidated by a changed input digest; omitted required checks could not pass. Source mutation is now recorded and fails even if a generated test exits zero. Every check uses a fresh worker and immutable tool/test/config paths, with bounded sanitized streams and actual durations.

An early combined containment run timed out in the existing M2 PID-exhaustion probe while image preparation overlapped. The unchanged M2 suite passed a quiet rerun with its original resource/time limits. This does not establish a root cause or erase the failed observation. Final serial full-suite results are recorded in the build log after execution.

A later combined run captured an unavailable clean-lint result and correctly refused to pass the round. A focused lint invocation passed, and the final serial run passed `npm run verify` (46 unit/HTTP tests) and all 15 worker/check integration tests. Earlier PostgreSQL/API checks passed 13/13. Fixed sanitized error codes now distinguish uncaptured worker failures. These observations establish one tested local run, not a load/stability envelope; no failing result was relabeled as passing and no budget was increased to bypass failure.

## Setup and remaining work

After `npm ci` and a successful repository build, `npm run worker:prepare` creates the offline local tool image and `.workspaces/m3-toolchain.json`. Stop active factory work before rebuilding tools. The existing disposable database and Docker Desktop Linux amd64/cgroup-v2 prerequisites remain. Run the worker integration suite with the local test database password; production targets and paid providers are excluded.

Durable verification rounds, the two-repair loop, ordered repair events, restart/interruption behavior and the final reviewed milestone handoff are not implemented by M3a alone. Passing these sample checks proves only the recorded cases; it is not general correctness/security, human approval or merge readiness. Tool/dependency/kernel trust and redaction limits remain as documented in the ADR.

Development token usage: **unavailable**. Remaining Codex account allowance: **unavailable (%)**. No account quota API is exposed. No native/paid runtime provider request has been made; future fixture repair usage must remain explicitly separate from Codex consumption.
