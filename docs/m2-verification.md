# M2 verification — in progress

Date: 2026-11-10. M2 is incomplete. This record separates a verified standalone worker from the pending provider/orchestration/persistence integration. No live provider call is authorized or performed; fake tests cannot satisfy the live-run criterion.

## Disposable worker increment

- Spec: [worker](../specs/internal/m2-docker-worker.md); design: [ADR 0009](adr/0009-m2-docker-worker.md).
- Engine: Docker Desktop 4.68.0, Docker 29.3.1, local Windows named pipe, Linux amd64/cgroup v2, default seccomp. Actual worker reported Node `v24.11.0` and kernel `6.6.87.2-microsoft-standard-WSL2`.
- Pulled the approved official Node 24.11.0 Bookworm slim image and observed matching registry/local index digest `sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152`. Runtime image acquisition is disabled.
- Initial tests: 3/3 unit tests and 6/6 containment checks failed against successfully compiled missing-behavior placeholders. These initial failures were not containment results.
- `npm ci`: passed; existing 10 moderate dependency findings remain.
- `npm run verify`: passed formatting, build, typed lint/promise controls, strict typechecks and 26 unit/HTTP tests. An initial `no-unsafe-finally` lint failure was corrected by extracting cleanup handling; no rule was disabled.
- `npm run build -w @forgets/runner` followed by `npm run test:containment -w @forgets/runner`: passed 6/6 checks. Actual workers observed uid 1000, no credential-canary variable or Docker socket, read-only root, only loopback interface, memory limit 134217728, PID limit 32, CPU quota 50000/100000, and tmpfs ENOSPC beyond 16 MiB. A controlled Windows-loopback HTTP service was reachable from the positive-control container but denied from the restricted worker. PID exhaustion returned EAGAIN; memory exhaustion stopped the worker. Output overflow, timeout and cancellation removed containers and descendants; no labeled containers remained. Real file replacement returned the expected hashes/content and left the disposable host canary and source input unchanged.
- `FORGETS_DB_PASSWORD=forgets_test_dev_only npm run test:integration` (PowerShell environment assignment): passed all 12 existing disposable PostgreSQL/API integration checks. These are regression checks, not evidence of M2 database integration.
- A separate trusted worker probe confirmed runtime/kernel versions and cleanup. Its first host invocation had a PowerShell quoting error before worker execution; a stdin script corrected the invocation. No failed invocation is counted as containment evidence.

## Remaining milestone work and limits

Provider/role contracts and fake-provider tests, additive live provenance/artifact persistence, one-owner/one-run lifecycle integration, sample application/CLI handoff, crash-orphan recovery and the full M2 acceptance suite remain pending. The public API/CLI still accept mock mode only. No real generated-code verification/repair or approval capability has been added. Lower-level containment tests execute trusted adversarial probes, not model-supplied commands.

The worker relies on the trusted Docker Desktop VM/daemon/kernel. The host control process retains Docker privileges. Cleanup during daemon failure can be unprovable and blocks further operations; restart recovery is not yet integrated. There is no claim of protection against kernel escapes, malicious administrators, or arbitrary production deployment.

Development token count: **unavailable**. Remaining Codex account allowance: **unavailable (%)**. No account quota API is exposed to this session. Runtime provider usage: **no invocation performed** for these increments. No invented count, percentage, cost or savings is reported.
