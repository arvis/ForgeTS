import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dockerEnvironment, IMAGE, workerArguments } from '../src/docker.js';
import { replaceInWorker } from '../src/index.js';

await test('denies bad requests and pre-aborted execution before contacting Docker', async () => {
  await assert.rejects(
    replaceInWorker([], { capability: 'shell' }, new AbortController().signal),
    /^Error: CAPABILITY_DENIED$/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    replaceInWorker(
      [{ path: 'src/a.ts', content: '' }],
      {
        capability: 'replace',
        files: [
          {
            path: 'src/a.ts',
            content: 'a',
            beforeHash:
              'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
        ],
      },
      controller.signal,
    ),
    /^Error: WORKER_CANCELLED$/,
  );
});
await test('Docker policy uses a pinned image and fixed restricted flags without host mounts', () => {
  const args = workerArguments(
    'forgets-worker-11111111-1111-4111-8111-111111111111',
  );
  assert.match(IMAGE, /^node@sha256:[a-f0-9]{64}$/);
  for (const flag of [
    '--pull=never',
    '--network=none',
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--user=1000:1000',
    '--memory=128m',
    '--memory-swap=128m',
    '--pids-limit=32',
    '--cpus=0.5',
    '--init',
  ])
    assert.ok(args.includes(flag), flag);
  assert.ok(
    args.some(
      (arg) =>
        arg.startsWith('--tmpfs=/workspace:') &&
        arg.includes('size=16777216') &&
        arg.includes('noexec'),
    ),
  );
  for (const arg of args)
    assert.ok(
      !/^(?:--mount|--volume|--env|--privileged|--pid=host|--network=host)/.test(
        arg,
      ),
      arg,
    );
  assert.throws(
    () => workerArguments('another-project'),
    /^Error: WORKER_CONFIG$/,
  );
});
await test('Docker subprocess environment excludes keys and connection overrides', () => {
  const env = dockerEnvironment();
  assert.ok(
    Object.keys(env).every((key) =>
      ['PATH', 'Path', 'SystemRoot', 'TEMP', 'TMP'].includes(key),
    ),
  );
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.DOCKER_HOST, undefined);
});
