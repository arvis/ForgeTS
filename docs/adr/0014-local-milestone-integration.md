# ADR 0014: Commit and merge completed milestones locally

- Date: 2026-11-10
- Status: explicitly directed by the human
- Scope: Codex developing ForgeTS; runtime approval permissions unchanged

Keep `master`. Start milestone work from the current integrated `master` on a descriptive topic branch; use scoped spec commits and independently reviewable branches when needed. If an explicitly authorized milestone depends on unmerged local work, document a stacked base and preserve history rather than silently merging or rewriting it. M3 used this exception while M2 was unmerged.

After finishing a milestone and passing its required checks, commit all authored milestone changes, including specs, code/tests, ADRs and actual evidence, then merge the milestone branch into local `master`. This instruction is standing human authorization for those local merges; do not stop merely to request the same merge permission again. Inspect staged scope first and preserve unrelated user work. Do not merge incomplete/failing work unless the human explicitly authorizes integrating a known limitation. Do not commit secrets, dependencies, build output or disposable workspaces; intentionally retained sanitized verification evidence belongs in docs.

The human will push to the remote themselves. Do not push, create remote PRs, fetch external repositories, deploy or spend provider credits without separate explicit authorization. A local merge records the development milestone; it is not runtime approval or permission to start the next milestone. Stop at the next review gate. There is no M4 implementation authorization.

For this task, the human explicitly requested local M2 and M3 merges after being shown that M2's live test is unperformed. Integrate that documented offline M2 state and the verified offline M3 work, preserving the limitation. This is not a fabricated live pass or a claim that the original M2 live criterion was met. The generated sample artifacts still have `mergeReady: false`; integrating ForgeTS development code does not apply or approve them.

Use local non-fast-forward milestone merges to retain the branch/commit narrative. Check ancestry and compare the integrated tree/code against the tested candidate; rerun affected gates if conflict resolution changes behavior. Document actual merge results afterward in a scoped documentation commit and integrate it too. Retain topic branches for review unless deletion is separately requested. No server-side branch protection or remote operation is configured here.

References: [workflow spec](../../specs/internal/milestone-local-integration.md), [M2 evidence](../m2-verification.md), [M3 evidence](../m3-verification.md), [human input](../human-input.md).
