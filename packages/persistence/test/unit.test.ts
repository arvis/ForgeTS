import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localConfig } from '@forgets/contracts';
await test('demo targets cannot be reclassified as disposable test databases', () => {
  assert.throws(
    () =>
      localConfig({
        FORGETS_ENV: 'test',
        FORGETS_DB_NAME: 'forgets',
        FORGETS_DB_PASSWORD: 'secret',
      }),
    { message: 'CONFIG' },
  );
});
