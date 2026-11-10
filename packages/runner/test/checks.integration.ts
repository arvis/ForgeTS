import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { CHECK_IDS, CheckResultSchema, passingRound } from '@forgets/contracts';
import { snapshotHash } from '@forgets/agents';
import { runCheck } from '../src/verification.js';
import { SAMPLE_FILES } from '../src/sample.js';
import { executeTrustedWorker } from '../src/docker.js';
const good = SAMPLE_FILES[0]!.content.replace(
  'Hello from ForgeTS',
  'Hello from the sandbox',
);
await test('mismatched bootstrap image identity is denied before a verification worker starts', async () => {
  await assert.rejects(
    executeTrustedWorker(
      "console.log('must not start')",
      '',
      new AbortController().signal,
      undefined,
      'verification',
      'sha256:' + '0'.repeat(64),
    ),
    /^Error: CHECK_TOOLCHAIN$/,
  );
});
const source = (content: string) => [{ path: 'src/main.ts', content }];
const run = (
  check: string,
  content: string,
  signal = new AbortController().signal,
) =>
  runCheck(
    { check, files: source(content), attempt: 0, workspaceId: randomUUID() },
    signal,
  );
await test('source mutation during a generated test cannot preserve a passing source identity', async () => {
  const content =
    good +
    "\nimport { writeFileSync } from 'node:fs';\nwriteFileSync('/workspace/src/main.ts', 'tampered');\n";
  const result = await run('test', content);
  assert.equal(result.outcome, 'fail', JSON.stringify(result));
  assert.equal(Reflect.get(result, 'sourcesChanged'), true);
});
await test(
  'real immutable tools detect negative target cases before a complete passing round',
  { timeout: 180000 },
  async (t) => {
    await t.test('M3 resource profile is actually enforced', async () => {
      const text = await executeTrustedWorker(
        "const fs=require('node:fs');console.log(JSON.stringify({uid:process.getuid(),memory:fs.readFileSync('/sys/fs/cgroup/memory.max','utf8').trim(),pids:fs.readFileSync('/sys/fs/cgroup/pids.max','utf8').trim(),cpu:fs.readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim(),interfaces:fs.readdirSync('/sys/class/net'),key:process.env.OPENAI_API_KEY??null,socket:fs.existsSync('/var/run/docker.sock')}))",
        '',
        new AbortController().signal,
        undefined,
        'verification',
      );
      assert.deepEqual(JSON.parse(text), {
        uid: 1000,
        memory: '536870912',
        pids: '64',
        cpu: '100000 100000',
        interfaces: ['lo'],
        key: null,
        socket: false,
      });
    });
    await t.test(
      'actual formatting, lint, type and assertion failures return nonzero evidence',
      async () => {
        for (const [check, content] of [
          ['format', good.replace('return {', 'return{')],
          [
            'lint',
            good.replace(
              'return { message:',
              'debugger;\n    return { message:',
            ),
          ],
          ['typecheck', good.replace("'Hello from the sandbox'", '123')],
          ['test', good.replace('Hello from the sandbox', 'wrong greeting')],
        ]) {
          const result = await run(check!, content!);
          assert.equal(result.outcome, 'fail', JSON.stringify(result));
          assert.equal(result.evidenceAvailable, true, JSON.stringify(result));
          assert.notEqual(result.exitCode, 0, JSON.stringify(result));
          assert.equal(result.cleanup, 'confirmed');
        }
      },
    );
    await t.test(
      'hostile credential/network access, hangs, floods and cancellation cannot pass',
      async () => {
        const hostile = good.replace(
          'return { message:',
          "if (process.env.OPENAI_API_KEY) throw new Error('credential exposed');\n    throw new Error('CREDENTIALS_UNAVAILABLE');\n    return { message:",
        );
        assert.equal((await run('test', hostile)).outcome, 'fail');
        const network =
          good +
          "\nawait fetch('http://host.docker.internal:9', { signal: AbortSignal.timeout(500) });\n";
        assert.equal((await run('test', network)).outcome, 'fail');
        const hung = good.replace(
          "return { message: 'Hello from the sandbox' };",
          'while (true) {}',
        );
        const timeout = await run('test', hung);
        assert.equal(timeout.outcome, 'fail');
        assert.equal(timeout.timedOut, true, JSON.stringify(timeout));
        const flooded =
          good +
          "\nprocess.stdout.write('sk-fixture-sensitive-value'.repeat(10000));\n";
        const flood = await run('test', flooded);
        assert.equal(flood.outcome, 'fail');
        assert.ok(
          flood.stdoutTruncated || !flood.evidenceAvailable,
          JSON.stringify(flood),
        );
        assert.ok(!flood.stdout.includes('sk-fixture-sensitive-value'));
        const controller = new AbortController();
        const task = run('test', hung, controller.signal);
        const timer = setTimeout(() => controller.abort(), 1500);
        try {
          const cancelled = await task;
          assert.equal(cancelled.outcome, 'fail');
          assert.equal(cancelled.cancelled, true);
        } finally {
          clearTimeout(timer);
        }
        const detached =
          good +
          "\nimport { spawn } from 'node:child_process';\nspawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: true, stdio: 'ignore' }).unref();\n";
        const background = await run('test', detached);
        assert.equal(background.outcome, 'pass', JSON.stringify(background));
        assert.equal(background.cleanup, 'confirmed');
      },
    );
    await t.test(
      'all required checks pass for one digest and are invalidated by source changes',
      async () => {
        const workspaceId = randomUUID();
        const results = [];
        for (const check of CHECK_IDS)
          results.push(
            CheckResultSchema.parse(
              await runCheck(
                { check, files: source(good), attempt: 0, workspaceId },
                new AbortController().signal,
              ),
            ),
          );
        assert.equal(
          passingRound(results, snapshotHash(source(good)), 0),
          true,
          JSON.stringify(results),
        );
        assert.equal(
          passingRound(results, snapshotHash(source(good + '\n')), 0),
          false,
        );
        assert.equal(
          passingRound(results.slice(1), snapshotHash(source(good)), 0),
          false,
        );
      },
    );
  },
);
