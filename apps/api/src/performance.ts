import { randomUUID } from 'node:crypto';
import { cpus, totalmem, platform } from 'node:os';
import { performance } from 'node:perf_hooks';
import {
  localConfig,
  DomainError,
  fail,
  parseMarkdown,
  validated,
  FactoryRunSchema,
} from '@forgets/contracts';
import { FactoryService } from '@forgets/core';
import { PgRepository, migrate } from '@forgets/persistence';
import { mockAgent } from '@forgets/agents';
import { createApi } from './index.js';

async function baseline() {
  const config = localConfig(process.env);
  if (config.purpose !== 'test') fail('CONFIG');
  await migrate(config);
  const repository = new PgRepository(config);
  const service = new FactoryService(repository, mockAgent);
  let app: Awaited<ReturnType<typeof createApi>> | undefined;
  try {
    await repository.start();
    const markdown =
      '# Baseline\n## Goal\nMeasure mock workflow\n## Requirements\n- Remain local\n## Acceptance Criteria\n- Preserve consistency\n## Constraints\n- Mock only';
    parseMarkdown(markdown);
    const seeded: string[] = [];
    for (let i = 0; i < 32; i++) {
      const admitted = await service.submit({
        markdown,
        idempotencyKey: `m1-baseline-seed-${i}`,
      });
      const result = await service.wait(admitted.run.id);
      if (
        result.state !== 'AWAITING_HUMAN_APPROVAL' ||
        result.report?.mergeReady !== false
      )
        fail('MOCK_FAILURE');
      seeded.push(result.id);
    }
    const dataset = await repository.pool.query<{
      state: string;
      count: string;
    }>(
      'SELECT state,count(*)::text FROM factory_runs GROUP BY state ORDER BY state',
    );
    const databaseVersion = await repository.pool.query<{ version: string }>(
      'SELECT version()',
    );
    await repository.pool.query('ANALYZE factory_runs');
    const historyPlan = await repository.pool.query(
      'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM factory_runs ORDER BY created_at DESC,id DESC LIMIT 20',
    );
    const statePlan = await repository.pool.query(
      'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM factory_runs WHERE state=$1 ORDER BY created_at DESC,id DESC LIMIT 20',
      ['AWAITING_HUMAN_APPROVAL'],
    );
    const eventPlan = await repository.pool.query(
      'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT data FROM factory_events WHERE run_id=$1 AND sequence>$2 ORDER BY sequence LIMIT 21',
      [seeded[0], -1],
    );
    app = await createApi(service, repository, config);
    const url = await app.getUrl();
    const sampleId = seeded[0];
    if (!sampleId) fail('MOCK_FAILURE');
    const start = performance.now();
    const cpu = process.cpuUsage();
    const rssStart = process.memoryUsage().rss;
    const key = `m1-baseline-${randomUUID()}`;
    const ids = new Set<string>();
    const samples: { endpoint: string; ms: number; classification: string }[] =
      [];
    let next = 0;
    const send = async (index: number, warmup: boolean) => {
      if (performance.now() - start >= 60_000) fail('DEADLINE');
      let path = '/runs?limit=20';
      let body: unknown;
      let expectedInvalid = false;
      if (!warmup && index % 40 === 3) {
        path = '/runs';
        body = { markdown, idempotencyKey: key, mode: 'live' };
        expectedInvalid = true;
      } else if (!warmup && (index % 10 === 0 || index % 25 === 0)) {
        path = '/runs';
        body = {
          markdown,
          idempotencyKey: index % 25 === 0 ? `${key}-${index}` : key,
          mode: 'mock',
        };
      } else if (!warmup && index % 10 === 1)
        path = `/runs/${sampleId}/events?limit=20`;
      else if (!warmup && index % 10 === 2) path = `/runs/${sampleId}`;
      const at = performance.now();
      const response = await fetch(url + path, {
        method: body ? 'POST' : 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(5000, 60000 - (performance.now() - start))),
        ),
        ...(body
          ? {
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {}),
      });
      const data = (await response.json()) as unknown;
      let classification = 'read';
      if (expectedInvalid) {
        if (response.status !== 400) fail('MOCK_FAILURE');
        classification = 'expected-validation';
      } else if (response.status === 409) {
        if (
          !data ||
          typeof data !== 'object' ||
          !('error' in data) ||
          data.error !== 'BUSY'
        )
          fail('MOCK_FAILURE');
        classification = 'expected-busy';
      } else if (body) {
        if (
          response.status !== 201 ||
          !data ||
          typeof data !== 'object' ||
          !('run' in data) ||
          !('created' in data) ||
          typeof data.created !== 'boolean'
        )
          fail('MOCK_FAILURE');
        const run = validated(FactoryRunSchema, data.run);
        ids.add(run.id);
        classification = data.created ? 'accepted' : 'idempotent';
      } else if (response.status !== 200) fail('MOCK_FAILURE');
      if (!warmup)
        samples.push({
          endpoint: path.startsWith('/runs?')
            ? 'history'
            : path.includes('/events?')
              ? 'events'
              : body
                ? 'submit'
                : 'inspect',
          ms: performance.now() - at,
          classification,
        });
    };
    for (let i = 0; i < 10; i++) await send(i, true);
    const measuredAt = new Date().toISOString();
    const measuredStart = performance.now();
    await Promise.all(
      Array.from({ length: 5 }, async () => {
        while (next < 190) {
          const index = next++;
          await send(index, false);
        }
      }),
    );
    const measuredEnd = new Date().toISOString();
    const elapsedMs = performance.now() - measuredStart;
    let completed = 0;
    for (const id of ids) {
      const run = await service.wait(id);
      if (
        run.state !== 'AWAITING_HUMAN_APPROVAL' ||
        run.report?.mergeReady !== false
      )
        fail('MOCK_FAILURE');
      if (run.updatedAt <= measuredEnd) completed++;
      const events = await repository.events(id, {
        limit: 100,
        after: -1,
        cursor: undefined,
        state: undefined,
      });
      if (events.items.length !== 7) fail('MOCK_FAILURE');
    }
    const usage = process.cpuUsage(cpu);
    const summary = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        samples: sorted.length,
        p50Ms: sorted[Math.max(0, Math.ceil(sorted.length * 0.5) - 1)] ?? null,
        p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? null,
      };
    };
    return {
      mode: 'mock',
      at: measuredAt,
      endedAt: measuredEnd,
      profile: {
        warmupRequests: 10,
        measuredRequests: samples.length,
        maxClients: 5,
        maxRequests: 200,
        maxElapsedMs: 60000,
        seedRecords: 32,
        mix: 'history, inspect, events, repeated/distinct submits, invalid live mode',
        latencyThreshold: 'baseline only; no invented performance SLO',
        failureGate:
          'unexpected status, inconsistency, unhandled error, or budget overrun',
      },
      elapsedMs,
      requestRatePerSecond: samples.length / (elapsedMs / 1000),
      completedNewRunsAtMeasurementEnd: completed,
      completedRunRatePerSecond: completed / (elapsedMs / 1000),
      classifications: Object.fromEntries(
        [...new Set(samples.map((s) => s.classification))].map((kind) => [
          kind,
          samples.filter((s) => s.classification === kind).length,
        ]),
      ),
      latency: summary(samples.map((s) => s.ms)),
      endpoints: Object.fromEntries(
        [...new Set(samples.map((s) => s.endpoint))].map((endpoint) => [
          endpoint,
          summary(
            samples.filter((s) => s.endpoint === endpoint).map((s) => s.ms),
          ),
        ]),
      ),
      unexpectedErrors: 0,
      environment: {
        node: process.version,
        os: platform(),
        logicalCpus: cpus().length,
        cpu: cpus()[0]?.model ?? 'unavailable',
        hostMemoryBytes: totalmem(),
        database: databaseVersion.rows[0]?.version,
        process: 'API and load client share this Node process',
        cpuUserMs: usage.user / 1000,
        cpuSystemMs: usage.system / 1000,
        rssStartBytes: rssStart,
        rssEndBytes: process.memoryUsage().rss,
        databaseCpuMemory: 'not measured',
      },
      dataset: dataset.rows,
      queryPlans: {
        history: historyPlan.rows,
        stateHistory: statePlan.rows,
        events: eventPlan.rows,
      },
      limitations: [
        'Synthetic small local dataset; no production capacity claim.',
        'Agent work/verification simulated; no generated code or paid provider.',
        'Expected rejections excluded from successful-run throughput.',
        'No stable latency regression threshold established yet.',
      ],
    };
  } finally {
    if (app) await app.close();
    await service.close();
    await repository.close();
  }
}
await baseline().then(
  (result) => process.stdout.write(JSON.stringify(result, null, 2) + '\n'),
  (error) => {
    process.stderr.write(
      `${error instanceof DomainError ? error.code : 'BASELINE_FAILED'}\n`,
    );
    process.exitCode = 1;
  },
);
