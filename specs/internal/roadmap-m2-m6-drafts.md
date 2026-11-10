# Planning task: M2 through M6 draft specifications

Date: 2026-11-10. Status: documentation task completed and verified. The M2–M6 milestone specs remain drafts with no implementation authorization.

## Request and scope

After M1, the human requested the missing M2–M6 specs and asked Codex to continue. M1 is implemented in commits ending with `ea56b1b`, with recorded local evidence. This task prepares documents only; M1 result review and later implementation authorization remain pending.

## Acceptance criteria

1. Create one reviewable draft per milestone: M2 real provider/sandbox, M3 real verification/bounded repair, M4 advisory review/human approval, M5 evaluations/portfolio evidence, and optional M6 frontend/GitHub integration.
2. Each draft identifies its goal, prerequisites, architecture boundaries, implementation sequence, unhappy-path-first acceptance criteria, required actual evidence, non-goals, and human review gate.
3. Preserve the charter's safety boundaries, one-run default, no production/publishing/provider spending without explicit permission, and distinction between mock evidence and real execution. Do not imply that human approval or sandbox containment already exists.
4. Describe M1-to-later schema/provenance migration requirements. Keep frontend/CSS, provider, runtime, and queue choices labelled as proposals/open decisions. M7 remains a separate optional scaling/load milestone.
5. Add a spec index and roadmap/README links; update architecture rationale, build log, and human-input attribution. Retain historical decisions and verification results.
6. Run documentation formatting, local-link/anchor checks, staged whitespace/scope checks, and confirm runtime/dependencies/tooling are unchanged. Commit this completed planning task locally; leave all five milestone drafts unimplemented.

## Actual verification

`npm run format` and `npm run format:check` exited 0. One-off Node documentation checks passed all 107 final local links, exactly 12 intended documentation changes, and a charter diff limited to five milestone draft links. There are no local fragment targets requiring anchor resolution. Unstaged/staged whitespace and scope are inspected before the planning commit. No runtime/dependency/tooling files changed, so the M1 runtime tests were not repeated for these drafts. See [the build log](../../docs/build-log.md) for the completed M1 evidence and this task's provenance.
