# Optional M6: Dashboard and authorized GitHub preparation

Status: draft for human review, 2026-11-10. No implementation, external repository access, push, or GitHub write authorized. Prerequisites: accepted M5 evidence and explicit authorization for the chosen M6 slice; every external write also requires concrete repository/action authorization.

## Goal and open decisions

Add a useful local dashboard over the existing backend and optionally prepare a GitHub pull request after verified human approval. The backend remains authoritative for permissions, state transitions, artifact identity, budgets, and approval eligibility. UI, PR integration, and provider comparisons can be separately scoped; do not implement all optional work by default.

The charter proposes React. The suggested location is `apps/web/`; Tailwind CSS with selected shadcn/ui components is an agent recommendation that the human has not selected. Choose the browser framework/build setup, CSS/components, accessibility approach, API transport, refresh strategy, and approval authorization in a reviewed ADR before installing frontend dependencies. Pin and verify the versions selected then; this draft chooses no current release numbers.

## Dashboard architecture and behavior

- Show bounded run history with state filters/pagination, run details, ordered events, diff and verification/repair evidence, advisory review, provenance, limits/errors, and human decision status. Clearly distinguish mock, unverified, failed, awaiting-review, approved, and rejected runs. Do not display simulated checks as real passes.
- Publish a browser-safe contracts/types entry point separated from current Node-only Markdown/configuration helpers. The browser must not import PostgreSQL, worker/provider clients, host filesystem APIs, server environment variables, or secret-bearing configuration. Keep all data access/actions through the API.
- Add explicit local UI origin/proxy policy and action protection consistent with M4. M1's same-origin Host/Origin rules must not be broadly disabled to make development convenient. The dashboard does not make the unauthenticated development backend suitable for public hosting.
- Use accessible semantics, keyboard operation/focus, labelled controls, readable status indicators, responsive layouts, and appropriate loading/empty/error states. Render untrusted spec text, filenames, Markdown, diff, and diagnostics as escaped/sanitized content; do not execute or automatically fetch embedded content.
- Request cancellation and M4-approved human decisions through existing use cases with the displayed run/version/digest. Keep a deliberate confirmation step for eligible decisions; stale versions trigger re-review. Hiding/disabling a button does not enforce authorization, and editing the DOM/client cannot bypass server checks.
- Use bounded polling or an explicitly designed event stream, with ordered/deduplicated events, cancellation/cleanup on navigation, and backoff after failures. No fake progress or infinite refresh loop. Preserve backend pagination and single-run limits.

## Optional GitHub integration

- Start with a local reviewable PR proposal containing repository/base/branch, approved patch/artifact digest, title/body, check evidence, risks, and intended write actions. Treat repository content and model-proposed text as untrusted input.
- After explicit human authorization of the concrete target/actions, use a trusted publisher capability with minimum necessary repository permissions. Keep GitHub credentials outside provider roles and execution workers. Do not infer push/PR permission from a model recommendation, a prior run approval, or this roadmap draft.
- Revalidate artifact/base identity and M4 eligibility before any write. If the remote base changed, the patch is stale, authorization is missing, or an existing equivalent PR exists, fail/review/idempotently return the prior result as appropriate; never duplicate writes or silently change the approved content.
- Record actual external action identifiers/outcomes and permission limits. Handle partial failure explicitly so retries cannot create multiple branches/PRs. No auto-merge, deployment, production execution, or notification messages are authorized.
- Optional additional providers/comparisons require a separately reviewed slice, explicit live-call budgets, and M5's honest measurement/provenance rules. Keep the deterministic mock demo available.

## Unhappy-path-first acceptance criteria

| ID   | Evidence required for the authorized slice                                                                                                                                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M6-1 | UI tests exercise failed/stale/unauthorized approval, pending/cancelled runs, missing reports, API errors, empty/paginated history, duplicate/out-of-order events, and mock-vs-real labels. Direct API requests remain guarded even when UI checks are bypassed. |
| M6-2 | Hostile Markdown/diff/filenames cannot run scripts, fetch arbitrary resources, navigate to unsafe URLs, or expose secrets. Browser bundles contain no backend credentials/Node-only adapters. Cross-origin state mutations remain protected.                     |
| M6-3 | Keyboard/accessibility and browser end-to-end checks cover inspecting a real persisted run, reviewing the exact artifact, a permitted human action, and safe stale-action rejection. Observe UI states rather than fabricating screenshots.                      |
| M6-4 | Publisher tests use a fake remote before any authorized GitHub action: missing/wrong permissions, malicious target/text, stale base/digest, duplicates, rate limiting, interruption, and partial write failure cannot create unapproved or duplicate changes.    |
| M6-5 | If an actual PR is authorized, its exact repository/branch/diff and run evidence match the human-approved proposal; record actual results. If no external write was authorized/performed, report it as unverified and do not claim PR integration acceptance.    |

## Verification and review

Run backend regression and contract/migration tests where affected, frontend formatting/typed lint/typecheck/unit tests, accessibility checks, browser end-to-end tests against dedicated local data, and a bundle/secret-boundary review. Use a fake GitHub adapter by default. Record actual browser/OS/tool versions, screenshots only when observed, and remaining limitations. Live publisher/provider tests require separate explicit permission.

Stop for human review. UI convenience must preserve the earlier trust boundaries. Public hosting, enterprise authentication, auto-merge/deployment, and multi-worker operation remain outside M6; see [M7](m7-scaling-load-testing.md) for scaling/load work.
