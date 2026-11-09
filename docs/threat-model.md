# Initial threat model

Date: 2026-11-09. Scope: M0 foundation and the intended future boundaries. This is a design record, not a security certification.

## Assets and actors

Assets include the developer's repository and host files, credentials, future provider keys, run events, artifacts, database contents, and the integrity of verification and approval evidence. The human developer controls the trusted bootstrap. Future specs, target repositories, model responses, generated code, tool output, and test output must be treated as untrusted, even when they appear helpful or claim authority.

## Current M0 boundaries

- `npm ci`, compiler, linter, formatter, and test runner execute trusted development tooling on the host. Third-party dependencies remain a supply-chain risk. Exact direct versions and the lockfile improve repeatability; they do not prove safety or reproducible bytes for every environment.
- The observed dependency audit reports 10 moderate findings associated with a transitive `minimatch` pattern-amplification denial-of-service advisory in the linter stack. This is a known open finding, not a passing security check. M0 uses repository-owned lint patterns and must not be generalized to processing hostile inputs on the host. See [ADR 0001](adr/0001-m0-foundation.md) for the dependency compatibility decision.
- The Git repository and npm workspaces organize files; neither contains hostile code. M0 must not run arbitrary generated changes through these host scripts.
- Compose exposes only the development PostgreSQL port on loopback. Its public credentials and persistent volume are for local use only. Local processes can still access it. There is no application, schema, or run data yet.
- CI has read-only repository permissions, disables persisted checkout credentials, and has a job timeout. The external Actions references and database image are version tags, not immutable digests. A compromised dependency or action remains a risk.
- `.env` variants, generated output, future artifacts, and execution directories are ignored by Git. Ignore rules are convenience controls, not secret scanning or access controls. `.env.example` intentionally contains only public development defaults.

## Future risks and required controls

| Threat                                                                 | Intended control                                                                           | M0 status        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------- |
| Prompt injection in specs, repositories, or output changes permissions | Enforce policy outside model-controlled content; validate capability requests              | Not implemented  |
| Path traversal or symlink escape modifies host files                   | Disposable strong sandbox plus independent file-scope and symlink checks                   | Not implemented  |
| Model requests arbitrary shell/network access                          | Explicit allowlisted capabilities and validated arguments; network disabled by default     | Not implemented  |
| Generated code reads credentials or controls Docker                    | Mount only its workspace; no provider keys, host credentials, or Docker socket             | Not implemented  |
| Runaway process, output flood, or infinite repair                      | Process/resource/output limits and bounded attempt/token budgets                           | Not implemented  |
| Secrets leak through prompts, diagnostics, or persisted events         | Keep keys outside executor; redact persisted metadata and output                           | Not implemented  |
| Reviewer declares a failed change safe                                 | Deterministic gates remain authoritative; advisory review and explicit human approval      | Not implemented  |
| Invalid agent output corrupts orchestration or history                 | Zod contracts, centrally validated transitions, persisted ordered events                   | Deferred to M1   |
| Misleading evidence presents a demo as production-ready                | Keep actual command outcomes, uncertainty, scope limits, and human review in the build log | Documented at M0 |

## Residual uncertainty

No sandbox, command policy, redaction, resource limit, provider isolation, database access policy, approval gate, or adversarial evaluation has been tested because none exists yet. PostgreSQL readiness requires a running Docker daemon and must be reported separately from static Compose validation. Future isolation behavior will depend on the selected container runtime and operating system and will need direct verification. Database backups, remote hosting, authentication, and production operation are outside this milestone.
