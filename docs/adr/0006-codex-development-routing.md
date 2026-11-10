# ADR 0006: Task-aware Codex development defaults

- Date: 2026-11-10
- Status: implemented and locally verified; existing-user activation awaits explicit project trust
- Scope: Codex developing ForgeTS; no runtime agent, application, or milestone behavior changes

## Discovery and decision

The installed desktop/PATH CLI reports `0.162.1`; VS Code's extension bundles `0.164.0-alpha.11.1`. The model cache was written by `0.167.0`, so its version was not treated as the installed binary. The actual `codex debug models` catalog lists `gpt-6-astra` for demanding reasoning, `gpt-6.1-sol` for coding, and `gpt-6-luna` for easier work, all with the requested efforts. This is catalog/configuration evidence, not a paid inference test or an account-access guarantee.

The existing user config selects Sol/High and priority service. No project config existed. Add project Sol/Medium defaults plus supported subagent defaults and a concurrency cap of one child (in addition to the primary). Preserve user config bytes, permissions, providers, service tier, MCP, and application files. Keep one primary by instruction; a concurrency ceiling does not itself prevent unnecessary delegation. Do not enable extra feature flags, change context windows, or add a router.

## What happens automatically

| Mechanism                               | Effect and boundary                                                                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trusted project `.codex/config.toml`    | Defaults new applicable sessions to Sol/Medium, unspecified subagents to Sol/Medium, and at most one concurrent child. Higher-precedence client/CLI/managed settings can override defaults. It does not classify tasks.  |
| `.codex/agents/architect.toml`          | Astra/High for a selected substantial independent architecture/spec/security review or complex failure analysis.                                                                                                         |
| `.codex/agents/typescript_worker.toml`  | Sol/Medium for a selected substantial independent implementation/debugging task.                                                                                                                                         |
| `.codex/agents/lightweight_worker.toml` | Luna/Low for justified independent documentation/simple work. Small tasks should stay on the primary instead of paying delegation/context overhead.                                                                      |
| `AGENTS.md`                             | Advisory task selection, escalation, single-primary/narrow-context workflow, deterministic checks, and a two-attempt repair limit. No configuration key enforces this retry policy or switches the primary by task text. |
| External orchestrator                   | Would be required to guarantee semantic classification and automatic primary model switching. No such router or integration is implemented or authorized.                                                                |

Custom-role model/effort settings are enforced when that supported role is selected; deciding whether a task merits the role remains agent/user judgment. The role instructions asking for read-only analysis are not an OS sandbox. Custom agents inherit the parent's permissions/provider/MCP; this change grants no extra capability.

## Client limitations and manual steps

Both installed clients accepted the project defaults through native configuration reads with strict parsing in an isolated trusted validation home. VS Code's bundled client exposed all three custom roles and their pinned model/effort in prompt metadata. The standalone 0.162.1 CLI did not expose these standalone role files, including a one-off probe of its existing multi-agent feature flag; no ineffective flag was added. Use the IDE for named custom roles, or use explicit primary settings in the CLI:

```sh
codex --model gpt-6-astra -c model_reasoning_effort=high
codex --model gpt-6.1-sol -c model_reasoning_effort=medium
codex --model gpt-6-luna -c model_reasoning_effort=low
```

For the IDE, choose the model/effort control for primary architecture or lightweight work. Do not delegate simply to obtain another model. Reload/start a new applicable session after configuration changes; existing threads and explicit client selections can retain their overrides. Project `profiles`/`profile` keys are ignored by current Codex and were deliberately omitted.

**Required activation step:** native configuration inspection using the existing user profile reports ForgeTS as untrusted, so it currently retains Sol/High and ignores the new project layer. Explicitly mark this repository trusted in Codex (or add the project trust entry indicated by Codex's diagnostic), then reload/start a session. No global configuration or trust setting was silently changed. The successful isolated checks deliberately trusted only this repository for validation; they do not establish activation in the existing user profile. Until that trust step, no project default or custom role is guaranteed to apply.

No model turn or subagent was run to validate this change. `debug models`, `debug prompt-input`, doctor, and app-server initialization/config-read inspect metadata only. The existing user config has an unrelated ignored-key warning (`windows_wsl_setup_acknowledged`); full strict startup with that user config is blocked, so strict validation uses an isolated minimal trusted config without credentials. Doctor also reports unrelated optional integration warnings; do not interpret its overall nonzero exit as a routing failure or claim it is fully healthy.

This policy aims to reduce avoidable reasoning/context/delegation overhead; no token savings or five-hour allowance guarantee has been measured. Account availability/limits can change. Reinspect the catalog/client when updating model IDs or versions; never silently substitute an unverified identifier. Runtime provider selection remains governed by the ForgeTS milestone specs.

## Verification evidence

Python `tomllib` parsed all four TOML files. Native app-server initialization/config reads with `--strict-config` in an isolated trusted home returned Sol/Medium and the intended subagent defaults/cap for both installed versions. A negative control containing an invented key was rejected (exit 1). IDE prompt metadata listed all three role descriptions with fixed model/effort; CLI prompt metadata did not discover these custom roles. Real-user configuration inspection confirmed the trust limitation above. SHA-256 of the user config was unchanged. No inference, application test, repair loop, or custom orchestrator was used for this validation; formatting/link/scope checks are recorded in the build log.

## References

- [Official project configuration and trust](https://learn.chatgpt.com/docs/config-file/config-advanced)
- [Official custom-agent settings and precedence](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Official Astra model description](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [Task spec](../../specs/internal/codex-development-routing.md)
