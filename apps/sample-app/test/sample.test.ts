import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GreetingController } from '../src/main.js';
await test('trusted sample exposes the expected greeting without starting a listener on import', () => {
  assert.deepEqual(new GreetingController().greeting(), {
    message: 'Hello from ForgeTS',
  });
});
