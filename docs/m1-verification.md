# M1 verification and review record

Dates: implementation and baseline on 2026-11-09; final resumed verification on 2026-11-10. The human authorized implementation after reading the specs. Evidence is local Windows/Node 24.11.0/npm 11.6.1; hosted Linux CI remains unobserved. M2 implementation is not authorized.

## Test-first development evidence

- M1a: compiled contract/policy stubs failed all 6 new tests; the implemented contracts passed 6/6.
- M1b: the compiled PostgreSQL test failed at the unimplemented explicit migration. After implementation, 9 real PostgreSQL tests passed, including an event-write fault proving transactional rollback and competing admission/transition checks.
- M1c: 7 new orchestration tests failed against typed stubs before implementation; all 8 core tests then passed. The mock-role test likewise failed before the fixture implementation and passed afterward. Typed lint fixtures prove both unsafe promise patterns are rejected and handled equivalents pass.
- M1d: HTTP and CLI boundary tests failed against unimplemented adapters before their implementation. HTTP coverage uses a raw request for forged Host headers because a local diagnostic proved Node fetch replaces that header. Restart tests disable connection reuse to avoid asserting application behavior through stale sockets. The configuration override regression first failed on a missing rejection, then passed after the strict override guard was added.

## Acceptance matrix

| Criteria | Evidence                                                                                                                                                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1–AC2  | Contract tests reject malformed/missing/oversized specs and policy/live overrides. Core tests reject malformed/wrong-stage/oversized mock output. Malicious instructions remain inert; no executor/provider exists. This is not sandbox containment evidence.                      |
| AC3      | Real PostgreSQL tests inject failure after state update but before event insertion and verify rollback; competing versioned transitions have one winner, illegal transitions change nothing, and ordered events survive reload.                                                    |
| AC4      | Real PostgreSQL tests cover duplicate/conflicting/busy admission and interruption recovery. Core tests cover budgets/hung mocks; HTTP/PostgreSQL tests persist cancellation and deadline failures. Awaiting-review reports survive API restart.                                    |
| AC5      | Contracts reject remote/public/ambient/unsupported configuration and demo-as-test targets. API traps verify invalid requests do not reach persistence and error responses omit the seeded password. Explicit migrations respect owner locking; no test resets or drops a database. |
| AC6      | Actual NestJS+PostgreSQL+CLI run/inspect demonstration, duplicate/conflict responses, ordered transitions, and durable report reload. Outputs are simulated and reports remain `mergeReady: false`; no approval endpoint exists.                                                   |
| AC7      | Root verification and an independent clean export passed locked installation, formatting, typed lint/fixtures, builds, strict typechecks, 18 unit/HTTP tests, and 12 real PostgreSQL/end-to-end checks, with no skips. Audit is separately reported below.                         |
| AC8      | README documents local setup, limits, recovery, endpoint/credential constraints, simulation, and residual risk. Threat model distinguishes implemented checks from future containment.                                                                                             |
| AC9      | Migration primary/unique/history/admission indexes, real timestamp-tie pagination tests, bounded API queries, and captured read-only query plans. Additional indexes are chosen from implemented query patterns.                                                                   |
| AC10     | Actual native-fetch baseline: 10 warm-up + 190 measured requests, at most 5 clients, dedicated tmpfs test database and deterministic mocks. Raw evidence and limitations below.                                                                                                    |

## Recorded local baseline

The complete [raw JSON result](evidence/m1-baseline.json) is retained. Measurement started at `2026-11-09T19:03:26.639Z` and lasted approximately 419 ms, a very short sample. This is an initial functional/performance baseline, not a stress/soak campaign or production operating envelope. No latency SLO is claimed.

- 190 measured responses: 162 reads, 4 accepted submissions, 11 idempotent submissions, 8 expected busy responses, and 5 expected validation rejections. Zero unexpected errors were observed.
- Overall p50 was about 9.97 ms and p95 about 19.66 ms. Approximately 454 HTTP requests/second includes reads and expected rejections; it is not successful factory-run throughput.
- Three new simulated runs had completed by the measurement endpoint (about 7.17 per second over this short interval). Four accepted runs were drained and checked afterward; each had seven ordered events. Actual agent work remains fixture simulation.
- Windows, 16 logical CPUs (Ryzen 7 7840HS), roughly 31.2 GiB host RAM, PostgreSQL 17.11 in Docker Desktop. Client and API share a process, so recorded process CPU/RSS are combined; database CPU/memory was not measured.
- The deterministic seed adds 32 awaiting-review mock runs. At measurement setup the disposable database held 38 awaiting-review, 17 failed, and 1 cancelled run, including earlier integration fixtures. This synthetic distribution is explicitly not a production workload.
- Read-only `EXPLAIN (ANALYZE, BUFFERS)` plans for history, state-filtered history, and events are in the raw JSON. Small-fixture sequential scans may be appropriate; index presence does not imply every query should force an index scan. Indexes add write/storage cost.

## Dependencies and remaining limits

The latest explicit `npm audit --json` check exited 1 with 10 moderate development findings in the existing minimatch/linter chain, zero high/critical. An intermediate install printed zero findings; the explicit audit is the recorded evidence, and no security-clean claim follows from that transient install summary. No incompatible override or forced downgrade was applied.

M1 has no sandbox, real provider, generated code editing/execution, actual generated-feature verification/repair, multi-user authentication, or enforced human approval. Host installation/build/test tooling runs with developer permissions. PostgreSQL loopback checks cannot prove the endpoint is not forwarded to production. See [the threat model](threat-model.md).

## Final check status

On 2026-11-10 `npm run verify` exited 0 in the repository. The independent 71-file export at `C:\Users\viest\AppData\Local\Temp\forgets-m1-b55e3fd806dc48849d04156076dd92f5` installed 223 packages with `npm ci` (exit 0), passed `npm run verify` (exit 0; 18 unit/HTTP tests), then passed the persistence and API integration commands (9 and 3 checks, exit 0; no skips). The export had no copied dependencies or build output. Integration tested the actual dedicated PostgreSQL service; mock agent work remained simulated.

`npm run db:config`, unstaged whitespace inspection, and all 59 local Markdown links passed before final status edits. Final documentation formatting and staged scope/whitespace are inspected before committing M1d. Performance was actually measured on 2026-11-09; it was not rerun or relabelled as a new measurement after resumption. Temporary verification exports are retained outside the repository. M1 is complete for human review; open audit findings and unobserved hosted CI remain explicit limits.
