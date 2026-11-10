import { randomUUID } from 'node:crypto';
import {
  CHECK_COMMANDS,
  CheckRequestSchema,
  CheckResultSchema,
  RawCheckSchema,
  type CheckResult,
} from '@forgets/contracts';
import { parseSnapshot, snapshotHash } from '@forgets/agents';
import { executeTrustedWorker } from './docker.js';
import { readToolchain } from './toolchain.js';
import { CHECK_WORKER } from './check-worker.js';
export { passingRound } from '@forgets/contracts';
export function parseCheckRequest(input: unknown) {
  try {
    const parsed = CheckRequestSchema.parse(input);
    const files = parseSnapshot(parsed.files);
    if (files.length !== 1 || files[0]!.path !== 'src/main.ts')
      throw new Error();
    return { ...parsed, files };
  } catch {
    throw new Error('CHECK_DENIED');
  }
}
export function redactDiagnostics(value: string): string {
  return value
    .split(String.fromCharCode(27))
    .map((part, index) =>
      index === 0 ? part : part.replace(/^\[[0-9;]*[a-zA-Z]/, ''),
    )
    .join('')
    .replace(/Bearer\s+\S+/gi, '[REDACTED]')
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/g, '$1[REDACTED]@');
}
export async function runCheck(
  input: unknown,
  signal: AbortSignal,
  assertOwner?: () => Promise<void>,
): Promise<CheckResult> {
  const request = parseCheckRequest(input);
  const toolchain = await readToolchain();
  const start = performance.now();
  const base = {
    id: randomUUID(),
    kind: 'actual' as const,
    registry: 'm3-nest-greeting-v1' as const,
    check: request.check,
    attempt: request.attempt,
    workspaceId: request.workspaceId,
    inputHash: snapshotHash(request.files),
    imageId: toolchain.imageId,
    toolchainHash: toolchain.sourceHash,
    commands: CHECK_COMMANDS[request.check],
  };
  try {
    const raw = RawCheckSchema.parse(
      JSON.parse(
        await executeTrustedWorker(
          CHECK_WORKER,
          JSON.stringify({ check: request.check, files: request.files }),
          signal,
          assertOwner,
          'verification',
          toolchain.imageId,
        ),
      ) as unknown,
    );
    const stdout = redactDiagnostics(raw.stdout);
    const stderr = redactDiagnostics(raw.stderr);
    const outcome =
      raw.exitCode === 0 &&
      !raw.sourcesChanged &&
      !raw.signal &&
      !raw.timedOut &&
      !raw.stdoutTruncated &&
      !raw.stderrTruncated &&
      raw.commandsExecuted === CHECK_COMMANDS[request.check].length
        ? 'pass'
        : 'fail';
    return CheckResultSchema.parse({
      ...base,
      ...raw,
      errorCode: null,
      stdout,
      stderr,
      cancelled: false,
      resourceExhausted: false,
      evidenceAvailable: true,
      cleanup: 'confirmed',
      durationMs: Math.ceil(performance.now() - start),
      outcome,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    return CheckResultSchema.parse({
      ...base,
      sourcesChanged: null,
      errorCode: [
        'WORKER_TIMEOUT',
        'WORKER_CANCELLED',
        'WORKER_RESOURCE',
        'WORKER_OUTPUT',
        'WORKER_FAILED',
        'WORKER_UNAVAILABLE',
        'WORKER_CLEANUP',
        'WORKER_BUSY',
        'WORKER_UNSUPPORTED',
        'CHECK_TOOLCHAIN',
      ].includes(code)
        ? code
        : 'CHECK_CAPTURE',
      exitCode: null,
      signal: null,
      timedOut: code === 'WORKER_TIMEOUT',
      cancelled: signal.aborted,
      resourceExhausted: code === 'WORKER_RESOURCE',
      stdoutTruncated: code === 'WORKER_OUTPUT',
      stderrTruncated: false,
      stdout: '',
      stderr: '',
      commandsExecuted: 0,
      toolDurationMs: null,
      evidenceAvailable: false,
      cleanup: code === 'WORKER_CLEANUP' ? 'unconfirmed' : 'confirmed',
      durationMs: Math.ceil(performance.now() - start),
      outcome: 'fail',
    });
  }
}
