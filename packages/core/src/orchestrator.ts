import { createHash } from 'node:crypto';
import {
  DomainError,
  fail,
  isActive,
  parseSubmission,
  parseMarkdown,
  parseOutput,
  validated,
  FinalReportSchema,
  RUN_DEADLINE_MS,
  MAX_TRANSITIONS,
  type FactoryRun,
  type Stage,
  type FeatureSpec,
  type StageOutput,
  type State,
  type ErrorCode,
} from '@forgets/contracts';
import type { Repository } from './ports.js';
export type Agent = (
  stage: Stage,
  spec: FeatureSpec,
  signal: AbortSignal,
) => Promise<unknown>;
export type Limits = {
  now?: () => number;
  deadlineMs?: number;
  maxTransitions?: number;
};
export class FactoryService {
  private readonly tasks = new Map<string, Promise<FactoryRun>>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly now: () => number;
  private readonly deadlineMs: number;
  private readonly maxTransitions: number;
  private closing = false;
  constructor(
    private readonly repository: Repository,
    private readonly agent: Agent,
    limits: Limits = {},
  ) {
    this.now = limits.now ?? Date.now;
    this.deadlineMs = limits.deadlineMs ?? RUN_DEADLINE_MS;
    this.maxTransitions = limits.maxTransitions ?? MAX_TRANSITIONS;
    if (
      !Number.isInteger(this.deadlineMs) ||
      this.deadlineMs < 1 ||
      this.deadlineMs > RUN_DEADLINE_MS ||
      !Number.isInteger(this.maxTransitions) ||
      this.maxTransitions < 1 ||
      this.maxTransitions > MAX_TRANSITIONS
    )
      fail('CONFIG');
  }
  async submit(input: unknown): Promise<{ run: FactoryRun; created: boolean }> {
    if (this.closing) fail('BUSY');
    const submission = parseSubmission(input);
    const spec = parseMarkdown(submission.markdown);
    const hash = createHash('sha256')
      .update(JSON.stringify(spec))
      .digest('hex');
    const admitted = await this.repository.admit(
      spec,
      submission.idempotencyKey,
      hash,
    );
    if (admitted.created) {
      const controller = new AbortController();
      this.controllers.set(admitted.run.id, controller);
      const task = Promise.resolve().then(() =>
        this.execute(admitted.run, controller),
      );
      this.tasks.set(admitted.run.id, task);
      // Background execution is observable through persisted state or wait(); prevent unhandled rejections.
      void task
        .finally(() => {
          this.tasks.delete(admitted.run.id);
          this.controllers.delete(admitted.run.id);
        })
        .catch(() => {});
    }
    return admitted;
  }
  async wait(id: string): Promise<FactoryRun> {
    return this.tasks.get(id) ?? this.repository.get(id);
  }
  async cancel(id: string): Promise<FactoryRun> {
    const run = await this.repository.get(id);
    if (!isActive(run.state)) fail('TRANSITION');
    const controller = this.controllers.get(id);
    if (!controller) fail('CONFLICT');
    controller.abort(new DomainError('CANCELLED'));
    return this.wait(id);
  }
  async close(): Promise<void> {
    this.closing = true;
    for (const controller of this.controllers.values())
      controller.abort(new DomainError('CANCELLED'));
    await Promise.allSettled(this.tasks.values());
  }
  private async execute(
    initial: FactoryRun,
    controller: AbortController,
  ): Promise<FactoryRun> {
    let run = initial;
    const started = this.now();
    const outputs: StageOutput[] = [];
    const check = () => {
      if (controller.signal.aborted)
        throw controller.signal.reason instanceof DomainError
          ? controller.signal.reason
          : new DomainError('CANCELLED');
      if (this.now() - started >= this.deadlineMs) fail('DEADLINE');
    };
    const report = (outcome: State, error: ErrorCode | null) =>
      validated(FinalReportSchema, {
        mode: 'mock',
        mergeReady: false,
        outcome,
        outputs,
        error,
        limitations: [
          'All agent work and verification are simulated.',
          'No generated code was executed.',
          'Review is advisory; no approval capability exists in M1.',
        ],
      });
    const move = async (state: State) => {
      check();
      if (run.version >= this.maxTransitions) fail('BUDGET');
      run = await this.repository.save(run, state, outputs, null, null);
    };
    const call = async (stage: Stage) => {
      check();
      const remaining = Math.max(1, this.deadlineMs - (this.now() - started));
      const value = await new Promise<unknown>((resolve, reject) => {
        const abort = () =>
          reject(
            controller.signal.reason instanceof DomainError
              ? controller.signal.reason
              : new DomainError('CANCELLED'),
          );
        const timer = setTimeout(
          () => controller.abort(new DomainError('DEADLINE')),
          remaining,
        );
        controller.signal.addEventListener('abort', abort, { once: true });
        const cleanup = () => {
          clearTimeout(timer);
          controller.signal.removeEventListener('abort', abort);
          controller.signal.removeEventListener('abort', cleanup);
        };
        Promise.resolve()
          .then(() => this.agent(stage, run.spec, controller.signal))
          .then(
            (value) => {
              cleanup();
              resolve(value);
            },
            (error) => {
              cleanup();
              reject(error);
            },
          );
        controller.signal.addEventListener('abort', cleanup, { once: true });
      });
      check();
      const output = parseOutput(stage, value);
      outputs.push(output);
      return output;
    };
    try {
      await move('SPEC_VALIDATED');
      await call('planner');
      await move('PLANNED');
      await move('IMPLEMENTING');
      await call('implementer');
      await move('VERIFYING');
      const verification = await call('verifier');
      if (
        verification.stage !== 'verifier' ||
        verification.checks.some((check) => check.outcome === 'fail')
      )
        fail('MOCK_FAILURE');
      await move('REVIEWING');
      const review = await call('reviewer');
      if (review.stage !== 'reviewer' || review.recommendation === 'reject')
        fail('MOCK_FAILURE');
      check();
      if (run.version >= this.maxTransitions) fail('BUDGET');
      return await this.repository.save(
        run,
        'AWAITING_HUMAN_APPROVAL',
        outputs,
        report('AWAITING_HUMAN_APPROVAL', null),
        null,
      );
    } catch (error) {
      if (
        error instanceof DomainError &&
        (error.code === 'PERSISTENCE' || error.code === 'CONFLICT')
      )
        throw error;
      const code = error instanceof DomainError ? error.code : 'MOCK_FAILURE';
      const state = code === 'CANCELLED' ? 'CANCELLED' : 'FAILED';
      return this.repository.save(
        run,
        state,
        outputs,
        report(state, code),
        code,
      );
    }
  }
}
