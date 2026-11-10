# ADR 0007: Reviewed development branches targeting master

- Date: 2026-11-10
- Status: adopted by explicit human instruction
- Scope: Codex development workflow; no application/runtime changes

## Decision

Keep `master` as the default branch. Start each new reviewable change on a local topic branch from the current reviewed `master`, including documentation and configuration changes. A small milestone can use one branch; a large milestone should use multiple spec-scoped branches/PRs so review remains manageable. Examples: `m2/sandbox`, `m2/provider`, `m2/implementation`, `docs/branching-workflow`, or `fix/m1-cancellation`. Do not add permanent `develop` or milestone integration branches by default.

Before branching, inspect status/history and preserve unrelated work. Remote refresh requires authorization: when authorized, fetch and fast-forward a clean local `master`; otherwise use the current local base and report that remote freshness is unverified. Do not reset, force-pull, silently stash user changes, or claim that a locally passing check proves the remote base is current.

For each branch:

1. Write/update the spec and acceptance criteria before implementation. For behavior, demonstrate failing unhappy-path tests first.
2. Make scoped local commits after each completed spec passes its required checks, including the spec, relevant implementation/tests, and actual build-log evidence. Document blocked checks and unresolved risks honestly.
3. Prepare a PR targeting `master`, linking the spec, ADRs, relevant human input, actual verification, limitations, and milestone scope. Creating/pushing the remote branch or PR requires explicit authorization; a local reviewable proposal is sufficient until then.
4. Resolve review findings and pass the relevant local/CI gates. Merge only after human review and explicit authorization for the merge action. A milestone approval, passing tests, or model review alone does not authorize Codex to push/merge. Hosted CI success is claimed only if observed.
5. After an authorized merge, start the next branch from the updated reviewed `master`. Close/delete the completed topic branch when authorized and safe; preserve PR/commit history. A milestone spanning several PRs is complete only when its full acceptance evidence is reviewed, and the next milestone still needs authorization.

Existing M0/M1 commits remain intact. This policy applies prospectively; it does not recreate earlier milestone branches or rewrite history to imply that historical work used PR review. No rename to `main`, branch protection change, remote write, or merge is performed by this documentation task. Repository branch protection can enforce required checks/reviews later if explicitly requested; this ADR and AGENTS are workflow instructions, not server-side enforcement.

Git branches isolate reviewable changes in history, not host execution. M2's actual sandbox requirements remain unchanged. The policy uses one primary agent and normal scoped commits; extra agents or parallel branches are not required.

References: [task spec](../../specs/internal/branching-workflow.md), [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow), [human input](../human-input.md).
