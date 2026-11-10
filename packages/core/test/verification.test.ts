import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  CHECK_COMMANDS,
  CheckRequestSchema,
  CheckResultSchema,
  FactoryRunSchema,
  DomainError,
  transition,
  type FactoryRun,
  type State,
  type StageOutput,
  type FinalReport,
} from '@forgets/contracts';
import {
  VerificationService,
  type VerificationRepository,
  type CheckPort,
  type RepairPort,
  type RepairInput,
} from '../src/verification.js';
import type { SandboxWorker } from '../src/sandbox.js';
const digest = (text: string) =>
  createHash('sha256').update(text).digest('hex');
const base = [{ path: 'src/main.ts', content: 'hello' }];
const hash = (files: typeof base) => digest(JSON.stringify(files));
function initial() {
  const id = randomUUID(),
    workspaceId = randomUUID(),
    at = new Date().toISOString();
  const plan = {
    stage: 'planner',
    summary: 'Change',
    steps: ['Replace greeting'],
    fileChanges: ['src/main.ts'],
    testStrategy: ['Actual checks in M3'],
    risks: [],
  };
  const implementation = {
    stage: 'implementer',
    summary: 'Broken fixture',
    request: {
      capability: 'replace',
      files: [
        { path: 'src/main.ts', content: 'broken', beforeHash: digest('hello') },
      ],
    },
  };
  const changes = [
    {
      path: 'src/main.ts',
      before: 'hello',
      after: 'broken',
      beforeHash: digest('hello'),
      afterHash: digest('broken'),
    },
  ];
  return FactoryRunSchema.parse({
    id,
    key: randomUUID(),
    inputHash: 'a'.repeat(64),
    mode: 'sandbox-fixture',
    spec: {
      title: 'Test',
      goal: 'Fix greeting',
      requirements: ['Greet'],
      acceptanceCriteria: ['Pass actual checks'],
      constraints: ['No permission overrides'],
    },
    state: 'IMPLEMENTED_UNVERIFIED',
    version: 4,
    createdAt: at,
    updatedAt: at,
    outputs: [],
    report: {
      mode: 'sandbox-fixture',
      mergeReady: false,
      outcome: 'IMPLEMENTED_UNVERIFIED',
      outputs: [],
      error: null,
      limitations: ['Unverified fixture'],
    },
    execution: {
      target: 'nest-greeting-v1',
      workspaceId,
      targetHash: hash(base),
      providerAttempts: 2,
      invocations: [plan, implementation].map((output) => ({
        id: randomUUID(),
        runId: id,
        workspaceId,
        provider: 'openai',
        transport: 'fake',
        model: 'fixture-model',
        templateVersion: 'm2-v1',
        stage: output.stage,
        responseHash: digest(JSON.stringify(output)),
        usage: null,
      })),
      plan,
      implementation,
      tool: {
        capability: 'replace',
        status: 'completed',
        executed: true,
        baseHash: hash(base),
        resultHash: hash([{ path: 'src/main.ts', content: 'broken' }]),
        error: null,
      },
      artifact: {
        baseHash: hash(base),
        resultHash: hash([{ path: 'src/main.ts', content: 'broken' }]),
        diffHash: digest(JSON.stringify(changes)),
        changes,
      },
    },
  });
}
class Memory implements VerificationRepository {
  current = initial();
  controller = new AbortController();
  states: string[] = [];
  failRecords = false;
  get ownershipSignal() {
    return this.controller.signal;
  }
  async assertOwner() {
    if (this.controller.signal.aborted) throw new DomainError('PERSISTENCE');
  }
  async get() {
    return structuredClone(this.current);
  }
  async admitSandbox() {
    return { run: this.current, created: false };
  }
  async record(run: FactoryRun) {
    await this.assertOwner();
    if (this.failRecords) throw new DomainError('PERSISTENCE');
    this.current = FactoryRunSchema.parse({ ...run, version: run.version + 1 });
    this.states.push(run.state);
    return structuredClone(this.current);
  }
  async save(
    run: FactoryRun,
    state: State,
    outputs: StageOutput[],
    report: FinalReport | null,
  ) {
    transition(run.state, state);
    return this.record({ ...run, state, outputs, report });
  }
}
const check: CheckPort = async (input) => {
  const request = CheckRequestSchema.parse(input);
  const pass = request.files[0]!.content === 'fixed';
  return CheckResultSchema.parse({
    id: randomUUID(),
    kind: 'actual',
    registry: 'm3-nest-greeting-v1',
    check: request.check,
    attempt: request.attempt,
    workspaceId: request.workspaceId,
    inputHash: hash(request.files),
    imageId: 'sha256:' + 'a'.repeat(64),
    toolchainHash: 'b'.repeat(64),
    commands: CHECK_COMMANDS[request.check],
    exitCode: pass ? 0 : 1,
    signal: null,
    timedOut: false,
    cancelled: false,
    resourceExhausted: false,
    stdoutTruncated: false,
    stderrTruncated: false,
    evidenceAvailable: true,
    cleanup: 'confirmed',
    stdout: 'fixture check data',
    stderr: '',
    commandsExecuted: CHECK_COMMANDS[request.check].length,
    durationMs: 1,
    toolDurationMs: 1,
    outcome: pass ? 'pass' : 'fail',
    sourcesChanged: false,
    errorCode: null,
  });
};
const reply = (input: RepairInput, content = 'fixed') => ({
  output: {
    stage: 'repair',
    summary: 'Fixture repair',
    request: {
      capability: 'replace',
      files: [
        {
          path: 'src/main.ts',
          content,
          beforeHash: digest(input.files[0]!.content),
        },
      ],
    },
  },
  invocationId: input.invocationId,
  runId: input.runId,
  workspaceId: input.workspaceId,
  templateVersion: 'm3-v1',
  transport: 'fake',
  usage: null,
});
const repair: RepairPort = (input) => Promise.resolve(reply(input));
const worker: SandboxWorker = (files, request) => {
  const edit = (request as { files: typeof base }).files[0]!;
  return Promise.resolve({
    files: [edit].map((file) => ({ path: file.path, content: file.content })),
    baseHash: hash(files),
    resultHash: hash([{ path: edit.path, content: edit.content }]),
  });
};
const evidence = (run: FactoryRun) =>
  Reflect.get(run, 'verification') as {
    repairAttempts: number;
    rounds: unknown[];
    repairs: { status: string }[];
  };
