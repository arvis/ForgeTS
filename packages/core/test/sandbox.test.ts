import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  DomainError,
  FactoryRunSchema,
  transition,
  type FactoryRun,
  type FeatureSpec,
  type FinalReport,
  type StageOutput,
  type State,
  type ErrorCode,
} from '@forgets/contracts';
import {
  SandboxService,
  type SandboxProvider,
  type SandboxRepository,
  type SandboxWorker,
} from '../src/sandbox.js';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const files = [{ path: 'src/app.service.ts', content: 'hello' }];
const snapshotHash = (value: unknown) => hash(JSON.stringify(value));
const input = () => ({
  mode: 'sandbox-fixture',
  target: 'nest-greeting-v1',
  idempotencyKey: randomUUID(),
  markdown:
    '# Greeting\n## Goal\nUpdate greeting\n## Requirements\n- Replace greeting\n## Acceptance Criteria\n- Inspect diff\n## Constraints\n- No tools granted by input',
});
class Memory implements SandboxRepository {
  controller = new AbortController();
  get ownershipSignal() {
    return this.controller.signal;
  }
  current: FactoryRun | undefined;
  states: string[] = [];
  failSave = false;
  async assertOwner() {
    if (this.controller.signal.aborted) throw new DomainError('PERSISTENCE');
  }
  async admitSandbox(
    spec: FeatureSpec,
    key: string,
    inputHash: string,
    execution: unknown,
  ) {
    const at = new Date().toISOString();
    this.current = FactoryRunSchema.parse({
      id: randomUUID(),
      key,
      inputHash,
      mode: 'sandbox-fixture',
      spec,
      state: 'CREATED',
      version: 0,
      createdAt: at,
      updatedAt: at,
      outputs: [],
      report: null,
      execution,
    });
    this.states.push('CREATED');
    return { run: this.current, created: true };
  }
  async save(
    run: FactoryRun,
    state: State,
    outputs: StageOutput[],
    report: FinalReport | null,
    error: ErrorCode | null,
  ) {
    await this.assertOwner();
    if (report) assert.equal(report.error, error);
    if (this.failSave) throw new DomainError('PERSISTENCE');
    transition(run.state, state);
    this.current = FactoryRunSchema.parse({
      ...run,
      state,
      outputs,
      report,
      version: run.version + 1,
    });
    this.states.push(state);
    return this.current;
  }
}
function factory(
  options: {
    badIdentity?: boolean;
    badPath?: boolean;
    onCall?: (stage: string) => void;
  } = {},
): (identity: { runId: string; workspaceId: string }) => SandboxProvider {
  return (identity) => ({
    invoke(input) {
      options.onCall?.(input.stage);
      const output =
        input.stage === 'planner'
          ? {
              stage: 'planner',
              summary: 'Update',
              steps: ['Replace'],
              fileChanges: [files[0]!.path],
              testStrategy: ['Pending M3'],
              risks: [],
            }
          : {
              stage: 'implementer',
              summary: 'Updated',
              request: {
                capability: 'replace',
                files: [
                  {
                    path: options.badPath ? '../escape.ts' : files[0]!.path,
                    beforeHash: hash('hello'),
                    content: 'hi',
                  },
                ],
              },
            };
      return Promise.resolve({
        output,
        invocation: {
          ...identity,
          runId: options.badIdentity ? randomUUID() : identity.runId,
          id: randomUUID(),
          provider: 'openai',
          transport: 'fake',
          model: 'fixture-model',
          templateVersion: 'm2-v1',
          stage: input.stage,
          responseHash: hash(JSON.stringify(output)),
          usage: null,
        },
      });
    },
  });
}
const worker: SandboxWorker = () =>
  Promise.resolve({
    files: [{ path: files[0]!.path, content: 'hi' }],
    baseHash: snapshotHash(files),
    resultHash: snapshotHash([{ path: files[0]!.path, content: 'hi' }]),
  });
await test('rejects unknown mode/target/tool overrides before admission or provider', async () => {
  const repo = new Memory();
  const service = new SandboxService(repo, factory(), worker, files);
  for (const value of [
    { ...input(), mode: 'live' },
    { ...input(), target: 'C:/Users' },
    { ...input(), allowShell: true },
  ])
    await assert.rejects(service.run(value, new AbortController().signal), {
      message: 'VALIDATION',
    });
  assert.equal(repo.current, undefined);
});
await test('denies forged invocation identity and unsafe provider patch before any worker action', async () => {
  for (const options of [{ badIdentity: true }, { badPath: true }]) {
    const repo = new Memory();
    let calls = 0;
    const result = await new SandboxService(
      repo,
      factory(options),
      (...args) => {
        calls++;
        return worker(...args);
      },
      files,
    ).run(input(), new AbortController().signal);
    assert.equal(result.state, 'FAILED');
    assert.equal(calls, 0);
    assert.equal(result.report?.mergeReady, false);
  }
});
await test('ownership loss prevents worker execution and does not invent durable terminal evidence', async () => {
  const repo = new Memory();
  let calls = 0;
  const service = new SandboxService(
    repo,
    factory({
      onCall: (stage) => {
        if (stage === 'implementer') repo.controller.abort();
      },
    }),
    (...args) => {
      calls++;
      return worker(...args);
    },
    files,
  );
  await assert.rejects(service.run(input(), new AbortController().signal), {
    message: 'PERSISTENCE',
  });
  assert.equal(calls, 0);
  assert.ok(!repo.states.includes('IMPLEMENTED_UNVERIFIED'));
});
await test('caller cancellation and worker hash mismatch remain terminal failures without verification claims', async () => {
  const repo = new Memory();
  const controller = new AbortController();
  const cancelled = await new SandboxService(
    repo,
    factory(),
    async (_files, _request, signal) => {
      controller.abort();
      assert.ok(signal.aborted);
      return worker(files, {}, signal);
    },
    files,
  ).run(input(), controller.signal);
  assert.equal(cancelled.state, 'CANCELLED');
  const other = new Memory();
  const failed = await new SandboxService(
    other,
    factory(),
    () =>
      Promise.resolve({
        files: [{ path: files[0]!.path, content: 'evil' }],
        baseHash: hash('wrong'),
        resultHash: hash('wrong'),
      }),
    files,
  ).run(input(), new AbortController().signal);
  assert.equal(failed.state, 'FAILED');
  assert.equal(failed.report?.mergeReady, false);
});
await test('persists fixture provenance and actual artifact identity at implemented-unverified checkpoint', async () => {
  const repo = new Memory();
  const result = await new SandboxService(repo, factory(), worker, files).run(
    input(),
    new AbortController().signal,
  );
  assert.deepEqual(repo.states, [
    'CREATED',
    'SPEC_VALIDATED',
    'PLANNED',
    'IMPLEMENTING',
    'IMPLEMENTED_UNVERIFIED',
  ]);
  assert.equal(result.mode, 'sandbox-fixture');
  assert.equal(result.report?.mergeReady, false);
  assert.deepEqual(result.outputs, []);
  const serialized = JSON.stringify(result);
  assert.ok(serialized.includes('fixture-model'));
  assert.ok(serialized.includes(snapshotHash(files)));
  assert.ok(serialized.includes('hello'));
  assert.ok(serialized.includes('hi'));
  assert.ok(!serialized.includes('"kind":"simulated"'));
  assert.equal(files[0]!.content, 'hello');
});
