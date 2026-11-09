# M1a: Contracts, Markdown input, and local configuration policy

Status: authorized as part of the human's 2026-11-09 instruction to implement M1 after reading its specs.

Implement strict Zod contracts, a data-only Markdown parser, explicit domain errors, centrally checked transitions, bounded pagination, and development/test configuration validation. No executor exists. Markdown uses one title and the four exact sections `Goal`, `Requirements`, `Acceptance Criteria`, and `Constraints`; list sections contain Markdown bullets. Invalid/missing/unknown fields and oversized UTF-8 inputs fail before admission.

Acceptance: unhappy-path tests first cover malformed specs, attempted permission fields/live mode, illegal transitions, invalid cursors/limits, public binding, remote/ambiguous database settings, and test configuration targeting demo data. Successful examples and strict compilation pass. Config accepts only explicit loopback PostgreSQL endpoints: development `forgets/forgets` on 5433, test `forgets_test/forgets_test` on 5434. Passwords must be supplied and are never included in errors. No arbitrary URL or ambient PostgreSQL variables are forwarded.

Core consumes a repository interface; contracts have no framework/database dependency. Subsequent specs add actual persistence, orchestration, and transport. Run and record red/green checks, update the build/input logs, and make a scoped local commit. This authorization supersedes the old M0-only checkpoint; stop before M2.
