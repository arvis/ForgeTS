import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { SAMPLE_FILES } from '../src/sample.js';
await test('in-memory approved fixture matches the trusted sample without runtime target traversal', async () => {
  const source = await readFile(
    new URL('../../../../apps/sample-app/src/main.ts', import.meta.url),
    'utf8',
  );
  assert.equal(source.replace(/\r\n/g, '\n'), SAMPLE_FILES[0]!.content);
});
