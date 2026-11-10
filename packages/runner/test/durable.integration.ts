import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  FactoryRunSchema,
  localConfig,
  parseMarkdown,
  parsePage,
} from '@forgets/contracts';
import { migrate, PgRepository } from '@forgets/persistence';
import { dockerEnvironment, executeTrustedWorker } from '../src/docker.js';
const exec = promisify(execFile);
const config = localConfig({
  FORGETS_ENV: 'test',
  FORGETS_DB_PASSWORD: process.env.FORGETS_DB_PASSWORD,
});
await test(
  'real Docker, PostgreSQL and fixture CLI persist unverified artifacts and preserve old mocks',
  { timeout: 60000 },
  async () => {
    await migrate(config);
    let repo = new PgRepository(config);
    await repo.start();
    const spec = parseMarkdown(
      '# History\n## Goal\nPreserve old records\n## Requirements\n- Keep provenance\n## Acceptance Criteria\n- Readable\n## Constraints\n- Mock',
    );
    const historical = await repo.admit(spec, randomUUID(), 'a'.repeat(64));
    await repo.save(historical.run, 'FAILED', [], null, 'MOCK_FAILURE');
    await repo.close();
    const key = randomUUID();
    const args = [
      fileURLToPath(
        new URL(
          '../../../../apps/cli/dist/src/sandbox-main.js',
          import.meta.url,
        ),
      ),
      fileURLToPath(
        new URL(
          '../../../../specs/examples/sandbox-greeting.md',
          import.meta.url,
        ),
      ),
      key,
    ];
    const env = {
      ...dockerEnvironment(),
      FORGETS_ENV: 'test',
      FORGETS_DB_PASSWORD: config.password,
    };
    const first = await exec(process.execPath, args, {
      env,
      timeout: 45000,
      maxBuffer: 65536,
      windowsHide: true,
    });
    const run = FactoryRunSchema.parse(JSON.parse(first.stdout) as unknown);
    assert.equal(run.state, 'IMPLEMENTED_UNVERIFIED');
    assert.equal(run.mode, 'sandbox-fixture');
    assert.equal(run.report?.mergeReady, false);
    assert.equal(run.execution?.tool?.executed, true);
    assert.equal(run.execution?.invocations.length, 2);
    assert.ok(
      run.execution?.invocations.every(
        (value) => value.transport === 'fake' && value.usage === null,
      ),
    );
    assert.ok(
      run.execution?.artifact?.changes[0]?.before.includes(
        'Hello from ForgeTS',
      ),
    );
    assert.ok(
      run.execution?.artifact?.changes[0]?.after.includes(
        'Hello from the sandbox',
      ),
    );
    repo = new PgRepository(config);
    await repo.start();
    try {
      assert.deepEqual(await repo.get(run.id), run);
      assert.equal((await repo.get(historical.run.id)).mode, 'mock');
      const events = await repo.events(run.id, parsePage({ limit: '100' }));
      assert.deepEqual(
        events.items.map((value) => value.state),
        [
          'CREATED',
          'SPEC_VALIDATED',
          'PLANNED',
          'IMPLEMENTING',
          'IMPLEMENTED_UNVERIFIED',
        ],
      );
    } finally {
      await repo.close();
    }
    const retry = await exec(process.execPath, args, {
      env,
      timeout: 45000,
      maxBuffer: 65536,
      windowsHide: true,
    });
    assert.deepEqual(
      FactoryRunSchema.parse(JSON.parse(retry.stdout) as unknown),
      run,
    );
    repo = new PgRepository(config);
    await repo.start();
    try {
      const task = executeTrustedWorker(
        'setInterval(()=>{},1000)',
        '',
        repo.ownershipSignal,
        () => repo.assertOwner(),
      );
      const stopped = assert.rejects(
        task,
        /^Error: (WORKER_CANCELLED|PERSISTENCE)$/,
      );
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const owner = await repo.pool.query<{ pid: number }>(
        "SELECT pid FROM pg_locks WHERE locktype='advisory' AND objid=714930121 AND granted",
      );
      assert.equal(owner.rowCount, 1);
      await repo.pool.query('SELECT pg_terminate_backend($1)', [
        owner.rows[0]!.pid,
      ]);
      await stopped;
      assert.equal(repo.ownershipSignal.aborted, true);
    } finally {
      await repo.close();
    }
  },
);
