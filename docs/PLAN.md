# ForgeTS — Agentic Software Factory

> **The irony is intentional:** ChatGPT proposed this project to help its human collaborator demonstrate agentic software factory skills for a software engineering role at **Levelpath**. We are now asking Codex, another coding agent, to build a factory for coding agents. The factory should eventually help build and improve itself. An AI suggested an AI factory so a human can get hired to work with AI factories. Keep this origin story in the README; don't pretend this was a production system.

## 1. Purpose

Build a portfolio-quality, small but credible **TypeScript agentic software factory** that takes a Markdown feature specification, plans changes, implements them in an isolated workspace, runs deterministic checks, attempts bounded repairs, produces a review report, and waits for human approval before preparing a pull request.

**Why this project:** It was chosen specifically as a learning and portfolio project for an application to **Levelpath**, whose agentic-workflows engineering role emphasizes spec-driven development, AI-assisted implementation, TypeScript/backend engineering, validation, verification, hardening, and ownership of agent-generated code. This is an independent learning project, not a Levelpath product or a claim of prior professional factory experience.

**Primary goal:** Demonstrate engineering judgment about agent orchestration, tool boundaries, reliable execution, reproducible verification, failure handling, and evaluation—not merely the ability to call an LLM API.

## 2. Working principles for Codex

- **Read this file first.** Treat it as the project charter, not as permission to implement everything in one pass.
- Work **spec-first**: propose or update a short Markdown task spec and acceptance criteria before substantial implementation.
- Implement in small, reviewable increments. At the end of each milestone, report what changed, commands executed, results, risks, and the next step.
- Prefer simple, explicit TypeScript interfaces and orchestration over an opaque multi-agent framework.
- Never claim tests passed without actually running them. Never invent metrics, run results, or security guarantees.
- Do not autonomously push, merge, deploy, spend API credits, or access external repositories without explicit human authorization.
- Record meaningful architectural decisions in `docs/adr/`.
- When factory behavior fails, consider whether the root cause belongs in the spec, prompt, tool contract, policy, validator, or test suite. Fix systemic causes where feasible.
- Keep an audit trail of agent-assisted development in `docs/build-log.md`: task, agent involvement, human decisions, verification, and lessons learned.

## 3. MVP user journey

1. Developer writes `specs/examples/add-project-api.md` describing a feature and acceptance criteria for a tiny sample application.
2. Developer invokes `npm run factory -- run specs/examples/add-project-api.md` (exact CLI syntax can be adjusted and documented).
3. Factory validates the spec and starts a uniquely identified run.
4. Planner produces a structured, schema-validated plan of intended file changes, tests, and risks.
5. Implementer operates only in a dedicated isolated working directory or container, not the host repository.
6. Verifier runs allowlisted deterministic checks (format/lint, typecheck, tests) and captures exit codes, stdout/stderr, duration, and failures.
7. On failure, repair agent receives bounded feedback and may retry at most twice; no infinite loops.
8. Reviewer inspects the diff, test results, and risk indicators, returning a structured report. Its opinion is advisory, not proof of correctness.
9. Factory generates a final report and stops at **AWAITING_HUMAN_APPROVAL**. No automatic merge or deployment.
10. Human can inspect the diff and approve or reject. PR creation is an optional later integration, requiring explicit authorization.

## 4. Scope

### In scope for MVP

- Node.js + TypeScript monorepo using npm workspaces (or pnpm if justified).
- NestJS API for starting and inspecting runs; CLI as the primary entry point.
- PostgreSQL persistence, migrations, and Docker Compose for local infrastructure.
- Zod contracts for all agent inputs/outputs and run transitions.
- Pluggable LLM provider interface; start with **one** real provider and a deterministic mock provider for tests.
- Planner, implementer, reviewer, and repair **roles**; they can share the same model/provider.
- Isolated execution workspace, command allowlist, timeouts, output limits, retry limits, and explicit file path policies.
- Deterministic verification pipeline.
- Append-only-ish run event log with timestamps, state transitions, tool calls, and redacted error details.
- A tiny sample NestJS application that serves as the target repository.
- At least five reproducible evaluation fixtures, including negative cases.
- README with honest architecture, setup, demo, limitations, and the project's origin story.

### Out of scope for MVP

- Production deployment or automatic merges.
- Multi-user authentication, enterprise RBAC, distributed queues, or Kubernetes.
- Arbitrary agent shell access, unrestricted network access, or host filesystem access.
- Autonomous GitHub writes.
- A sophisticated React dashboard; CLI output and an API are sufficient initially.
- A custom model, training pipeline, or complex vector database.
- Claims that LLM review guarantees security.

## 5. Architecture

