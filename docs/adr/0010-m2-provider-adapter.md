# ADR 0010: Bounded Responses adapter with fake transport provenance

- Date: 2026-11-10
- Status: implemented for fake testing; live model/budget and paid testing unapproved

Use one OpenAI Responses HTTP adapter with Node 24's built-in fetch, not an additional SDK/framework. The fixed endpoint is `https://api.openai.com/v1/responses`. Native calls require explicit trusted `allowPaid` configuration; existing API/CLI exposes no such switch and all development tests inject a fake transport. The selected live model remains a later trusted bootstrap decision. The synthetic `fixture-model` in tests is not an advertised OpenAI model. Official documentation now marks the initially investigated GPT-4.1 Mini as deprecated, so it was not silently selected as a default.

Keep planner/replacement schemas separate from M1's simulated stage outputs. Generate the requested JSON Schema from the same Zod schema used to validate responses. No tools are registered; returned file replacements pass independent preimage/path policy before exposure. Fixed prompts identify version `m2-v1`; instructions in input/output cannot change config/endpoint/budgets. Strict schema checking is a data gate, not proof of correctness or authority.

Bind each provider instance to one run/workspace identity with two attempted requests maximum, one in flight, no retries, ten-second maximum deadline, 16 KiB input, 32 KiB total request, 2048 requested output tokens and 64 KiB response bytes. Bound declared usage to 32768 input/2048 output tokens per reply and require consistent totals. A deadline bounds local waiting, aborts fetch and cancels body consumption when possible; a request may still be billed remotely. These are byte/request/token controls, not a proven currency cap. No paid execution is enabled by this task; live spending needs separate approved pricing/budgets and a compatible model.

Keys are explicit trusted constructor inputs, never ambient environment reads, prompts, worker inputs or invocation records. Discard raw exceptions/errors. Reject exact credential echoes both before and after structured decoding, including JSON-escaped echoes. This is not a general secret scanner. Invocation records hold local UUIDs, run/workspace/model/template/stage identities, response hash, transport `fake`/`network`, and provider-reported usage or null. Fixture usage counts must never be added to Codex account usage or presented as measured live consumption.

Two test-first regressions exposed escaped-key echo acceptance and an uncancelled hanging fake response stream; both were corrected before final verification. No model or API network call was needed. Live compatibility, account access, currency budget and a complete durable workflow remain unverified here.

References: [increment spec](../../specs/internal/m2-provider-adapter.md), [official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs), [model status inspected](https://developers.openai.com/api/docs/models/gpt-4.1-mini).
