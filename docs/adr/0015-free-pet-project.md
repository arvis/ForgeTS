# ADR 0015: Free, offline pet project

Status: accepted by human direction, 2026-11-10. Supersedes paid/native provider enablement in ADR 0010 and the original M2 live acceptance requirement.

ForgeTS is a learning project with no authorized spending. Its supported runtime uses deterministic injected provider fixtures and real local isolated tools. Native provider dispatch has no fetch fallback, and configuration rejects `allowPaid: true`. No API key, paid subscription, hosted database, paid deployment or paid evaluation is required. Existing synthetic fixture keys are parser fixtures, not credentials.

M2 completion now uses fake inference plus the recorded actual isolated edits and persistence evidence. Live inference was never performed and is not claimed as passed. This is an explicit scope revision, not evidence that fixtures behave like a real model. Future milestones remain free/offline; a genuinely local model could be separately specified, but no model downloads or integration are included here.

Injected transports remain trusted development code: arbitrary host code could access networks independently. This guard removes the shipped native dispatch and paid enablement; it is not a host-wide spending or network firewall. Existing worker isolation remains unchanged. Codex development account usage is separate and cannot be measured or made free by this project policy.
