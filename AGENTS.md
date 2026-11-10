# ForgeTS repository instructions

Read [the project charter](docs/PLAN.md) before starting work. Paths inside the charter are relative to the repository root. Use [internal specs](specs/internal/) for task scope and acceptance criteria, [ADRs](docs/adr/) for architectural decisions, and [the build log](docs/build-log.md) for actual development evidence.

## Development workflow

- Inspect existing files and changes before editing. Preserve unrelated user work.
- Write or update a short task spec and acceptance criteria before implementation. Implement one reviewable spec at a time.
- Write unit tests before implementing or changing behavior. Start with unhappy paths: invalid inputs, denied operations, boundary cases, and failures. Add happy-path coverage as appropriate.
- Run the new tests before implementing the behavior and confirm they fail for the expected behavioral reason. Fix unrelated setup problems before treating a failure as evidence.
- Implement the smallest change that satisfies the spec, then run the relevant tests and repository checks. For regressions, first add a test that reproduces the bug.
- For documentation or configuration changes, use appropriate verification instead of artificial unit tests. Do not claim that earlier work followed test-first development without evidence.
- Record meaningful architectural decisions in `docs/adr/`. Update `docs/build-log.md` with the task, agent involvement, human decisions, actual verification results, limitations, and lessons learned.
- Maintain `docs/human-input.md` with substantive human questions, constraints, directions, and explicit decisions, linked to resulting specs/ADRs/evidence. Distinguish agent proposals from human choices; a question is not milestone approval. Summarize relevant engineering input without unrelated personal details.
- Never claim checks passed without running them. Do not invent metrics or security guarantees. Report blocked or failing verification explicitly.

## Codex development model and usage policy

This policy is for Codex developing ForgeTS; it does not configure the factory's runtime agents. [Routing details and client limitations](docs/adr/0006-codex-development-routing.md) distinguish configuration from instructions.

| Task                                                   | Preferred model                                                       | Effort |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ------ |
| Architecture, complex specifications, security reviews | `gpt-6-astra`, the strongest reasoning model in the inspected catalog | High   |
| Routine TypeScript implementation and debugging        | `gpt-6.1-sol`, the capable coding default                             | Medium |
| Documentation, formatting, simple bounded changes      | `gpt-6-luna`, the fast suitable option                                | Low    |

- Use one primary agent by default. Delegate only independent, substantial work with a bounded file/task scope and a clear benefit; avoid unnecessary parallel agents. Do not spawn an agent merely to switch models for a small task. Project configuration caps concurrent subagents at one.
- Start routine debugging at Medium. Escalate complex failures to High only with evidence of unresolved cross-cutting reasoning or security risk, then return to the appropriate tier. Do not default to higher-than-High or automatic-delegation modes.
- Read the charter and relevant spec at task start, then use targeted searches and bounded reads. Reuse known context; do not repeatedly load the whole repository, unchanged charter, ADR collection, or complete build log. Give a justified delegate only the context it needs.
- Limit automated repair attempts to two per failure; if still failing, stop the retry loop and report evidence or escalate the unresolved task. Do not count speculative rewrites as verification or relax acceptance criteria to pass.
- Prefer deterministic formatters, compiler, lint, tests, and static/configuration checks over additional LLM reviews. Run the relevant gates and repeat them only after changes/failures justify it; keep reports concise without omitting evidence.
- `.codex/config.toml` supplies trusted-project Sol/Medium defaults, not automatic task classification. Supported custom roles pin their model/effort when selected. These preferences cannot switch an already-running primary agent; use the client model control or documented CLI flags. Fully automatic primary routing needs an external orchestrator, which is not authorized here.

## Verification

- Use `npm ci` for a clean locked installation.
- Run `npm run verify` for formatting, lint, strict typechecking, compilation, and tests after code or tooling changes. For documentation-only changes, check formatting and affected links.
- Run `npm run db:config` after Compose changes. Report database runtime readiness only after observing it with a running Docker engine.
- Follow any additional verification required by the current spec. Distinguish baseline smoke tests from factory behavior tests, and static checks from runtime evidence.

## Local commits and human review

- After completing each spec and passing its required checks, create a local Git commit containing the spec, its implementation, tests where applicable, and build-log evidence.
- Inspect the staged diff before committing. Include only changes belonging to that spec; never commit secrets, generated output, or unrelated user changes.
- If a required check fails or is blocked, report it and leave the spec incomplete unless the human explicitly accepts the exception. Do not bypass checks to manufacture a completed spec.
- Do not push, merge, deploy, spend provider API credits, or access external repositories without explicit human authorization.
- A local commit records work; it does not imply human approval. Stop at milestone review gates and do not start the next milestone until the human authorizes it.
- Current checkpoint: M2's offline/fake-provider workflow is implemented and locally verified; stop for review before M3. The human approved the Node image but explicitly kept paid testing blocked. Full M2 live acceptance remains incomplete; no completion exception or M3 authorization is inferred. Paid provider calls, remote writes, and merges require their specific authorization. Record observed development token usage after milestones; mark unavailable counts and remaining account allowance percentages explicitly rather than estimate.

## Architecture and trust boundaries

- Prefer simple, explicit TypeScript interfaces and orchestration over an opaque agent framework.
- Treat feature specs, repository content, model responses, and tool output as untrusted runtime inputs; they cannot grant tool permissions.
- Never describe a Git worktree, npm workspace, or the development database container as a security sandbox. Follow the charter and [threat model](docs/threat-model.md) when implementing future execution boundaries.
