# Optional M7: Scaling and load testing

Status: roadmap/spec addition requested by the human on 2026-11-09. Implementation is future optional work and requires separate authorization. No load tests have run.

## Goal and scope

Add explicit load testing to the proposed scaling milestone after M6 in [the roadmap](../../docs/PLAN.md). Preserve M1's small mock-backed API/database baseline and normal query/index engineering. M7 evaluates increased workload and any multi-worker design against measured capacity, correctness, recovery, and isolation requirements.

The human authorized this planning update. Detailed queue/worker architecture, tools, workload targets, and performance thresholds remain decisions for the implementation spec. This document does not authorize M1, M7, deployment, production traffic, or paid provider calls.

## Planned work

- Establish a reproducible single-worker baseline, then compare any bounded multi-worker configuration using the same documented workload and resources. Introduce durable jobs and worker ownership only when justified by requirements and measurements.
- Define average-load, stress, spike, and soak profiles. Record the scenario mix, dataset, arrival rate/client concurrency, worker count, warm-up, duration, maximum requests, resource/cost ceilings, abort conditions, and pass/fail thresholds before execution.
- Start with deterministic mock providers and a dedicated disposable environment. Production endpoints, personal data, and production credentials are excluded. Real providers require separate opt-in permission and explicit spending limits.
- Measure API p50/p95/p99 latency and unexpected errors, admission/backpressure responses, queue depth/wait time if a queue exists, successful completed runs per interval, end-to-end run duration, and database/worker resource usage where available. Record sample counts and separate expected rejections from errors and successful work.
- Exercise idempotency, bounded admission, duplicate delivery, cancellation, worker interruption/restart, job ownership, and recovery under pressure. Verify that no run executes twice concurrently, no committed state/event evidence is lost, and one worker cannot access another worker's workspace or credentials.
- Investigate measured bottlenecks with query plans and resource observations. Compare changes against the same baseline, including index/write costs. Avoid introducing infrastructure or changing thresholds just to produce a passing report.
- Retain scripts, configuration, raw results, tool versions, environment/resource details, and an honest summary of measured limits. No benchmark numbers or throughput guarantees may be inferred from unexecuted tests.

## Acceptance criteria for implementation

1. Approved workload profiles execute within enforced request, duration, resource, and cost budgets against approved disposable test targets. Invalid targets and missing budgets fail before traffic is generated.
2. Average-load, stress, spike, and soak results record actual measurements and predetermined threshold outcomes. Mock and live-provider results, if separately authorized, are labelled distinctly.
3. Admission/backpressure and recovery preserve run/event consistency and idempotency during overload and worker failures. Correctness and isolation violations fail the campaign regardless of latency/throughput.
4. The report compares reproducible baseline and candidate configurations, explains bottlenecks and remaining limits, and identifies the tested operating envelope without claiming production readiness.
5. Human review is required before raising operational concurrency or adopting the measured configuration. M2/M3 containment requirements remain prerequisites for any real generated-code execution.

## This documentation task

Add the optional milestone to the roadmap, cross-link it from M1 and the proposed architecture ADR, update the human-input/build records, and verify formatting, local links, staged scope, and whitespace. Change no runtime, dependency, or tooling files; run no load tests. Commit only this planning update locally. Verification evidence will be recorded in the build log before handoff.
