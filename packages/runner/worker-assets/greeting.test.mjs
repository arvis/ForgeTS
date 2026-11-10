import assert from 'node:assert/strict';
import { test } from 'node:test';
test('approved greeting contract', async () => {
  const { GreetingController } = await import('/workspace/out/main.js');
  assert.deepEqual(new GreetingController().greeting(), {
    message: 'Hello from the sandbox',
  });
});
