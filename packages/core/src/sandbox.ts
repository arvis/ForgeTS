import { createHash, randomUUID } from 'node:crypto';
import {
  DomainError,
  fail,
  validated,
  parseMarkdown,
  FinalReportSchema,
  SandboxSubmissionSchema,
  SandboxExecutionSchema,
  ProviderPlanSchema,
  ProviderImplementationSchema,
  InvocationSchema,
  SourceSnapshotSchema,
  type FactoryRun,
  type FeatureSpec,
  type ProviderPlan,
  type SandboxExecution,
  type State,
  type ErrorCode,
} from '@forgets/contracts';
import type { Repository } from './ports.js';
type SourceFile = { path: string; content: string };
export interface SandboxRepository {
  ownershipSignal: AbortSignal;
  assertOwner(): Promise<void>;
  admitSandbox(
    spec: FeatureSpec,
    key: string,
    hash: string,
    execution: SandboxExecution,
  ): Promise<{ run: FactoryRun; created: boolean }>;
  save: Repository['save'];
}
export interface SandboxProvider {
  invoke(
    input: {
      stage: 'planner' | 'implementer';
      spec: FeatureSpec;
      files: SourceFile[];
      plan?: ProviderPlan;
    },
    signal: AbortSignal,
  ): Promise<unknown>;
}
export type SandboxWorker = (
  files: SourceFile[],
  request: unknown,
  signal: AbortSignal,
) => Promise<unknown>;
export class SandboxService {
  private readonly files: SourceFile[];
  constructor(
    private readonly repository: SandboxRepository,
    private readonly provider: (identity: {
      runId: string;
      workspaceId: string;
    }) => SandboxProvider,
    private readonly worker: SandboxWorker,
    files: SourceFile[],
  ) {
    this.files = validated(SourceSnapshotSchema, files);
  }
  async run(input: unknown, callerSignal: AbortSignal): Promise<FactoryRun> {
    const submission = validated(SandboxSubmissionSchema, input);
    const spec = parseMarkdown(submission.markdown);
    await this.repository.assertOwner();
    const execution: SandboxExecution = {
      target: submission.target,
      workspaceId: randomUUID(),
      targetHash: snapshotHash(this.files),
      providerAttempts: 0,
      invocations: [],
      plan: null,
      implementation: null,
      tool: null,
      artifact: null,
    };
    const hash = digest(
      JSON.stringify({
        mode: submission.mode,
        target: submission.target,
        spec,
        targetHash: execution.targetHash,
        templateVersion: 'm2-v1',
      }),
    );
    const admitted = await this.repository.admitSandbox(
      spec,
      submission.idempotencyKey,
      hash,
      execution,
    );
    if (!admitted.created) return admitted.run;
    let run = admitted.run;
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), 60000);
    const signal = AbortSignal.any([
      callerSignal,
      this.repository.ownershipSignal,
      deadline.signal,
    ]);
    let category: ErrorCode = 'PROVIDER_FAILURE';
    let workerAttempted = false;
    const check = async () => {
      await this.repository.assertOwner();
      if (signal.aborted)
        fail(deadline.signal.aborted ? 'DEADLINE' : 'CANCELLED');
    };
    const move = async (state: State, error: ErrorCode | null = null) => {
      await this.repository.assertOwner();
      const report = ['FAILED', 'CANCELLED', 'IMPLEMENTED_UNVERIFIED'].includes(
        state,
      )
        ? validated(FinalReportSchema, {
            mode: 'sandbox-fixture',
            mergeReady: false,
            outcome: state,
            outputs: [],
            error,
            limitations: [
              'Provider outputs are deterministic fixtures; no live model was called.',
              'File edits occurred in a disposable Docker worker; generated-code verification is pending M3.',
              'No review, approval, publishing or merge readiness is established.',
            ],
          })
        : null;
      run = await this.repository.save(
        { ...run, execution: validated(SandboxExecutionSchema, execution) },
        state,
        [],
        report,
        error,
      );
      return run;
    };
    try {
      await check();
      await move('SPEC_VALIDATED');
      const provider = this.provider({
        runId: run.id,
        workspaceId: execution.workspaceId,
      });
      const call = async (stage: 'planner' | 'implementer') => {
        await check();
        execution.providerAttempts++;
        const reply = await provider.invoke(
          {
            stage,
            spec,
            files: structuredClone(this.files),
            ...(execution.plan ? { plan: execution.plan } : {}),
          },
          signal,
        );
        await check();
        if (
          !reply ||
          typeof reply !== 'object' ||
          !('output' in reply) ||
          !('invocation' in reply) ||
          Object.keys(reply).length !== 2
        )
          fail('PROVIDER_FAILURE');
        const output =
          stage === 'planner'
            ? validated(ProviderPlanSchema, reply.output)
            : validated(ProviderImplementationSchema, reply.output);
        const invocation = validated(InvocationSchema, reply.invocation);
        if (
          invocation.runId !== run.id ||
          invocation.workspaceId !== execution.workspaceId ||
          invocation.transport !== 'fake' ||
          invocation.stage !== stage ||
          invocation.responseHash !== digest(JSON.stringify(output))
        )
          fail('PROVIDER_FAILURE');
        execution.invocations.push(invocation);
        return output;
      };
      const plan = await call('planner');
      if (plan.stage !== 'planner') fail('PROVIDER_FAILURE');
      if (
        new Set(plan.fileChanges).size !== plan.fileChanges.length ||
        plan.fileChanges.some(
          (path) => !this.files.some((file) => file.path === path),
        )
      )
        fail('PROVIDER_FAILURE');
      execution.plan = plan;
      await move('PLANNED');
      const implementation = await call('implementer');
      if (implementation.stage !== 'implementer') fail('PROVIDER_FAILURE');
      const expected = expectedReplacements(
        this.files,
        implementation.request,
        plan,
      );
      execution.implementation = implementation;
      execution.tool = {
        capability: 'replace',
        status: 'pending',
        executed: false,
        baseHash: execution.targetHash,
        resultHash: null,
        error: null,
      };
      await move('IMPLEMENTING');
      await check();
      category = 'WORKER_FAILURE';
      workerAttempted = true;
      const result = await this.worker(
        structuredClone(this.files),
        structuredClone(implementation.request),
        signal,
      );
      await check();
      if (
        !result ||
        typeof result !== 'object' ||
        !('files' in result) ||
        !('baseHash' in result) ||
        !('resultHash' in result)
      )
        fail('WORKER_FAILURE');
      const changed = validated(SourceSnapshotSchema, result.files);
      if (
        result.baseHash !== execution.targetHash ||
        result.resultHash !== snapshotHash(expected) ||
        snapshotHash(changed) !== snapshotHash(expected)
      )
        fail('WORKER_FAILURE');
      const changes = this.files.flatMap((file) => {
        const after = changed.find(
          (value) => value.path === file.path,
        )!.content;
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
      execution.tool = {
        ...execution.tool,
        status: 'completed',
        executed: true,
        resultHash: snapshotHash(changed),
      };
      execution.artifact = {
        baseHash: execution.targetHash,
        resultHash: snapshotHash(changed),
        diffHash: digest(JSON.stringify(changes)),
        changes,
      };
      return await move('IMPLEMENTED_UNVERIFIED');
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
        : category;
      if (execution.tool)
        execution.tool = {
          ...execution.tool,
          status: 'failed',
          executed: workerAttempted ? null : false,
          error: code === 'CANCELLED' ? 'CANCELLED' : 'WORKER_FAILURE',
        };
      return await move(code === 'CANCELLED' ? 'CANCELLED' : 'FAILED', code);
    } finally {
      clearTimeout(timer);
    }
  }
}
function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
function snapshotHash(files: SourceFile[]) {
  return digest(
    JSON.stringify(
      [...files].sort((a, b) =>
        a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
      ),
    ),
  );
}
function expectedReplacements(
  files: SourceFile[],
  request: { files: { path: string; content: string; beforeHash: string }[] },
  plan: ProviderPlan,
): SourceFile[] {
  const seen = new Set<string>();
  for (const edit of request.files) {
    const file = files.find((value) => value.path === edit.path);
    if (
      !file ||
      !plan.fileChanges.includes(edit.path) ||
      seen.has(edit.path) ||
      edit.beforeHash !== digest(file.content) ||
      Buffer.byteLength(edit.content) > 8192
    )
      fail('PROVIDER_FAILURE');
    seen.add(edit.path);
  }
  return files.map((file) => ({
    path: file.path,
    content:
      request.files.find((edit) => edit.path === file.path)?.content ??
      file.content,
  }));
}
