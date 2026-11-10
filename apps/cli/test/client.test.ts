import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runCli } from '../src/client.js';
await test('CLI denies production endpoint and unsupported execution/approval commands before IO', async () => {
  await assert.rejects(
    runCli(['list'], { FORGETS_API_URL: 'https://production.example' }),
    { message: 'CONFIG' },
  );
  await assert.rejects(runCli(['approve', 'x']), { message: 'VALIDATION' });
  await assert.rejects(runCli(['exec', 'rm']), { message: 'VALIDATION' });
});
