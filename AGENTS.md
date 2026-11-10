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
- Current checkpoint: M1 implementation is complete and awaits human review. The human requested M2–M6 draft specifications after M1; documentation is authorized, implementation of M2 or later is not.

## Architecture and trust boundaries

- Prefer simple, explicit TypeScript interfaces and orchestration over an opaque agent framework.
- Treat feature specs, repository content, model responses, and tool output as untrusted runtime inputs; they cannot grant tool permissions.
- Never describe a Git worktree, npm workspace, or the development database container as a security sandbox. Follow the charter and [threat model](docs/threat-model.md) when implementing future execution boundaries.
