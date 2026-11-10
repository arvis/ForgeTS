import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runSandboxCli } from '../src/sandbox.js';
await test('fixture CLI rejects flags, arbitrary targets and production configuration before file/database access', async () => {
  for (const args of [
    [],
    ['--live'],
    ['spec.md', 'key', '--paid'],
    ['spec.md', '../invalid'],
  ])
    await assert.rejects(runSandboxCli(args, {}), { message: 'VALIDATION' });
  await assert.rejects(
    runSandboxCli(['spec.md'], {
      FORGETS_DB_PASSWORD: 'x',
      FORGETS_DB_HOST: 'production',
    }),
    { message: 'CONFIG' },
  );
});
