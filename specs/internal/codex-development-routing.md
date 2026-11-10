# Codex development model policy

Date: 2026-11-10. Scope: Codex developing ForgeTS; no factory runtime changes or later milestone implementation.

Status: configuration/documents implemented and verified; activation in the current user profile requires explicit project trust and a new/reloaded session. No automatic primary router was added.

The human requested usage-conscious task routing after inspecting installed versions, available models, and actual configuration support. Before edits, discovery found CLI 0.162.1, VS Code's bundled CLI 0.164.0-alpha.11.1, an existing user default of `gpt-6.1-sol`/High, no project `.codex` directory, and a clean working tree. `codex debug models` lists Astra, Sol, and Luna with the requested High/Medium/Low efforts. A newer cached catalog was not treated as the installed version.

## Acceptance criteria

- Set supported project defaults to Sol/Medium and a one-subagent concurrency ceiling; preserve user configuration, permissions, providers, MCP, service tier, and application files.
- Define discoverable architect/security (Astra/High), TypeScript (Sol/Medium), and lightweight (Luna/Low) custom agents only if installed clients support their format. AGENTS preferences remain advisory; configured values apply only when that role is selected.
- Use a single primary by default, narrow context, deterministic verification, at most two automated repair attempts, and delegation only for substantial independent work. Do not spawn a subagent merely to change models for a small task.
- Explain that primary task classification/model switching is manual unless a separately approved orchestrator supplies it. Project profiles ignored by Codex must not be invented as routing. No custom router, model turn, or paid API call is added for validation.
- Verify TOML and effective/discovered settings using local Codex metadata/config inspection, model catalogs, both installed client versions where feasible, formatting, documentation links, and scoped diff checks. Document trust/override/reload limits and any validation blockers honestly.
- Update the ADR, build/input logs, and make a local scoped commit. No application refactor, global setting edit, push, or milestone implementation is authorized.

## Actual verification

Both installed binaries accepted the project defaults through native strict config reads in an isolated trusted home. An unknown-key control failed as expected. The IDE exposed the three pinned custom roles; standalone CLI did not. Actual-user inspection confirmed the untrusted-project limitation, and the user-config SHA-256 remained unchanged. Python parsed four TOML files and checked all role values; formatting, all 112 local documentation links, and a nine-file developer-config/docs-only scope passed. Initial Markdown formatting warnings were corrected. No model turn/subagent or runtime test was used for validation. Staged diff/whitespace are inspected before committing.