await test('invalid handoff identity is denied before any check/repair', async () => {
  const repo = new Memory();
  repo.current.execution!.artifact!.baseHash = '0'.repeat(64);
  let calls = 0;
  await assert.rejects(
    new VerificationService(
      repo,
      () => {
        calls++;
        return Promise.resolve(null);
      },
      repair,
      worker,
      base,
    ).verify(repo.current.id, new AbortController().signal),
    { message: 'VALIDATION' },
  );
  assert.equal(calls, 0);
});
await test('missing/stale check evidence cannot cause repair or verified eligibility', async () => {
  const stale: CheckPort = async (...args) => ({
    ...CheckResultSchema.parse(await check(...args)),
    inputHash: '0'.repeat(64),
    exitCode: 0,
    outcome: 'pass',
  });
  for (const port of [
    () => Promise.resolve(null),
    () => Promise.resolve({ outcome: 'pass' }),
    stale,
  ]) {
    const repo = new Memory();
    let repairs = 0;
    const result = await new VerificationService(
      repo,
      port,
      (input) => {
        repairs++;
        return repair(input, new AbortController().signal);
      },
      worker,
      base,
    ).verify(repo.current.id, new AbortController().signal);
    assert.equal(result.state, 'FAILED');
    assert.equal(repairs, 0);
    assert.equal(result.report?.mergeReady, false);
  }
});
await test('duplicate check identities fail durably instead of poisoning the evidence snapshot', async () => {
  const repo = new Memory();
  const id = randomUUID();
  const result = await new VerificationService(
    repo,
    async (...args) => ({
      ...CheckResultSchema.parse(await check(...args)),
      id,
    }),
    repair,
    worker,
    base,
  ).verify(repo.current.id, new AbortController().signal);
  assert.equal(result.state, 'FAILED');
  assert.equal(result.report?.error, 'VERIFICATION_FAILURE');
});
await test('one repair requires eight fresh checks and idempotent replay performs no work', async () => {
  const repo = new Memory();
  let calls = 0;
  let repairs = 0;
  const service = new VerificationService(
    repo,
    (...args) => {
      calls++;
      return check(...args);
    },
    (...args) => {
      repairs++;
      return repair(...args);
    },
    worker,
    base,
  );
  const result = await service.verify(
    repo.current.id,
    new AbortController().signal,
  );
  assert.equal(result.state, 'VERIFIED_AWAITING_REVIEW');
  assert.equal(calls, 8);
  assert.equal(repairs, 1);
  assert.equal(evidence(result).repairAttempts, 1);
  assert.equal(evidence(result).rounds.length, 2);
  assert.equal(result.report?.mergeReady, false);
  assert.deepEqual(
    await service.verify(result.id, new AbortController().signal),
    result,
  );
  assert.equal(calls, 8);
  assert.equal(repairs, 1);
});
await test('persistent valid defect stops after two repairs and twelve checks', async () => {
  const repo = new Memory();
  let calls = 0;
  let repairs = 0;
  const result = await new VerificationService(
    repo,
    (...args) => {
      calls++;
      return check(...args);
    },
    (input) => {
      repairs++;
      return Promise.resolve(reply(input, 'broken'));
    },
    worker,
    base,
  ).verify(repo.current.id, new AbortController().signal);
  assert.equal(result.state, 'FAILED');
  assert.equal(calls, 12);
  assert.equal(repairs, 2);
  assert.equal(evidence(result).repairAttempts, 2);
  assert.equal(evidence(result).rounds.length, 3);
});
await test('malformed/scope-expanding/provider-failed repair consumes one persisted attempt without tools', async () => {
  for (const provider of [
    () => Promise.resolve({ allowShell: true }),
    (input: RepairInput) => Promise.resolve(reply(input, 'x'.repeat(4097))),
    (input: RepairInput) =>
      Promise.resolve({ ...reply(input), runId: randomUUID() }),
    (input: RepairInput) =>
      Promise.resolve({
        ...reply(input),
        output: {
          ...reply(input).output,
          request: {
            capability: 'replace',
            files: [
              {
                path: '../escape.ts',
                content: 'evil',
                beforeHash: digest('broken'),
              },
            ],
          },
        },
      }),
    () => Promise.reject(new Error('secret raw error')),
  ]) {
    const repo = new Memory();
    let calls = 0;
    const result = await new VerificationService(
      repo,
      check,
      provider,
      () => {
        calls++;
        return Promise.resolve(null);
      },
      base,
    ).verify(repo.current.id, new AbortController().signal);
    assert.equal(result.state, 'FAILED');
    assert.equal(evidence(result).repairAttempts, 1);
    assert.equal(evidence(result).repairs[0]!.status, 'failed');
    assert.equal(calls, 0);
    assert.ok(!JSON.stringify(result).includes('secret raw error'));
  }
});
await test('persistence/owner loss cannot invent a durable verified result', async () => {
  const repo = new Memory();
  repo.failRecords = true;
  await assert.rejects(
    new VerificationService(repo, check, repair, worker, base).verify(
      repo.current.id,
      new AbortController().signal,
    ),
    { message: 'PERSISTENCE' },
  );
  const other = new Memory();
  await assert.rejects(
    new VerificationService(
      other,
      (...args) => {
        other.controller.abort();
        return check(...args);
      },
      repair,
      worker,
      base,
    ).verify(other.current.id, new AbortController().signal),
    { message: 'PERSISTENCE' },
  );
  assert.notEqual(other.current.state, 'VERIFIED_AWAITING_REVIEW');
});
await test('cancelled check retains observed cleanup evidence without eligibility', async () => {
  const repo = new Memory();
  const controller = new AbortController();
  const result = await new VerificationService(
    repo,
    async (...args) => {
      const value = CheckResultSchema.parse(await check(...args));
      controller.abort();
      return {
        ...value,
        outcome: 'fail',
        exitCode: null,
        cancelled: true,
        evidenceAvailable: false,
        errorCode: 'WORKER_CANCELLED',
      };
    },
    repair,
    worker,
    base,
  ).verify(repo.current.id, controller.signal);
  assert.equal(result.state, 'CANCELLED');
  const v = Reflect.get(result, 'verification') as {
    rounds: { results: { cancelled: boolean; cleanup: string }[] }[];
  };
  assert.equal(v.rounds[0]?.results[0]?.cancelled, true);
  assert.equal(v.rounds[0]?.results[0]?.cleanup, 'confirmed');
});
