import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { localConfig, validated, FactoryRunSchema } from '@forgets/contracts';
import { FactoryService } from '@forgets/core';
import { PgRepository, migrate } from '@forgets/persistence';
import { mockAgent } from '@forgets/agents';
import { createApi } from '../src/index.js';

const freshFetch = (input: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('connection', 'close');
  return fetch(input, { ...init, headers });
};

await test('real NestJS, PostgreSQL and CLI complete a durable simulated workflow', async (t) => {
  const config = localConfig({
    FORGETS_ENV: 'test',
    FORGETS_DB_PASSWORD: process.env.FORGETS_DB_PASSWORD,
  });
  await migrate(config);
  let repo = new PgRepository(config);
  await repo.start();
  let service = new FactoryService(repo, mockAgent);
  let app = await createApi(service, repo, config);
  t.after(async () => {
    await app.close();
    await service.close();
    await repo.close();
  });
  let url = await app.getUrl();
  const markdown = await readFile(
    fileURLToPath(
      new URL('../../../../specs/examples/add-project-api.md', import.meta.url),
    ),
    'utf8',
  );
  const key = randomUUID();
  const post = () =>
    freshFetch(url + '/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ markdown, idempotencyKey: key, mode: 'mock' }),
    });
  const first = await post();
  assert.equal(first.status, 201);
  const admitted = (await first.json()) as { run: unknown };
  const run = validated(FactoryRunSchema, admitted.run);
  const finished = validated(
    FactoryRunSchema,
    await (await freshFetch(url + `/runs/${run.id}/wait`)).json(),
  );
  assert.equal(finished.state, 'AWAITING_HUMAN_APPROVAL');
  assert.equal(finished.report?.mergeReady, false);
  const again = await post();
  assert.equal(again.status, 201);
  const duplicate = (await again.json()) as { run: unknown; created: boolean };
  assert.equal(duplicate.created, false);
  assert.equal(validated(FactoryRunSchema, duplicate.run).id, run.id);
  const conflict = await freshFetch(url + '/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      markdown: markdown.replace('Add project creation', 'Different feature'),
      idempotencyKey: key,
    }),
  });
  assert.equal(conflict.status, 409);
  await app.close();
  await service.close();
  await repo.close();
  repo = new PgRepository(config);
  await repo.start();
  service = new FactoryService(repo, mockAgent);
  app = await createApi(service, repo, config);
  url = await app.getUrl();
  const restored = validated(
    FactoryRunSchema,
    await (await freshFetch(url + `/runs/${run.id}`)).json(),
  );
  assert.deepEqual(restored.report, finished.report);
  assert.equal(restored.state, 'AWAITING_HUMAN_APPROVAL');
  const events = (await (
    await freshFetch(url + `/runs/${run.id}/events?limit=100`)
  ).json()) as { items: { sequence: number; state: string }[] };
  assert.deepEqual(
    events.items.map((event) => event.sequence),
    [0, 1, 2, 3, 4, 5, 6],
  );
  const cli = fileURLToPath(
    new URL('../../../cli/dist/src/index.js', import.meta.url),
  );
  const command = await promisify(execFile)(
    process.execPath,
    [cli, 'inspect', run.id],
    {
      env: { ...process.env, FORGETS_API_URL: url },
      timeout: 10000,
      maxBuffer: 131072,
    },
  );
  assert.equal(
    validated(FactoryRunSchema, JSON.parse(command.stdout) as unknown).id,
    run.id,
  );
  const specPath = fileURLToPath(
    new URL('../../../../specs/examples/add-project-api.md', import.meta.url),
  );
  const cliRun = await promisify(execFile)(
    process.execPath,
    [cli, 'run', specPath, randomUUID()],
    {
      env: { ...process.env, FORGETS_API_URL: url },
      timeout: 35000,
      maxBuffer: 131072,
    },
  );
  assert.equal(
    validated(FactoryRunSchema, JSON.parse(cliRun.stdout) as unknown).state,
    'AWAITING_HUMAN_APPROVAL',
  );
  await t.test(
    'HTTP cancellation is persisted and stops a hung mock',
    async () => {
      await app.close();
      await service.close();
      let entered: () => void = () => {};
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      service = new FactoryService(repo, () => {
        entered();
        return new Promise(() => {});
      });
      app = await createApi(service, repo, config);
      url = await app.getUrl();
      const response = await freshFetch(url + '/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ markdown, idempotencyKey: randomUUID() }),
      });
      const data = (await response.json()) as { run: unknown };
      const pending = validated(FactoryRunSchema, data.run);
      await started;
      const cancellation = validated(
        FactoryRunSchema,
        await (
          await freshFetch(url + `/runs/${pending.id}/cancel`, {
            method: 'POST',
          })
        ).json(),
      );
      assert.equal(cancellation.state, 'CANCELLED');
      assert.equal((await repo.get(pending.id)).report?.error, 'CANCELLED');
    },
  );
  await t.test(
    'real HTTP wait observes a persisted deadline failure',
    async () => {
      await app.close();
      await service.close();
      service = new FactoryService(repo, () => new Promise(() => {}), {
        deadlineMs: 20,
      });
      app = await createApi(service, repo, config);
      url = await app.getUrl();
      const response = await freshFetch(url + '/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ markdown, idempotencyKey: randomUUID() }),
      });
      const data = (await response.json()) as { run: unknown };
      const pending = validated(FactoryRunSchema, data.run);
      const failed = validated(
        FactoryRunSchema,
        await (await freshFetch(url + `/runs/${pending.id}/wait`)).json(),
      );
      assert.equal(failed.state, 'FAILED');
      assert.equal(failed.report?.error, 'DEADLINE');
    },
  );
});
