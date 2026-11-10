import { createHash, randomUUID } from 'node:crypto';
import {
  DomainError,
  fail,
  bounded,
  validated,
  FactoryRunSchema,
  FinalReportSchema,
  CheckResultSchema,
  CHECK_IDS,
  VerificationEvidenceSchema,
  RepairReplySchema,
  sourceDigest,
  passingRound,
  SourceSnapshotSchema,
  type VerificationEvidence,
  type State,
  type ErrorCode,
  type FactoryRun,
  type FeatureSpec,
  type ProviderPlan,
  type CheckResult,
} from '@forgets/contracts';
import type { Repository } from './ports.js';
import type { SandboxRepository, SandboxWorker } from './sandbox.js';
export interface VerificationRepository extends SandboxRepository {
  get: Repository['get'];
  record(run: FactoryRun): Promise<FactoryRun>;
}
export type RepairInput = {
  runId: string;
  workspaceId: string;
  invocationId: string;
  attempt: number;
  spec: FeatureSpec;
  plan: ProviderPlan;
  files: { path: string; content: string }[];
  diagnostics: CheckResult[];
  diff: VerificationEvidence['artifact']['changes'];
};
export type RepairPort = (
  input: RepairInput,
  signal: AbortSignal,
) => Promise<unknown>;
export type CheckPort = (
  input: unknown,
  signal: AbortSignal,
) => Promise<unknown>;
export class VerificationService {
  private readonly base: { path: string; content: string }[];
  constructor(
    private readonly repository: VerificationRepository,
    private readonly checkPort: CheckPort,
    private readonly repairPort: RepairPort,
    private readonly worker: SandboxWorker,
    base: { path: string; content: string }[],
  ) {
    this.base = validated(SourceSnapshotSchema, base);
  }
  async verify(id: string, callerSignal: AbortSignal): Promise<FactoryRun> {
    validated(FactoryRunSchema.shape.id, id);
    await this.repository.assertOwner();
    let run = await this.repository.get(id);
    if (
      run.verification &&
      ['FAILED', 'CANCELLED', 'VERIFIED_AWAITING_REVIEW'].includes(run.state)
    )
      return run;
    if (
      run.mode !== 'sandbox-fixture' ||
      run.state !== 'IMPLEMENTED_UNVERIFIED' ||
      !run.execution?.artifact ||
      !run.execution.plan
    )
      fail('TRANSITION');
    const initial = restore(this.base, run.execution.artifact);
    if (
      sourceDigest(this.base) !== run.execution.targetHash ||
      sourceDigest(initial) !== run.execution.artifact.resultHash
    )
      fail('VALIDATION');
    const v: VerificationEvidence = {
      version: 'm3-v1',
      status: 'running',
      initialHash: sourceDigest(initial),
      currentHash: sourceDigest(initial),
      currentFiles: initial,
      toolchainImageId: null,
      toolchainHash: null,
      repairAttempts: 0,
      rounds: [],
      repairs: [],
      artifact: structuredClone(run.execution.artifact),
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), 180000);
    const signal = AbortSignal.any([
      callerSignal,
      this.repository.ownershipSignal,
      deadline.signal,
    ]);
    let category: ErrorCode = 'VERIFICATION_FAILURE';
    let workerAttempted = false;
    const guard = async () => {
      await this.repository.assertOwner();
      if (signal.aborted)
        fail(deadline.signal.aborted ? 'DEADLINE' : 'CANCELLED');
    };
    const snapshot = () => ({
      ...run,
      verification: validated(VerificationEvidenceSchema, v),
    });
    const checkpoint = async () => {
      await guard();
      run = await this.repository.record(snapshot());
    };
    const move = async (state: State, error: ErrorCode | null = null) => {
      await this.repository.assertOwner();
      const report = [
        'FAILED',
        'CANCELLED',
        'VERIFIED_AWAITING_REVIEW',
      ].includes(state)
        ? validated(FinalReportSchema, {
            mode: 'sandbox-fixture',
            mergeReady: false,
            outcome: state,
            outputs: [],
            error,
            limitations: [
              'Provider/repair responses are deterministic fixtures; no paid model was called.',
              'Actual sample checks are recorded; review and human approval remain pending M4.',
              'Passing the fixed registry is limited evidence, not general correctness or security.',
            ],
          })
        : null;
      run = await this.repository.save(snapshot(), state, [], report, error);
      return run;
    };
    try {
      await guard();
      await move('VERIFYING');
      while (true) {
        category = 'VERIFICATION_FAILURE';
        workerAttempted = false;
        await guard();
        const round: VerificationEvidence['rounds'][number] = {
          attempt: v.repairAttempts,
          inputHash: v.currentHash,
          status: 'pending',
          results: [],
        };
        v.rounds.push(round);
        await checkpoint();
        for (const check of CHECK_IDS) {
          await guard();
          const result = validated(
            CheckResultSchema,
            await this.checkPort(
              {
                check,
                attempt: round.attempt,
                workspaceId: run.execution!.workspaceId,
                files: structuredClone(v.currentFiles),
              },
              signal,
            ),
          );
          if (
            result.check !== check ||
            v.rounds.some((item) =>
              item.results.some((previous) => previous.id === result.id),
            ) ||
            result.attempt !== round.attempt ||
            result.workspaceId !== run.execution!.workspaceId ||
            result.inputHash !== round.inputHash
          )
            fail('VERIFICATION_FAILURE');
          if (v.toolchainImageId === null) {
            v.toolchainImageId = result.imageId;
            v.toolchainHash = result.toolchainHash;
          }
          if (
            result.imageId !== v.toolchainImageId ||
            result.toolchainHash !== v.toolchainHash
          )
            fail('VERIFICATION_FAILURE');
          round.results.push(result);
          await guard();
          await checkpoint();
          if (
            !result.evidenceAvailable ||
            result.cleanup !== 'confirmed' ||
            result.errorCode !== null
          )
            fail('VERIFICATION_FAILURE');
        }
        round.status = 'complete';
        await checkpoint();
        if (passingRound(round.results, v.currentHash, round.attempt)) {
          v.status = 'passed';
          v.completedAt = new Date().toISOString();
          return await move('VERIFIED_AWAITING_REVIEW');
        }
        if (v.repairAttempts >= 2) fail('VERIFICATION_FAILURE');
        category = 'REPAIR_FAILURE';
        v.repairAttempts++;
        const repair: VerificationEvidence['repairs'][number] = {
          attempt: v.repairAttempts,
          invocationId: randomUUID(),
          inputHash: v.currentHash,
          resultHash: null,
          status: 'requested',
          kind: 'fake',
          templateVersion: 'm3-v1',
          usage: null,
          output: null,
          outputHash: null,
          error: null,
        };
        v.repairs.push(repair);
        await move('REPAIRING');
        const input: RepairInput = {
          runId: run.id,
          workspaceId: run.execution!.workspaceId,
          invocationId: repair.invocationId,
          attempt: repair.attempt,
          spec: run.spec,
          plan: run.execution!.plan!,
          files: structuredClone(v.currentFiles),
          diagnostics: structuredClone(round.results),
          diff: structuredClone(v.artifact.changes),
        };
        if (Buffer.byteLength(JSON.stringify(input)) > 16384) fail('BUDGET');
        const reply = validated(
          RepairReplySchema,
          await interrupted(this.repairPort, input, signal),
        );
        await guard();
        if (
          reply.invocationId !== repair.invocationId ||
          reply.runId !== run.id ||
          reply.workspaceId !== run.execution!.workspaceId
        )
          fail('REPAIR_FAILURE');
        const expected = replace(
          v.currentFiles,
          reply.output.request,
          run.execution!.plan!,
        );
        if (Buffer.byteLength(JSON.stringify(reply.output)) > 8192)
          fail('BUDGET');
        repair.output = reply.output;
        repair.outputHash = digest(JSON.stringify(reply.output));
        try {
          bounded(snapshot());
        } catch {
          repair.output = null;
          fail('BUDGET');
        }
        await checkpoint();
        await move('IMPLEMENTING');
        await guard();
        workerAttempted = true;
        const value = await this.worker(
          structuredClone(v.currentFiles),
          structuredClone(reply.output.request),
          signal,
        );
        await guard();
        if (
          !value ||
          typeof value !== 'object' ||
          !('files' in value) ||
          !('baseHash' in value) ||
          !('resultHash' in value)
        )
          fail('REPAIR_FAILURE');
        const observed = validated(SourceSnapshotSchema, value.files);
        if (
          value.baseHash !== v.currentHash ||
          value.resultHash !== sourceDigest(expected) ||
          sourceDigest(observed) !== sourceDigest(expected)
        )
          fail('REPAIR_FAILURE');
        v.currentFiles = observed;
        v.currentHash = sourceDigest(observed);
        repair.resultHash = v.currentHash;
        repair.status = 'applied';
        v.artifact = artifact(this.base, observed);
        await checkpoint();
        await move('VERIFYING');
      }
    } catch (error) {
      if (
        error instanceof DomainError &&
        ['PERSISTENCE', 'CONFLICT'].includes(error.code)
      )
        throw error;
      await this.repository.assertOwner();
      const code: ErrorCode = signal.aborted
        ? deadline.signal.aborted
          ? 'DEADLINE'
          : 'CANCELLED'
        : error instanceof DomainError && error.code === 'BUDGET'
          ? 'BUDGET'
          : category;
      const last = v.rounds.at(-1);
      if (last?.status === 'pending') last.status = 'interrupted';
      const repair = v.repairs.at(-1);
      if (repair?.status === 'requested') {
        repair.status = workerAttempted ? 'unknown' : 'failed';
        repair.error =
          code === 'CANCELLED'
            ? 'CANCELLED'
            : code === 'BUDGET'
              ? 'BUDGET'
              : 'REPAIR_FAILURE';
      }
      v.status = 'failed';
      v.completedAt = new Date().toISOString();
      return await move(code === 'CANCELLED' ? 'CANCELLED' : 'FAILED', code);
    } finally {
      clearTimeout(timer);
    }
  }
}
function digest(text: string) {
  return createHash('sha256').update(text).digest('hex');
}
function restore(
  base: { path: string; content: string }[],
  value: VerificationEvidence['artifact'],
) {
  if (
    value.baseHash !== sourceDigest(base) ||
    value.diffHash !== digest(JSON.stringify(value.changes))
  )
    fail('VALIDATION');
  const files = structuredClone(base);
  const seen = new Set<string>();
  for (const change of value.changes) {
    const file = files.find((file) => file.path === change.path);
    if (
      !file ||
      seen.has(change.path) ||
      change.before !== file.content ||
      change.beforeHash !== digest(file.content) ||
      change.afterHash !== digest(change.after)
    )
      fail('VALIDATION');
    seen.add(change.path);
    file.content = change.after;
  }
  return files;
}
function replace(
  files: { path: string; content: string }[],
  request: { files: { path: string; content: string; beforeHash: string }[] },
  plan: ProviderPlan,
) {
  const seen = new Set<string>();
  for (const edit of request.files) {
    const file = files.find((file) => file.path === edit.path);
    if (
      !file ||
      !plan.fileChanges.includes(edit.path) ||
      seen.has(edit.path) ||
      edit.beforeHash !== digest(file.content) ||
      Buffer.byteLength(edit.content) > 4096
    )
      fail('REPAIR_FAILURE');
    seen.add(edit.path);
  }
  return files.map((file) => ({
    path: file.path,
    content:
      request.files.find((edit) => edit.path === file.path)?.content ??
      file.content,
  }));
}
function artifact(
  base: { path: string; content: string }[],
  files: { path: string; content: string }[],
): VerificationEvidence['artifact'] {
  const changes = base.flatMap((file) => {
    const after = files.find((item) => item.path === file.path)!.content;
    return after === file.content
      ? []
      : [
          {
            path: file.path,
            before: file.content,
            after,
            beforeHash: digest(file.content),
            afterHash: digest(after),
          },
        ];
  });
  return {
    baseHash: sourceDigest(base),
    resultHash: sourceDigest(files),
    diffHash: digest(JSON.stringify(changes)),
    changes,
  };
}
async function interrupted(
  port: RepairPort,
  input: RepairInput,
  signal: AbortSignal,
): Promise<unknown> {
  let abort = () => {};
  const cancellation = new Promise<never>((_resolve, reject) => {
    abort = () => reject(new DomainError('CANCELLED'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
  try {
    return await Promise.race([
      Promise.resolve().then(() => port(input, signal)),
      cancellation,
    ]);
  } finally {
    signal.removeEventListener('abort', abort);
  }
}