```text
Markdown spec
     |
     v
Spec parser + validator
     |
     v
Run orchestrator / state machine ----> PostgreSQL events + artifacts
     |
     v
Planner (structured plan)
     |
     v
Implementer (bounded file edits in sandbox)
     |
     v
Verifier (lint, typecheck, tests)
     | fail: bounded retries
     +------------------------> Repair agent ----> Verifier
     |
     v
Reviewer (advisory diff/risk assessment)
     |
     v
Human approval gate
     |
     v
Report / optional authorized PR preparation
```

Suggested packages:

```text
apps/
  api/                    # NestJS run management API
  cli/                    # Local CLI
  sample-app/             # Small target application for demo
packages/
  contracts/              # Zod schemas and shared types
  core/                   # State machine, orchestration, policies
  agents/                 # Agent roles and provider abstraction
  runner/                 # Isolated workspace and tool execution
  persistence/            # PostgreSQL models and migrations
  evals/                  # Evaluation harness
specs/
  examples/
  internal/               # Specs used to build ForgeTS itself
docs/
  adr/
  build-log.md
  threat-model.md
```

Adjust structure if necessary; keep boundaries explicit.

## 6. Contracts and run lifecycle

Define and validate schemas for:

- `FeatureSpec`: goal, requirements, acceptance criteria, constraints.
- `ImplementationPlan`: summary, ordered steps, file changes, test strategy, risks.
- `ToolRequest` / `ToolResult`: requested capability, arguments, exit code, bounded output, duration.
- `VerificationResult`: command, outcome, diagnostics, artifacts.
- `ReviewReport`: concerns, evidence, recommendation, residual uncertainty.
- `FactoryRun`: run ID, spec reference, state, attempts, timestamps, artifact locations.

Proposed states:

`CREATED -> SPEC_VALIDATED -> PLANNED -> IMPLEMENTING -> VERIFYING -> REVIEWING -> AWAITING_HUMAN_APPROVAL -> APPROVED | REJECTED`

Include explicit `REPAIRING`, `FAILED`, and `CANCELLED` transitions. Validate allowed transitions centrally. Store events so failures can be investigated. Make retries idempotent where practical.

## 7. Safety and trust boundaries

Agent-generated content, Markdown specs, repository files, test output, and tool output are **untrusted**. They must not override tool policy or system-level instructions.

- Use an isolated disposable container or equivalent strong sandbox for agent-generated code and verification. **A Git worktree alone is not a security boundary.**
- Disable network access for verification containers by default. Mount only the required workspace; avoid mounting Docker sockets, host credentials, SSH keys, or cloud tokens.
- Enforce filesystem scope and reject path traversal/symlink escapes.
- Do not execute arbitrary commands supplied by the LLM. Use explicit tool capabilities and allowlisted commands with validated arguments.
- Apply process timeouts, resource limits, output-size limits, and bounded retry/token budgets.
- Keep provider API keys outside the execution sandbox. Redact secrets and sensitive output from persisted logs.
- Treat a model's `approved`/`safe` opinion as advisory; deterministic gates and a human remain authoritative.
- Document remaining limitations and any environment-dependent isolation gaps.

## 8. Suggested persistence model

- `factory_runs`: run metadata, state, attempts, timestamps.
- `run_events`: ordered event stream and state transitions.
- `agent_invocations`: role, model, prompt/template version, status, token usage and cost **when actually reported**.
- `tool_executions`: capability, sanitized arguments, exit status, duration, output references.
- `verification_results`: checks and diagnostics.
- `approvals`: human decision and timestamp.

Keep large artifacts (diffs, logs, generated reports) in an artifact directory with database references. Do not store secrets or full prompts containing sensitive material by default.

## 9. Evaluation strategy

Use deterministic fixtures and a mock model to make tests fast, inexpensive, and repeatable. Add opt-in live-model evaluations later.

Initial scenarios:

1. Valid feature spec -> plan passes schema validation.
2. Malformed agent JSON -> rejected or repaired within bounded attempts.
3. Generated TypeScript type error -> verifier catches failure.
4. Failing unit test -> repair loop retries and reports actual outcome.
5. Attempted unauthorized path write or shell command -> denied and logged.
6. Prompt injection inside repository content -> cannot alter tool permissions.
7. Persistent failure -> terminates with `FAILED`, never loops indefinitely.
8. Reviewer recommendation conflicts with deterministic test failure -> approval gate remains blocked.

Report fixture pass rate, invalid-output detection, retry outcomes, elapsed time, and token/cost data only when available. Avoid fabricated benchmark claims.

## 10. Delivery milestones

### M0 — Repository and specifications
- Initialize TypeScript workspace, lint, format, test, CI, Docker Compose.
- Write `README.md`, initial ADR, `docs/threat-model.md`, and `docs/build-log.md`.
- Define first internal implementation spec with acceptance criteria.
- **Done when:** clean checkout installs, typechecks, and runs baseline tests.

