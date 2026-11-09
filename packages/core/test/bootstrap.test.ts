import { test } from 'node:test';

test('compiled core package resolves through its public ESM export', async () => {
  await import('@forgets/core');
});
