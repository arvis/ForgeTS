import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runVerificationCli } from '../src/verification.js';
await test('verification CLI denies command/budget/model switches and production config before IO', async () => {
  for (const args of [
    [],
    ['--live'],
    ['file.md', 'shell'],
    ['file.md', 'repair', 'key', '--repairs=99'],
    ['file.md', 'repair', '../key'],
  ])
    await assert.rejects(runVerificationCli(args, {}), {
      message: 'VALIDATION',
    });
  await assert.rejects(
    runVerificationCli(['file.md'], {
      FORGETS_DB_PASSWORD: 'x',
      FORGETS_DB_HOST: 'production',
    }),
    { message: 'CONFIG' },
  );
});
