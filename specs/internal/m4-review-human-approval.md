# M4: Advisory review, evidence export, and human approval

Status: draft for human review, 2026-11-10. No implementation authorized. Prerequisites: reviewed M3 actual verification/repair evidence and explicit M4 authorization. [The M1 mock workflow](m1-contracts-orchestration.md) must remain clearly distinct from verified real runs.

## Goal

Present an inspectable diff, real check results, risks, and a structured advisory reviewer report. Stop at `AWAITING_HUMAN_APPROVAL`. An authorized human can approve or reject exactly the reviewed artifact; a model recommendation cannot grant approval or compensate for failed checks.

## Boundaries and decisions

- Add a schema-validated reviewer role describing concerns, cited evidence, recommendation, and residual uncertainty. Version its template and record provenance. Reviewer input/output is untrusted; it cannot call approval, execution, publishing, or permission-management capabilities.
- Define eligibility from current required deterministic results, immutable target/base/diff/artifact hashes, budgets, and complete evidence. Mock/simulated runs, failed/missing/skipped/stale checks, cancelled/failed runs, unavailable evidence, or unresolved execution-policy violations are ineligible for real approval. A positive reviewer opinion does not change eligibility.
- Add approval/rejection contracts, `APPROVED`/`REJECTED` states, and an auditable decision tied to run/version/artifact digest, operator action, timestamp, and rationale. Keep state/event/decision writes atomic with optimistic concurrency. Preserve historical M1 awaiting-review reports without upgrading their provenance.
- Select the trusted human-facing approval mechanism in an ADR before enabling it. Keep the approval capability outside model/worker tool inventories. A local confirmation or operator label alone is not strong identity attestation; document its actual trust assumptions. If an HTTP action is exposed, define action authorization, cross-origin/CSRF protection, replay prevention, and confirmation of the exact artifact. Do not claim loopback alone proves a human acted.
- Generate bounded machine-readable and human-readable reports plus an actual diff. Export only scoped run artifacts with safe filenames and explicit destination semantics; no arbitrary server-side filesystem path, credential/raw-environment dump, overwrite of unrelated files, or network upload. Treat embedded Markdown/diagnostics as data and escape active content.
- Approval records intent for this artifact; it does not push, merge, deploy, or create a PR. Any later external write requires separate authorization and a recheck that the approved artifact/base remains current.

## Implementation sequence and acceptance criteria

Write negative eligibility/decision/export tests first, then implement the policy, persistence, reviewer adapter, CLI/API review actions, and reports.

| ID   | Required evidence                                                                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M4-1 | An approving reviewer cannot override failed/missing/stale verification, mock provenance, cancellation, containment failure, or changed artifact digests. Each denied decision leaves state/decision history consistent.                           |
| M4-2 | Malformed/oversized/injected reviewer output is rejected or reported as unavailable within budgets. No role, repository instruction, or tool result gains the approval capability. Uncertainty remains visible.                                    |
| M4-3 | Missing/invalid action authorization, wrong version/digest, replayed/conflicting decisions, cross-origin actions, and simultaneous approve/reject requests cannot produce an unreviewed approval or multiple contradictory decisions.              |
| M4-4 | A deliberate human action can approve or reject an eligible run; persisted evidence identifies the exact reviewed artifact and the actual strength/limits of operator attribution. A later patch/base change requires new verification and review. |
| M4-5 | Fault-injected decision persistence rolls back state/event/decision together. Reload reproduces reports/decisions, while unknown or ineligible runs cannot be silently approved.                                                                   |
| M4-6 | Export traversal/symlink/overwrite attempts and active-content/secret-canary fixtures fail safely or are escaped/redacted as specified. Reports distinguish actual checks from simulated/advisory claims. No external write occurs.                |

## Verification and review gate

Run domain/contract tests, real database transaction/reload tests, CLI/API action tests, and export safety fixtures. Demonstrate a failed run blocked despite positive review, an actual verified run stopping for review, a human decision on the displayed digest, and rejection of a subsequently changed digest. Use fake reviewer responses first; any live review remains separately authorized and budgeted.

Retain report/diff examples, check evidence, decision events, negative-test results, and trust limitations. Stop for human review before M5. Dashboard and GitHub integration remain optional M6; stronger multi-user authentication and production deployment remain outside this scope.
