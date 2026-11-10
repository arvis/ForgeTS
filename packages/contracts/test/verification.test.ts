import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transition } from '../src/index.js';
await test('real verification continuation and repair transitions are explicit without approval shortcuts', () => {
  assert.throws(() => transition('FAILED', 'VERIFYING'), {
    message: 'TRANSITION',
  });
  assert.throws(() => transition('REPAIRING', 'AWAITING_HUMAN_APPROVAL'), {
    message: 'TRANSITION',
  });
  assert.equal(transition('IMPLEMENTED_UNVERIFIED', 'VERIFYING'), 'VERIFYING');
  assert.equal(transition('VERIFYING', 'REPAIRING'), 'REPAIRING');
  assert.equal(transition('REPAIRING', 'IMPLEMENTING'), 'IMPLEMENTING');
  assert.equal(
    transition('VERIFYING', 'VERIFIED_AWAITING_REVIEW'),
    'VERIFIED_AWAITING_REVIEW',
  );
});
