import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  localConfig,
  parseMarkdown,
  type SandboxExecution,
} from '@forgets/contracts';
import { PgRepository, migrate } from '../src/index.js';
const config = localConfig({
  FORGETS_ENV: 'test',
  FORGETS_DB_PASSWORD: process.env.FORGETS_DB_PASSWORD,
});
const spec = parseMarkdown(
  '# Test\n## Goal\nPersist sandbox provenance\n## Requirements\n- Preserve mock history\n## Acceptance Criteria\n- Single owner\n## Constraints\n- Disposable database',
);
const execution = (): SandboxExecution => ({
  target: 'nest-greeting-v1',
  workspaceId: randomUUID(),
  targetHash: 'a'.repeat(64),
  providerAttempts: 0,
  invocations: [],
  plan: null,
  implementation: null,
  tool: null,
  artifact: null,
});
await test('additive sandbox persistence shares admission, preserves mock history and recovers without replay', async () => {
  await migrate(config);
  let repo = new PgRepository(config);
  await repo.start();
  try {
    const historical = await repo.admit(spec, randomUUID(), 'a'.repeat(64));
    await repo.save(historical.run, 'FAILED', [], null, 'MOCK_FAILURE');
    const key = randomUUID();
    const created = await repo.admitSandbox(
      spec,
      key,
      'b'.repeat(64),
      execution(),
    );
    assert.equal(created.run.mode, 'sandbox-fixture');
    await assert.rejects(repo.admit(spec, randomUUID(), 'c'.repeat(64)), {
      message: 'BUSY',
    });
    assert.equal((await repo.get(historical.run.id)).mode, 'mock');
    assert.equal(
      (await repo.admitSandbox(spec, key, 'b'.repeat(64), execution())).created,
      false,
    );
    await repo.assertOwner();
    await repo.close();
    repo = new PgRepository(config);
    await repo.start();
    const recovered = await repo.get(created.run.id);
    assert.equal(recovered.state, 'FAILED');
    assert.equal(recovered.report?.mode, 'sandbox-fixture');
    assert.equal(recovered.report?.error, 'INTERRUPTED');
    assert.equal(
      recovered.execution?.workspaceId,
      created.run.execution?.workspaceId,
    );
    assert.equal((await repo.get(historical.run.id)).mode, 'mock');
  } finally {
    await repo.close();
  }
});
