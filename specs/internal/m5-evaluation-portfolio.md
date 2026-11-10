# M5: Reproducible evaluations and honest portfolio evidence

Status: draft for human review, 2026-11-10. No implementation authorized. Prerequisites: accepted M4 policy/evidence and explicit M5 authorization. See [the charter](../../docs/PLAN.md) and [human input](../../docs/human-input.md).

## Goal

Give a reader a reproducible, unpaid, offline-by-default demonstration of the factory's actual guarantees and limits. Add at least five positive/negative evaluation fixtures, with deterministic provider responses and real isolated execution where a fixture claims actual code/tool behavior. Show how human direction, specs, failing tests, agent implementation, verification, and review shaped the project.

## Evaluation design

- Each fixture declares input/target snapshot, deterministic agent responses, expected states/attempts/capability decisions, required check evidence, resource/time limits, and cleanup expectations before execution. Store a versioned manifest and compare actual outcomes to declared expectations.
- Include at least one valid feature completion and negative cases for malformed output, invalid path/command requests, a real generated type/test failure, and persistent repair failure. Cover prompt injection and advisory-review conflict with failed verification as additional fixtures or clearly exercised variants. The suite must meet the charter's minimum five cases without counting duplicate runs as distinct scenarios.
- Keep M1 simulation separate from deterministic-provider scenarios that execute real tools in the M2/M3 sandbox. Never label a canned verifier response as proof that TypeScript/tests/security checks ran.
- Offline evaluation assumes the documented dependencies/images have already been provisioned. Initial package/image installation may require network access; evaluation workers still obey their isolated network policy and need no provider keys.
- Report actual pass/fail counts and denominators, invalid-output/capability-denial outcomes, retry/termination behavior, elapsed times, and artifacts. Missing/blocked fixture evidence cannot count as a pass. Token/cost fields are unavailable unless actually reported; do not substitute invented zeros or estimates presented as measurements.
- Provide an opt-in live-evaluation path only after separate provider/credit authorization and explicit budgets. Model/provider comparisons must disclose sample sizes, prompt/template versions, workload differences, and uncertainty; deterministic fixtures establish workflow behavior, not general model quality.
- Run fast unit/contracts checks in CI and a documented supported sandbox/database suite with restricted CI permissions and disposable canaries. Do not expose production credentials or secrets to untrusted pull-request execution. Keep paid evaluations out of default CI.
- Package the demo: clean setup, an example feature spec, CLI/API walkthrough, architecture/sequence diagram, representative reports/diff, recorded failure and repair/rejection, evaluation results, and clear limitations. Terminal captures/screenshots must come from observed runs. Include the origin story and independent-project status.
- Preserve the human-input record and build log with links to actual decisions/commits. Retain evidence of unsuccessful outcomes and unresolved risks; do not rewrite historical failures into retrospective successes.
- Reuse the small bounded baseline methodology for an optional reproducible performance appendix and query-plan discussion. Separate fixture correctness from throughput; larger stress/spike/soak work remains M7.

## Test-first acceptance criteria

| ID   | Evidence required to complete M5                                                                                                                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M5-1 | Broken expected-outcome manifests, missing evidence, budget overruns, and failing fixtures make the harness/report fail rather than inflating the pass rate. Test the evaluator before trusting its summaries.                                                             |
| M5-2 | At least five distinct declared positive/negative scenarios run reproducibly without keys/paid calls, and required real-tool scenarios have actual sandbox/check records. Record any OS/runtime-dependent limitations.                                                     |
| M5-3 | Persistent failure stops within the repair ceiling; prohibited operations remain denied; injected instructions cannot alter permissions; reviewer approval cannot bypass deterministic failure. All outcomes retain traceable events/diffs.                                |
| M5-4 | A clean checkout follows documented commands to install, migrate its dedicated development/test resources, and run the offline demo/evaluations. Runtime cleanup avoids unrelated data. CI commands match documented gates; hosted results are claimed only when observed. |
| M5-5 | Recruiter documentation links human input, specs/ADRs, changes, red/green evidence, human review status, actual evaluations, and limitations. No fabricated screenshots, benchmark claims, production history, or security guarantee appears.                              |

## Verification and handoff

Run the repository gates, evaluator negative/positive tests, full offline scenario suite, clean-checkout walkthrough, report/link checks, and actual CI where available. Commit fixture manifests, reproducible commands, sanitized raw summaries, and the portfolio walkthrough. An unavailable runtime/live test is explicitly unverified.

Stop for human review when the CLI/API MVP can be assessed end to end. Optional M6 UI/GitHub integration and M7 scaling remain separately authorized work; neither is required to claim the documented single-run MVP behavior.
