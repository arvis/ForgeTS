# M0 follow-up: Repository instructions and document layout

Status: specified before implementation on 2026-11-09; implemented and verified. M0 human review remains pending.

## Goal and authorization

Implement the human's instruction to adopt the proposed root `AGENTS.md` workflow: spec first, unit tests before behavior changes with unhappy paths first, actual verification, one local commit per completed spec, and no push. Use the recommended layout with the roadmap in `docs/PLAN.md`. This follow-up does not authorize M1 or approve M0's open findings.

## Plan

1. Add concise repository-wide instructions in root `AGENTS.md`, linking the charter and specifying the development and commit workflow.
2. Move root `PLAN.md` into `docs/PLAN.md` without changing its contents; update live links and its formatter exclusion. Preserve historical build-log descriptions of the original location.
3. Record the decision in ADR 0002 and update the README and build log.
4. Verify formatting, local Markdown links, unchanged charter bytes, the repository checks, and the staged diff. Commit this completed spec and its related changes locally, separately from the verified M0 baseline.

## Acceptance criteria

- Root `AGENTS.md` requires a spec and acceptance criteria before implementation; failing unit tests before behavioral changes, starting with unhappy paths; relevant checks; and actual evidence in the build log.
- Documentation/configuration-only changes use appropriate verification instead of artificial unit tests. Existing tests are not retrospectively described as test-first.
- Each completed, verified spec gets a scoped local commit. Unrelated user changes and secrets are excluded. Pushes need explicit authorization; local commits do not count as milestone approval.
- The charter exists only at `docs/PLAN.md`, remains byte-identical to the committed M0 charter, and is discoverable through working links in `AGENTS.md`, README, the M0 spec, and ADRs.
- Formatting, local Markdown link checks, `npm run verify`, `npm run db:config`, and staged whitespace checks pass. Known audit and Docker runtime limitations remain documented.
- M1 remains unstarted. No application behavior is changed.

## Verification evidence

- `npm run format` and `npm run verify`: exit 0; formatting, lint, strict typecheck, compilation, and the existing 1/1 smoke test passed.
- `npm run db:config`: exit 0; no database runtime claim is made.
- One-off local Markdown link check: exit 0; all 22 local links resolved. A byte comparison against the M0 Git blob passed, and root `PLAN.md` is absent.
- No new unit tests were added because this spec changes instructions and documentation, not runtime behavior. The new test-first rule applies to subsequent behavioral work.
- Commit scope and whitespace are checked before creating the local completion commit. M0 audit findings and the unavailable Docker runtime remain recorded in the build log.
