# Development branching workflow

Date: 2026-11-10. Status: documented and verified; human review pending.

The human accepted the recommended branch/PR workflow and explicitly kept `master` as the default. Document small reviewable branches: one branch for a small milestone or several spec-scoped branches for a large milestone, with completed-spec commits and human-reviewed merges. This is a development workflow, not a factory execution sandbox or authorization to publish/merge.

## Acceptance criteria

- Keep `master` and all existing history intact. Start this documentation change on `docs/branching-workflow`; use branches for future code, configuration, and documentation changes rather than committing directly to `master`.
- Document milestone-prefixed names, spec-first/test-first work, scoped commits after verification, PR evidence, passing checks and explicit review/action approval, and the next milestone's separate authorization.
- Start subsequent branches from the current reviewed `master`. Split large milestones into several independently reviewable specs/PRs; each merge needs review. Do not add a permanent milestone integration/develop branch by default.
- Preserve explicit authorization requirements for remote access/push/merge/deployment. Do not fetch, push, open a remote PR, rename a branch, rewrite shared history, or merge as part of this task. Preserve existing M0/M1 history.
- Update AGENTS, an ADR, README discovery link, human-input record, and build log. Verify formatting, local links, scoped documentation diff, unchanged `master`, and staged whitespace before a local commit on this branch. No application tests are needed for documentation-only changes.

## Verification evidence

`npm run format:check` passed. Deterministic checks resolved all 117 local Markdown links, confirmed exactly the six intended documentation/instruction files changed, and confirmed the current topic branch and unchanged `master` commit. The documentation diff was reviewed and `git diff --check` passed. Staged scope/whitespace inspection is required before the local commit. No application tests or remote operations were needed.