### M1 — Contracts and orchestration
- Define Zod contracts and typed state machine.
- Add PostgreSQL persistence and migrations.
- Add mock agents and a CLI/API that can run a complete **simulated** workflow.
- **Done when:** a mock run has persisted transitions, structured outputs, and a final report.

### M2 — Real agent and sandboxed tools
- Draft implementation spec: [M2](../specs/internal/m2-real-agent-sandbox.md).
- Add one real LLM provider behind an interface.
- Add secure, isolated workspace creation and constrained tool execution.
- Implement planner and implementer with validated responses.
- **Done when:** an opt-in live run can generate a small code change in isolation without unrestricted host execution.

### M3 — Verification and bounded repair
- Draft implementation spec: [M3](../specs/internal/m3-verification-repair.md).
- Run real lint/typecheck/tests inside the isolated environment.
- Add bounded repair loop and terminal failure behavior.
- **Done when:** a deliberately broken change is detected and either repaired or safely rejected with evidence.

### M4 — Review and approval
- Draft implementation spec: [M4](../specs/internal/m4-review-human-approval.md).
- Add structured reviewer, human approval gate, diff/report export.
- **Done when:** no unverified or unapproved change is presented as ready to merge.

### M5 — Evaluation and portfolio polish
- Draft implementation spec: [M5](../specs/internal/m5-evaluation-portfolio.md).
- Implement at least five negative/positive eval fixtures.
- Add CI, demo walkthrough, screenshots or terminal recording, architecture diagram, and honest limitations.
- **Done when:** a recruiter can clone the repository, run mock demos without API keys, and understand what the factory guarantees and does not guarantee.

### Optional M6 — Dashboard and GitHub integration
- Draft implementation spec: [M6](../specs/internal/m6-dashboard-github.md).
- React run-history dashboard.
- GitHub PR preparation after explicit human approval and permission checks.
- Additional provider support and comparative evaluations.

### Optional M7 — Scaling and load testing
- Preserve M1's small API/database baseline; define average-load, stress, spike, and soak profiles for larger workloads and any justified multi-worker design.
- Evaluate bounded concurrency, durable jobs, worker ownership/recovery, idempotency, cancellation, and backpressure before increasing operational concurrency.
- Use disposable test environments and deterministic mock providers by default, with explicit request/duration/resource budgets and abort conditions. Exclude production targets and credentials; paid provider tests require separate authorization.
- Record latency percentiles, successful-run throughput, expected rejections, unexpected errors, queue/resource measurements where applicable, and state/event/isolation correctness under load.
- Retain reproducible scripts, workload/environment details, raw results, and thresholds chosen before measurement. See `specs/internal/m7-scaling-load-testing.md` for the draft acceptance criteria.
- **Done when:** actual bounded load-test results establish the tested operating limits and recovery behavior, preserve correctness and isolation, and support a human-reviewed scaling decision. This roadmap entry does not authorize implementation.

## 11. Definition of done

A successful MVP must:

- Take a Markdown spec through a traceable multi-stage run.
- Validate agent output using typed contracts.
- Make real code changes only inside a constrained workspace.
- Run deterministic checks and retain their actual results.
- Bound retries and handle malformed output/failures gracefully.
- Preserve inspectable diffs and audit events.
- Require human approval for final delivery actions.
- Demonstrate at least five repeatable evaluation cases.
- Work in mock mode without paid API calls.
- Explain security boundaries and limitations accurately.

## 12. Portfolio and interview narrative

Suggested honest description:

> “I was interested in Levelpath's agentic-workflows engineering role. ChatGPT suggested I build an agentic software factory to learn the model, and I used Codex to implement the factory itself. I focused on structured contracts, constrained tools, deterministic verification, bounded repair, observability, evaluation, and human approval. I can walk through failures I observed, the controls I added, and the trade-offs I made.”

**The meta-demo:** Show the Markdown spec used to build a ForgeTS milestone, the Codex-generated changes, the tests and human review, and then ForgeTS processing a separate sample-app spec. Clearly distinguish Codex's development workflow from ForgeTS's own runtime orchestration.

## 13. First instructions to Codex

1. Read `PLAN.md` completely.
2. Inspect the repository and identify existing files before making changes.
3. Propose the **M0 implementation plan** and its acceptance criteria in `specs/internal/m0-bootstrap.md`.
4. Identify any important ambiguities and choose conservative defaults, noting them in an ADR.
5. Implement **M0 only**, not the whole roadmap.
6. Run the relevant commands and report their actual outcomes.
7. Update `docs/build-log.md` with what Codex did, what was verified, and what needs human review.
8. Stop and request human review before proceeding to M1.

The objective is not maximum generated code. It is a small, explainable, demonstrably reliable agentic engineering workflow.
