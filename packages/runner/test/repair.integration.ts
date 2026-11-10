import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  FactoryRunSchema,
  localConfig,
  parsePage,
  passingRound,
  sourceDigest,
} from '@forgets/contracts';
import { PgRepository } from '@forgets/persistence';
import { dockerEnvironment } from '../src/docker.js';
const exec = promisify(execFile);
const config = localConfig({
  FORGETS_ENV: 'test',
  FORGETS_DB_PASSWORD: process.env.FORGETS_DB_PASSWORD,
});
const env = {
  ...dockerEnvironment(),
  FORGETS_ENV: 'test',
  FORGETS_DB_PASSWORD: config.password,
};
async function invoke(scenario: string, key: string, failed = false) {
  const args = [
    fileURLToPath(
      new URL(
        '../../../../apps/cli/dist/src/verification-main.js',
        import.meta.url,
      ),
    ),
    fileURLToPath(
      new URL(
        '../../../../specs/examples/sandbox-greeting.md',
        import.meta.url,
      ),
    ),
    scenario,
    key,
  ];
  let stdout: string;
  try {
    stdout = (
      await exec(process.execPath, args, {
        env,
        timeout: 225000,
        maxBuffer: 262144,
        windowsHide: true,
      })
    ).stdout;
    assert.equal(failed, false, 'expected a failing process');
  } catch (error) {
    if (!failed) throw error;
    const result = error as { code: number; stdout: string };
    assert.equal(result.code, 1);
    stdout = result.stdout;
  }
  return FactoryRunSchema.parse(JSON.parse(stdout) as unknown);
}
await test(
  'actual tools plus fake repair fix one defect, stop a persistent defect and retain attempts',
  { timeout: 225000 },
  async () => {
    const key = randomUUID();
    const repaired = await invoke('repair', key);
    assert.equal(repaired.state, 'VERIFIED_AWAITING_REVIEW');
    assert.equal(repaired.report?.mergeReady, false);
    assert.equal(repaired.verification?.repairAttempts, 1);
    assert.equal(repaired.verification?.rounds.length, 2);
    const v = repaired.verification!;
    assert.equal(
      v.rounds[0]?.results.find((result) => result.check === 'typecheck')
        ?.outcome,
      'fail',
    );
    assert.ok(v.rounds[0]?.results.some((result) => result.exitCode !== 0));
    assert.ok(v.currentFiles[0]!.content.includes('Hello from the sandbox'));
    assert.equal(v.currentHash, sourceDigest(v.currentFiles));
    assert.equal(passingRound(v.rounds[1]!.results, v.currentHash, 1), true);
    assert.notEqual(v.initialHash, v.currentHash);
    assert.deepEqual(await invoke('repair', key), repaired);
    const persistent = await invoke('persistent', randomUUID(), true);
    assert.equal(persistent.state, 'FAILED');
    assert.equal(persistent.verification?.repairAttempts, 2);
    assert.equal(persistent.verification?.rounds.length, 3);
    assert.equal(
      persistent.verification?.rounds.reduce(
        (count, round) => count + round.results.length,
        0,
      ),
      12,
    );
    const malformed = await invoke('malformed', randomUUID(), true);
    assert.equal(malformed.verification?.repairAttempts, 1);
    assert.equal(malformed.verification?.repairs[0]?.status, 'failed');
    const repo = new PgRepository(config);
    await repo.start();
    try {
      for (const run of [repaired, persistent, malformed]) {
        assert.deepEqual(await repo.get(run.id), run);
        const events = await repo.events(run.id, parsePage({ limit: '100' }));
        assert.deepEqual(
          events.items.map((event) => event.sequence),
          Array.from({ length: run.version + 1 }, (_, index) => index),
        );
        assert.equal(events.items.at(-1)?.state, run.state);
      }
    } finally {
      await repo.close();
    }
  },
);
