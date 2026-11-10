import assert from 'node:assert/strict';
import { test } from 'node:test';
import { request as httpRequest } from 'node:http';
import { localConfig } from '@forgets/contracts';
import { FactoryService, type Repository } from '@forgets/core';
import { createApi } from '../src/index.js';
const config = localConfig({
  FORGETS_ENV: 'test',
  FORGETS_DB_PASSWORD: 'must-never-appear',
  FORGETS_PORT: '4312',
});
await test('HTTP rejects invalid requests before touching persistence and sanitizes unknown failures', async (t) => {
  let calls = 0;
  const trap = () => {
    calls++;
    throw new Error('password=must-never-appear');
  };
  const repository: Repository = {
    admit: trap,
    get: trap,
    save: trap,
    list: trap,
    events: trap,
  };
  const service = new FactoryService(repository, () => Promise.resolve({}));
  const app = await createApi(service, repository, config);
  t.after(async () => {
    await app.close();
    await service.close();
  });
  const url = await app.getUrl();
  for (const [path, options, status] of [
    [
      '/runs',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{broken',
      },
      400,
    ],
    [
      '/runs',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'live',
          markdown: 'x',
          idempotencyKey: 'x',
        }),
      },
      400,
    ],
    ['/runs?limit=101', {}, 400],
    ['/runs?cursor=invalid', {}, 400],
    ['/runs/not-a-uuid', {}, 400],
    ['/runs', { headers: { origin: 'https://production.example' } }, 403],
    [
      '/runs',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'x'.repeat(140_000),
      },
      413,
    ],
    [
      '/runs/00000000-0000-4000-8000-000000000000/approve',
      { method: 'POST' },
      404,
    ],
  ] as const) {
    const response = await fetch(url + path, options);
    assert.equal(response.status, status, path);
    assert.equal((await response.text()).includes('must-never-appear'), false);
  }
  const hostStatus = await new Promise<number>((resolve, reject) => {
    const request = httpRequest(
      url + '/runs',
      { headers: { host: 'production.example' } },
      (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode ?? 0));
      },
    );
    request.on('error', reject);
    request.end();
  });
  assert.equal(hostStatus, 403);
  assert.equal(calls, 0);
  const response = await fetch(url + '/runs');
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'INTERNAL' });
});
