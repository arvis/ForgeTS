import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  FactoryRunSchema,
  localConfig,
  parseMarkdown,
  sourceDigest,
  type VerificationEvidence,
} from '@forgets/contracts';
import { migrate, PgRepository } from '../src/index.js';
const config = localConfig({
  FORGETS_ENV: 'test',
  FORGETS_DB_PASSWORD: process.env.FORGETS_DB_PASSWORD,
});
const spec = parseMarkdown(
  '# Evidence\n## Goal\nAtomic checkpoints\n## Requirements\n- Preserve attempts\n## Acceptance Criteria\n- No replay\n## Constraints\n- Disposable database only',
);
await test('M3 checkpoints are atomic, repairing owns admission and interrupted attempts are not replayed', async () => {
  await migrate(config);
  let repo = new PgRepository(config);
  await repo.start();
  try {
    const old = await repo.admit(spec, randomUUID(), 'a'.repeat(64));
    await repo.save(old.run, 'FAILED', [], null, 'MOCK_FAILURE');
    await assert.rejects(repo.record(await repo.get(old.run.id)), {
      message: 'VALIDATION',
    });
    const fixture = FactoryRunSchema.parse(
      JSON.parse(
        await readFile(
          new URL('../../../../docs/evidence/m2-fixture.json', import.meta.url),
          'utf8',
        ),
      ) as unknown,
    );
    const workspaceId = randomUUID();
    const execution = {
      ...fixture.execution!,
      workspaceId,
      providerAttempts: 0,
      invocations: [],
      plan: null,
      implementation: null,
      tool: null,
      artifact: null,
    };
    let run = (
      await repo.admitSandbox(spec, randomUUID(), 'b'.repeat(64), execution)
    ).run;
    run = await repo.save(run, 'SPEC_VALIDATED', [], null, null);
    run = await repo.save(run, 'PLANNED', [], null, null);
    run = await repo.save(run, 'IMPLEMENTING', [], null, null);
    const complete = {
      ...fixture.execution!,
      workspaceId,
      invocations: fixture.execution!.invocations.map((value) => ({
        ...value,
        id: randomUUID(),
        runId: run.id,
        workspaceId,
      })),
    };
    run = await repo.save(
      { ...run, execution: complete },
      'IMPLEMENTED_UNVERIFIED',
      [],
      fixture.report,
      null,
    );
    const files = complete.artifact!.changes.map((change) => ({
      path: change.path,
      content: change.after,
    }));
    const v: VerificationEvidence = {
      version: 'm3-v1',
      status: 'running',
      initialHash: sourceDigest(files),
      currentHash: sourceDigest(files),
      currentFiles: files,
      toolchainImageId: null,
      toolchainHash: null,
      repairAttempts: 0,
      rounds: [
        {
          attempt: 0,
          inputHash: sourceDigest(files),
          status: 'pending',
          results: [],
        },
      ],
      repairs: [],
      artifact: complete.artifact!,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    run = await repo.save(
      { ...run, verification: v },
      'VERIFYING',
      [],
      null,
      null,
    );
    const checkpoint = await repo.record(run);
    assert.equal(checkpoint.version, run.version + 1);
    run = checkpoint;
    await repo.pool.query(
      "ALTER TABLE factory_events ADD CONSTRAINT m3_record_failure CHECK (state <> 'VERIFYING') NOT VALID",
    );
    try {
      await assert.rejects(repo.record(run), { message: 'PERSISTENCE' });
      assert.equal((await repo.get(run.id)).version, run.version);
    } finally {
      await repo.pool.query(
        'ALTER TABLE factory_events DROP CONSTRAINT m3_record_failure',
      );
    }
    const repair = {
      attempt: 1,
      invocationId: randomUUID(),
      inputHash: v.currentHash,
      resultHash: null,
      status: 'requested' as const,
      kind: 'fake' as const,
      templateVersion: 'm3-v1' as const,
      usage: null,
      output: null,
      outputHash: null,
      error: null,
    };
    run = await repo.save(
      { ...run, verification: { ...v, repairAttempts: 1, repairs: [repair] } },
      'REPAIRING',
      [],
      null,
      null,
    );
    await assert.rejects(repo.admit(spec, randomUUID(), 'c'.repeat(64)), {
      message: 'BUSY',
    });
    await repo.close();
    repo = new PgRepository(config);
    await repo.start();
    const recovered = await repo.get(run.id);
    assert.equal(recovered.state, 'FAILED');
    assert.equal(recovered.report?.error, 'INTERRUPTED');
    assert.equal(recovered.verification?.status, 'interrupted');
    assert.equal(recovered.verification?.repairAttempts, 1);
    assert.equal(recovered.verification?.repairs[0]?.status, 'unknown');
    assert.equal((await repo.get(old.run.id)).mode, 'mock');
  } finally {
    await repo.close();
  }
});
