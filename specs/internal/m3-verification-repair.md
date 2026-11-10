# M3: Actual verification and bounded repair

Status: implementation explicitly authorized by the human on 2026-11-10 after the M2 evidence handoff. [M3a](m3a-isolated-checks.md) adds real isolated checks; durable repair integration follows. M2's paid/live test stays unverified; no live success is implied by this authorization. See [M2](m2-real-agent-sandbox.md) and [the charter](../../docs/PLAN.md). Stop for review before M4.

## Goal

Run real deterministic format/lint, typecheck, and tests against the generated target within the accepted isolation boundary. Persist actual outcomes and attempt bounded repairs. A broken change is either repaired with fresh checks or ends in `FAILED` with evidence. Success still awaits M4's human approval gate.

## Design and implementation sequence

1. Define a trusted check registry for the approved sample target, with fixed command identifiers, executable/arguments, environment, working directory, prerequisites, and per-check/run budgets. Validate requests against this registry; no model-generated shell command is executed. Even an allowlisted test/install command runs potentially hostile code and stays isolated.
2. Define verification result contracts for command/check identity, attempt, input/workspace digest, exit code/signal, timeout/cancellation/truncation flags, separate bounded stdout/stderr, actual duration, artifacts, and outcome. A missing, skipped, timed-out, or uncaptured required check cannot pass. Redact persisted diagnostics; mark truncation rather than silently dropping evidence.
3. Add real check execution, process-tree termination, deterministic check ordering, and cancellation with recorded cleanup. Freeze verification dependencies/network policy from M2 and keep provider keys/production credentials outside workers. A failed containment preflight blocks verification rather than falling back to the host.
4. Add `REPAIRING` and a persisted attempt counter with centrally validated transitions: failed `VERIFYING` may go to `REPAIRING`, then `IMPLEMENTING`, then fresh `VERIFYING`; all accepted success paths continue to review. Allow at most two repair attempts after the initial implementation: at most three full verification rounds. Invalid repair responses and failed repair invocations consume the defined attempt/request budgets rather than creating free retries.
5. Supply the repair role only the bounded spec/plan, diff, relevant diagnostics, and capability scope. Validate and apply its patch through the existing broker. Recompute workspace/artifact identity and rerun every required gate after each accepted repair; do not reuse a previous digest's passing result as current evidence.
6. Persist attempts/events atomically, including failure to persist an outcome. On ownership loss, deadline, cancellation, or crash, stop descendants and record interruption when possible. Resume semantics must avoid executing the same repair twice; default to explicit failure rather than automatic replay of uncertain work.

Choose exact check/run budgets and any provider retry policy in a reviewed implementation ADR before writing execution code. The two-repair ceiling and isolation requirements are fixed by this spec; lower limits may be selected explicitly. Preserve M1/M2 records and label simulated outcomes distinctly.

## Unhappy-path-first acceptance criteria

| ID   | Required actual evidence                                                                                                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M3-1 | Deliberately invalid TypeScript, a failing unit test, and lint/format failures are detected by actual target tools in the worker, with truthful nonzero outcomes and bounded diagnostics. Fixture provider success cannot override these failures.             |
| M3-2 | Unknown checks/arguments/working directories, path escape, prompt-injected commands, dependency hooks requesting network/credentials, and missing required checks cannot bypass policy or yield a passing verification.                                        |
| M3-3 | Hung child processes, output flooding, check timeout, cancellation, and exhausted resource budgets terminate within the declared runtime bounds; no descendants remain active. Record which evidence was truncated or unavailable.                             |
| M3-4 | A deterministic repair fixture fixes a known defect and a fresh real verification round passes. A persistent defect consumes no more than two repair attempts, ends in `FAILED`, and never loops or reaches approval eligibility.                              |
| M3-5 | Malformed/oversized repair output, attempted scope expansion, provider failure, and repeated verification failure count against the agreed budgets. Attempts and ordered events survive reload; injected persistence failure does not invent a durable result. |
| M3-6 | A patch/digest change invalidates prior passing results. Restart/ownership/cancellation tests demonstrate no duplicate repair or escaped worker execution. Existing mock workflows remain usable and honest.                                                   |

## Verification and handoff

Run the repository gates and a reproducible offline suite using deterministic provider responses plus real sandboxed target tools. Record tool/image versions, initial expected failures, every verification/repair round, exit results, duration, cleanup, and final diff/digests. Live-model repairs remain separately opt-in with explicit spending limits; no paid benchmark is required for the deterministic repair proof.

Stop for review before M4. This milestone does not authorize merge, publishing, production access, approval by a model, multiple workers, or a dashboard. Passing checks provide specific evidence, not a general correctness/security guarantee.
