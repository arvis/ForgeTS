# M2 provider adapter and fake transport tests

Status: implemented and verified with fake transports, 2026-11-10. Paid testing is explicitly blocked by the human; M2 remains incomplete.

Implement one OpenAI Responses HTTP adapter behind a typed provider port, with planner/replacement schemas separate from M1's simulated outputs. Use Node's built-in fetch rather than introduce an SDK. Live model selection remains a trusted bootstrap input requiring later approval; no deprecated/default model is silently selected. Deterministic tests use an injected fake transport and synthetic model identifier, explicitly labeled as fixture provenance.

## Acceptance criteria

- Add strict bounded role request/output contracts and a typed invocation record carrying run/workspace/invocation IDs, model/template/stage, response hash, transport provenance and provider-reported token usage or null. Preserve all M1 contracts and tests unchanged.
- Fix the endpoint to HTTPS OpenAI Responses; disable redirects/storage/tools/streaming. Native transport is disabled unless trusted configuration explicitly enables paid calls; do not add a live CLI/API switch in this increment. Never read ambient credentials or send keys into worker/prompt/persisted results.
- Bound a provider instance to a single run/workspace, two attempted requests total, one in flight, 16 KiB serialized input, 2048 requested output tokens, 64 KiB response bytes and a deadline at most ten seconds. Consume attempts before dispatch and never retry automatically. Timeout/cancellation terminates local waiting even if a fake ignores AbortSignal; abort the transport and cancel its body when possible. Provider cancellation cannot prove remote billing stopped.
- Reject unknown modes/providers/configuration fields, missing credentials/model, malformed/truncated/refused/non-text/wrong-stage/schema-invalid responses, invalid usage counts and oversized data. Emit only fixed diagnostics and retain neither raw exceptions nor secrets. Requests/spec/model output cannot change endpoint, credentials, budgets or tool capabilities. Validate implementation replacements against source snapshot/preimage policy before returning them.
- Write unhappy-path tests first and observe expected behavioral failures after successful compilation. Fake tests cover denied native calls without sending network traffic, malformed/error responses, timeout/cancellation, concurrent/attempt/input/output budgets, secret sanitization, usage absence/presence and correct versioned request generation. Add no paid calls and do not imply provider fixtures are a live demonstration.
- Run repository verification, update design/evidence/build log, and commit the completed increment locally. Full durable M2 workflow integration and live acceptance remain separate; stop before M3.

## Actual verification

The initial six tests compiled and failed against missing-behavior placeholders. Two additional regression tests first reproduced escaped-credential echo acceptance and a hanging response body that was not cancelled. After fixes, all eight provider tests passed. `npm run verify` passed all 34 unit/HTTP tests and format/build/lint/strict typechecks. One intermediate unused-variable lint error was fixed without suppressing rules. No provider network traffic or paid request was used. Fixture usage numbers are test data, not measured account/runtime consumption.
