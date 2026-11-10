import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { FactoryRunSchema } from '../src/index.js';
const at = new Date().toISOString();
const mock = {
  id: randomUUID(),
  key: 'history',
  inputHash: 'a'.repeat(64),
  mode: 'mock',
  spec: {
    title: 'Old',
    goal: 'Preserve',
    requirements: ['History'],
    acceptanceCriteria: ['Readable'],
    constraints: ['Mock'],
  },
  state: 'FAILED',
  version: 1,
  createdAt: at,
  updatedAt: at,
  outputs: [],
  report: null,
};
await test('rejects missing sandbox evidence and cross-mode or unverified promotion', () => {
  for (const value of [
    { ...mock, mode: 'sandbox-fixture' },
    { ...mock, state: 'IMPLEMENTED_UNVERIFIED' },
    {
      ...mock,
      report: {
        mode: 'sandbox-fixture',
        mergeReady: false,
        outcome: 'FAILED',
        outputs: [],
        error: null,
        limitations: ['Unverified'],
      },
    },
  ])
    assert.equal(FactoryRunSchema.safeParse(value).success, false);
  assert.deepEqual(FactoryRunSchema.parse(mock), mock);
});
