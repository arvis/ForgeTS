import { test } from 'node:test';

await test('compiled core package resolves through its public ESM export', async () => {
  await import('@forgets/core');
});
