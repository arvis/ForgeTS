# M2: Real provider and sandboxed implementation

Status: draft for human review, 2026-11-10. No M2 implementation or paid call is authorized. Prerequisites: review [M1 evidence](../../docs/m1-verification.md), authorize M2, and approve the implementation ADRs/open decisions below.

## Goal and result

Add one real provider behind a typed interface and an isolated file-edit workflow for a tiny local sample application. An explicitly authorized live run can produce an inspectable code diff entirely within its disposable workspace. It does not establish successful real verification, repair, human approval, or merge readiness; those belong to M3/M4.

Retain the deterministic mock workflow without credentials. Schema-valid model output is untrusted data and never grants capabilities. M1 fixtures cannot be relabelled as real results. See [the charter](../../docs/PLAN.md), [threat model](../../docs/threat-model.md), and [handoff ADR](../../docs/adr/0005-milestone-handoffs.md).

## Design and decisions before implementation

- Select one provider/model, SDK/version, request schema, cancellation behavior, and bounded invocation/output/token/cost policy in an ADR. The human supplies credentials and separately authorizes paid tests; do not infer access or credit approval from this draft.
- Define a typed provider port used by role prompts with versioned templates and schema-validated responses. Keys stay in the trusted control process, outside workers and persisted artifacts. Unknown/malformed/truncated responses fail closed within documented request budgets. Retries cannot bypass budgets.
- Select and document a supported isolation runtime/OS, pinned worker image, privilege/capability policy, CPU/memory/PID/time/output/disk limits, workspace lifecycle, and residual gaps. A Git worktree or ordinary host subprocess cannot satisfy the boundary. Unsupported isolation fails startup; never fall back to host execution.
- Define capabilities such as bounded file listing/read and validated patch application with scoped arguments. Use a trusted broker to enforce policy independently of prompts/model output. No unrestricted shell, host path, network URL, privileged container, or worker Docker socket capability exists.
- Copy an explicitly approved local sample target into a unique disposable workspace. Add the minimal sample NestJS application and its initial locked fixtures as trusted development assets. Do not fetch or clone external repositories without separate authorization. Never mount personal directories or host credentials. Generated dependency hooks/builds/tests are potentially hostile and must remain inside the execution boundary.
- Workers have network disabled by default and non-root execution with a read-only base where feasible. If dependency acquisition is required, specify a separate restricted preparation phase and immutable/offline verification inputs. No provider key or production credential enters either worker phase.
- Validate normalized paths and reject absolute/drive/UNC paths, traversal, symlinks/junction escapes, oversized patches, unsupported operations, and races between path checking and writing. Use brokered operations designed for the selected platform, not string-prefix checks alone.
- Extend M1 contracts/persistence additively for mode/provenance, target/base digest, capability requests/results, invocation/template identifiers, diff/artifact hashes, and measured usage when reported. Preserve existing mock runs/events/reports and the one-run admission/ownership policy. Plan and implementation outputs must be attributable to a specific run and workspace.

## Implementation sequence and acceptance criteria

Write failing negative fixtures before the capability/provider behavior, then implement the smallest safe path and record actual green checks.

| ID   | Evidence required to complete M2                                                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M2-1 | Traversal, absolute/UNC/drive paths, symlink/junction escapes, oversized patches, arbitrary commands, forbidden mounts, and attempts to change capabilities are denied and recorded without modifying disposable host canaries. No personal/production data is used in adversarial tests.                          |
| M2-2 | Actual runtime tests prove worker network denial against controlled test services, credential-canary absence, non-root/restricted configuration, and enforced resource/output/time limits. Descendant processes terminate and disposable workspace cleanup is verified. Any failed boundary blocks real execution. |
| M2-3 | Missing credentials, unknown provider/mode, invalid JSON/schema, truncation, provider timeout/cancellation, and request-budget exhaustion terminate clearly without raw secrets or unbounded retries. Mock operation still needs no key. Tests use a fake provider before any separately authorized live request.  |
| M2-4 | Model/spec/repository instructions cannot enable a broker capability, change endpoints/budgets, expose keys, or write outside the run workspace. Concurrency remains one run; loss of ownership stops worker actions rather than allowing a second owner to overlap.                                               |
| M2-5 | An authorized live planner/implementer run produces a bounded schema-valid plan and actual patch in isolation. The approved source snapshot remains unchanged; artifact hashes/diff and actual tool outcomes are inspectable and persisted. No mocked verification result is presented as an actual check.         |
| M2-6 | M1 mock records remain readable after migrations, failure/cancellation retains honest evidence, abandoned workspaces are handled safely after restart, and no report claims `mergeReady: true` or approval.                                                                                                        |

## Verification and review

Run formatting, typed lint, strict compilation, unit/contract tests, real database migration/integration tests, and the actual containment suite on the documented OS/runtime. Record commands, initial expected failures, outcomes, runtime/image versions, canary results, cleanup, invocation budgets, and remaining uncertainty. Report token/cost data only if actually supplied by the provider. An unperformed live test remains unverified; it cannot be counted as the charter's live-run completion criterion without an explicit human scope exception.

Stop with the diff and evidence for human review before M3. Real deterministic generated-code verification/repair, final approval, dashboard, publishing, production access, and multi-worker scaling remain outside this milestone.
