# ADR 0013: Explicit verified handoff and durable repair attempts

- Date: 2026-11-10
- Status: implementation decision before durable repair code; M3 review follows completion

Continue an M2 `IMPLEMENTED_UNVERIFIED` record only through an explicit M3 operation while holding the shared database owner lock. Reconstruct and validate the approved source snapshot from its before/after artifact. Keep original M2 invocation/tool evidence intact and add versioned verification evidence containing current source/hash, selected toolchain, rounds, repair attempts and final artifact. Never transform M1 simulated output into real verification.

Add centralized transitions from implemented-unverified to verifying, verifying to repairing, repairing to implementing, implementing to fresh verifying, and verifying to terminal `VERIFIED_AWAITING_REVIEW`. This checkpoint awaits M4's actual review/approval work; it is not an approval state and always reports merge readiness false. Extend SQL active-run admission to include repairing. Preserve old states/modes through additive migrations.

Use atomic same-state evidence checkpoints with optimistic version/event updates, separate from normal transition validation. Persist each pending round before tools, each observed check, each counted repair before provider invocation, and the proposed patch before application. Validate source/attempt/workspace/toolchain/command identities and recompute artifacts. Missing evidence or unknown containment stops immediately. Invalid/failed repair consumes one attempt and terminates; a valid but ineffective repair can consume the second attempt. Maximums are two repairs, three rounds and twelve required check results under the prior 180-second deadline and bounded cleanup.

The repair port is deliberately fake-only for this milestone. It receives bounded validated context, source/diff and sanitized diagnostics; it cannot change commands, budgets, endpoints or credentials. Replies must echo trusted invocation/run/workspace identities and carry explicit fake provenance/null usage. This is not a new paid provider integration. Actual source edits remain brokered Docker operations; every accepted repair invalidates previous eligibility and reruns all four real gates.

Restart fails active/uncertain work without replay, marks pending repair/tool evidence unknown and retains known attempts/results. Explicit idempotent reruns return a completed or interrupted record rather than executing the same repair twice. A failed evidence transaction or ownership uncertainty is surfaced as persistence failure; no terminal state is claimed durable unless observed. The fixed-scenario CLI creates M2 fixtures and continues them under the same owner, so another local service cannot overlap admission.

The human subsequently authorized local milestone merges and reserved pushes to themselves. Merge authorization accepts integrating M2's documented offline state, not claiming its live test passed. A separate workflow spec records the standing rule. Stop after M3; no M4, provider credits or remote writes.

References: [repair spec](../../specs/internal/m3b-bounded-repair.md), [check budgets](0012-m3-verification-budgets.md), [M3 evidence](../m3-verification.md).
