import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  parseCheckRequest,
  redactDiagnostics,
  passingRound,
  runCheck,
} from '../src/verification.js';
import { SAMPLE_FILES } from '../src/sample.js';
const request = () => ({
  check: 'typecheck',
  attempt: 0,
  workspaceId: randomUUID(),
  files: SAMPLE_FILES,
});
await test('unknown commands, arguments, cwd and unsafe targets are rejected before Docker', async () => {
  for (const input of [
    { ...request(), check: 'shell' },
    { ...request(), args: ['--fix'] },
    { ...request(), cwd: '/' },
    {
      ...request(),
      files: [
        {
          path: 'package.json',
          content: '{"scripts":{"postinstall":"fetch credentials"}}',
        },
      ],
    },
    { ...request(), files: [{ path: '../secret.ts', content: '' }] },
    { ...request(), attempt: 3 },
  ]) {
    assert.throws(() => parseCheckRequest(input), /^Error: CHECK_DENIED$/);
    await assert.rejects(
      runCheck(input, new AbortController().signal),
      /^Error: CHECK_DENIED$/,
    );
  }
});
await test('diagnostics redact tested keys/bearers/URL credentials and remove terminal escapes', () => {
  const text = redactDiagnostics(
    '\u001b[31mBearer token-secret https://user:password@local.invalid sk-fixture-secret-value\u001b[0m',
  );
  for (const secret of [
    'token-secret',
    'user:password',
    'sk-fixture-secret-value',
    '\u001b',
  ])
    assert.ok(!text.includes(secret));
  assert.ok(text.includes('[REDACTED]'));
});
await test('missing, duplicate, stale or uncaptured required checks cannot pass', () => {
  for (const results of [
    [],
    null,
    [{ check: 'format', outcome: 'pass' }],
    Array(4).fill({ check: 'format', outcome: 'pass' }),
  ])
    assert.equal(passingRound(results, 'a'.repeat(64), 0), false);
});
