import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  localConfig,
  parseMarkdown,
  parsePage,
  type FactoryRun,
} from '@forgets/contracts';
import { PgRepository, migrate } from '../src/index.js';

const config = localConfig({
  FORGETS_ENV: 'test',
  FORGETS_DB_PASSWORD: process.env.FORGETS_DB_PASSWORD,
});
const spec = parseMarkdown(
  '# Test\n## Goal\nTest persistence\n## Requirements\n- Persist events\n## Acceptance Criteria\n- Atomic updates\n## Constraints\n- Test database only',
);
const hash = 'a'.repeat(64);
await test('real PostgreSQL migration, negative transactions, ownership, recovery and bounded reload', async (t) => {
  await migrate(config);
  let repo = new PgRepository(config);
  await repo.start();
  t.after(async () => {
    await repo.close();
  });
  await t.test(
    'a second owner cannot recover or migrate live data',
    async () => {
      const other = new PgRepository(config);
      try {
        await assert.rejects(other.start(), { message: 'OWNER_BUSY' });
        await assert.rejects(migrate(config), { message: 'OWNER_BUSY' });
      } finally {
        await other.close();
      }
    },
  );
  const key = randomUUID();
  const { run } = await repo.admit(spec, key, hash);
  await t.test(
    'conflicting keys and simultaneous admission cannot create duplicate/parallel work',
    async () => {
      await assert.rejects(repo.admit(spec, key, 'b'.repeat(64)), {
        message: 'CONFLICT',
      });
      await assert.rejects(repo.admit(spec, randomUUID(), hash), {
        message: 'BUSY',
      });
      const results = await Promise.all([
        repo.admit(spec, key, hash),
        repo.admit(spec, key, hash),
      ]);
      assert.ok(
        results.every((result) => result.run.id === run.id && !result.created),
      );
    },
  );
  let current = await repo.save(run, 'SPEC_VALIDATED', [], null, null);
  await t.test(
    'forced event INSERT failure rolls state/version back with the event',
    async () => {
      await repo.pool.query(
        "ALTER TABLE factory_events ADD CONSTRAINT m1_test_event_failure CHECK (state <> 'PLANNED') NOT VALID",
      );
      try {
        await assert.rejects(repo.save(current, 'PLANNED', [], null, null), {
          message: 'PERSISTENCE',
        });
        assert.equal((await repo.get(run.id)).version, current.version);
        assert.equal((await repo.get(run.id)).state, 'SPEC_VALIDATED');
        assert.equal(
          (await repo.events(run.id, parsePage({}))).items.length,
          2,
        );
      } finally {
        await repo.pool.query(
          'ALTER TABLE factory_events DROP CONSTRAINT m1_test_event_failure',
        );
      }
    },
  );
  await t.test(
    'concurrent versioned transitions have exactly one winner',
    async () => {
      const results = await Promise.allSettled([
        repo.save(current, 'PLANNED', [], null, null),
        repo.save(current, 'PLANNED', [], null, null),
      ]);
      assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        1,
      );
      assert.equal((await repo.events(run.id, parsePage({}))).items.length, 3);
      current = await repo.get(run.id);
    },
  );
  await t.test('illegal transitions cannot modify the database', async () => {
    await assert.rejects(
      repo.save(current, 'AWAITING_HUMAN_APPROVAL', [], null, null),
      { message: 'TRANSITION' },
    );
    assert.equal((await repo.get(run.id)).version, current.version);
  });
  await t.test(
    'restart fails interrupted runs without losing ordered evidence',
    async () => {
      await repo.close();
      repo = new PgRepository(config);
      await repo.start();
      assert.equal((await repo.get(run.id)).state, 'FAILED');
      const first = await repo.events(run.id, parsePage({ limit: '2' }));
      const next = await repo.events(
        run.id,
        parsePage({ limit: '2', after: String(first.nextAfter) }),
      );
      assert.deepEqual(
        [...first.items, ...next.items].map((event) => event.sequence),
        [0, 1, 2, 3],
      );
    },
  );
  await t.test(
    'concurrent distinct submissions admit only one executing run',
    async () => {
      const results = await Promise.allSettled([
        repo.admit(spec, randomUUID(), hash),
        repo.admit(spec, randomUUID(), hash),
      ]);
      const accepted = results.filter(
        (result) => result.status === 'fulfilled',
      );
      assert.equal(accepted.length, 1);
      const active = accepted[0];
      assert.ok(active?.status === 'fulfilled');
      await repo.save(active.value.run, 'FAILED', [], null, 'INTERRUPTED');
    },
  );
  await t.test(
    'timestamp ties and bounded cursor pages do not duplicate history rows',
    async () => {
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const admitted = await repo.admit(spec, randomUUID(), hash);
        ids.push(admitted.run.id);
        await repo.save(admitted.run, 'FAILED', [], null, null);
      }
      await repo.pool.query(
        "UPDATE factory_runs SET created_at='2026-01-01T00:00:00.000Z', data=jsonb_set(data,'{createdAt}', '\"2026-01-01T00:00:00.000Z\"'::jsonb) WHERE id=ANY($1::uuid[])",
        [ids],
      );
      const seen: FactoryRun[] = [];
      let cursor: string | null = null;
      do {
        const page = await repo.list(
          parsePage({ limit: '2', ...(cursor ? { cursor } : {}) }),
        );
        seen.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);
      assert.equal(new Set(seen.map((item) => item.id)).size, seen.length);
      assert.ok(ids.every((id) => seen.some((item) => item.id === id)));
      const constraints = await repo.pool.query<{ indexname: string }>(
        'SELECT indexname FROM pg_indexes WHERE tablename IN ($1,$2)',
        ['factory_runs', 'factory_events'],
      );
      assert.ok(
        constraints.rows.some((row) => row.indexname === 'factory_runs_active'),
      );
      assert.ok(
        constraints.rows.some(
          (row) => row.indexname === 'factory_runs_state_history',
        ),
      );
    },
  );
});
