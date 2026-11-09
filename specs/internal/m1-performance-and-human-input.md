# Planning follow-up: Performance coverage and human input

Status: specified before documentation changes on 2026-11-09; documentation completed and verified. M1 implementation remains unauthorized.

## Goal

Respond to the human's questions about load testing and visible attribution of their input. Make basic database efficiency and bounded performance checks explicit in the M1 draft, and preserve a concise record of substantive human questions and directions for portfolio readers. Continue the authorized M1 recommendations/documentation work without adding runtime code.

## Plan and acceptance criteria

1. Add a human-input record linking questions and directions to resulting specs, ADRs, and evidence. Clearly distinguish explicit instructions, clarifying questions, and agent proposals awaiting a decision. Include the frontend, CSS, scaling, indexes, load-testing, safety, and development-process discussions; do not infer approval from questions.
2. Link the record from README/build log and add a maintenance rule to `AGENTS.md` so future substantive human input remains visible.
3. Add M1 draft requirements for query-driven indexes, bounded pagination, and a small local mock-backed API/database performance baseline. Define bounded execution, metrics, expected busy/rejection responses, and separate correctness from performance evidence. No load test or database migration is executed by this documentation task.
4. Explain where later performance work fits: M3 resource-limit verification, proposed M5 repeatable baseline reporting, and heavier tests before any later multi-worker scaling. Keep M7 and frontend technology as proposals, without extending the approved charter.
5. Update the existing proposed M1 ADR and build log. Verify formatting, all local Markdown links, unchanged runtime/tooling/charter files, and staged whitespace/scope. Commit this completed documentation spec locally.

## Boundaries

This is a documentation change. M1, database indexes, load-test scripts, frontend, and scaling remain unimplemented. Preserve the M0 review gate and existing open findings. The human-input record summarizes the actual conversation; it must not claim that the human authored agent-proposed designs, approved a milestone, or verified tests they did not run.

## Verification evidence

- `npm run format` and `npm run format:check`: exit 0.
- One-off documentation verification: exit 0; all 49 local Markdown links resolved, the seven intended documentation/instruction changes were confirmed, and the charter remained byte-identical to Git.
- Staged diff inspection and `git diff --cached --check` precede the local commit. No runtime tests or performance measurements are claimed.
