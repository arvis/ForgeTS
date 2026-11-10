import { z } from 'zod';
import { SourceSnapshotSchema } from './provider.js';

export const CHECK_IDS = ['format', 'lint', 'typecheck', 'test'] as const;
export const CHECK_COMMANDS = {
  format: [
    [
      '/usr/local/bin/node',
      '/opt/forgets/node_modules/prettier/bin/prettier.cjs',
      '--config',
      '/opt/forgets/prettier.json',
      '--check',
      '/workspace/src/main.ts',
    ],
  ],
  lint: [
    [
      '/usr/local/bin/node',
      '/opt/forgets/node_modules/eslint/bin/eslint.js',
      '--config',
      '/opt/forgets/eslint.config.mjs',
      '--max-warnings',
      '0',
      '/workspace/src/main.ts',
    ],
  ],
  typecheck: [
    [
      '/usr/local/bin/node',
      '/opt/forgets/node_modules/typescript/bin/tsc',
      '--project',
      '/opt/forgets/tsconfig.json',
      '--noEmit',
    ],
  ],
  test: [
    [
      '/usr/local/bin/node',
      '/opt/forgets/node_modules/typescript/bin/tsc',
      '--project',
      '/opt/forgets/tsconfig.json',
    ],
    [
      '/usr/local/bin/node',
      '--test',
      '--test-reporter=/opt/forgets/reporter.mjs',
      '/opt/forgets/greeting.test.mjs',
    ],
  ],
} as const;
export const CheckRequestSchema = z.strictObject({
  check: z.enum(CHECK_IDS),
  attempt: z.number().int().min(0).max(2),
  workspaceId: z.uuid(),
  files: SourceSnapshotSchema,
});
export const ToolchainSchema = z.strictObject({
  version: z.literal('m3-v1'),
  imageId: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  baseImage: z.string().regex(/^node@sha256:[a-f0-9]{64}$/),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  versions: z.strictObject({
    typescript: z.literal('5.9.3'),
    eslint: z.literal('10.14.0'),
    prettier: z.literal('3.9.10'),
    'typescript-eslint': z.literal('8.72.1'),
  }),
});
export const RawCheckSchema = z.strictObject({
  sourcesChanged: z.boolean(),
  exitCode: z.number().int().min(0).max(255).nullable(),
  signal: z.string().max(16).nullable(),
  timedOut: z.boolean(),
  stdoutTruncated: z.boolean(),
  stderrTruncated: z.boolean(),
  stdout: z.string().max(512),
  stderr: z.string().max(512),
  commandsExecuted: z.number().int().min(0).max(2),
  toolDurationMs: z.number().int().min(0).max(12000),
});
export const CheckResultSchema = z
  .strictObject({
    errorCode: z
      .enum([
        'CHECK_CAPTURE',
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
      ])
      .nullable(),
    sourcesChanged: z.boolean().nullable(),
    id: z.uuid(),
    kind: z.literal('actual'),
    registry: z.literal('m3-nest-greeting-v1'),
    check: z.enum(CHECK_IDS),
    attempt: z.number().int().min(0).max(2),
    workspaceId: z.uuid(),
    inputHash: z.string().regex(/^[a-f0-9]{64}$/),
    imageId: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    toolchainHash: z.string().regex(/^[a-f0-9]{64}$/),
    commands: z
      .array(z.array(z.string().max(256)).max(12))
      .min(1)
      .max(2),
    exitCode: z.number().int().min(0).max(255).nullable(),
    signal: z.string().max(16).nullable(),
    timedOut: z.boolean(),
    cancelled: z.boolean(),
    resourceExhausted: z.boolean(),
    stdoutTruncated: z.boolean(),
    stderrTruncated: z.boolean(),
    evidenceAvailable: z.boolean(),
    cleanup: z.enum(['confirmed', 'unconfirmed']),
    stdout: z.string().max(512),
    stderr: z.string().max(512),
    commandsExecuted: z.number().int().min(0).max(2),
    durationMs: z.number().int().min(0).max(225000),
    toolDurationMs: z.number().int().min(0).max(12000).nullable(),
    outcome: z.enum(['pass', 'fail']),
  })
  .superRefine((result, ctx) => {
    if (
      JSON.stringify(result.commands) !==
      JSON.stringify(CHECK_COMMANDS[result.check])
    )
      ctx.addIssue({ code: 'custom', message: 'Registry mismatch' });
    if (
      result.outcome === 'pass' &&
      (result.exitCode !== 0 ||
        result.errorCode !== null ||
        result.sourcesChanged !== false ||
        result.signal !== null ||
        result.timedOut ||
        result.cancelled ||
        result.resourceExhausted ||
        result.stdoutTruncated ||
        result.stderrTruncated ||
        !result.evidenceAvailable ||
        result.cleanup !== 'confirmed' ||
        result.commandsExecuted !== CHECK_COMMANDS[result.check].length)
    )
      ctx.addIssue({ code: 'custom', message: 'Unproven pass' });
  });
export type CheckResult = z.infer<typeof CheckResultSchema>;
export function passingRound(
  results: unknown,
  hash: string,
  attempt: number,
): boolean {
  const parsed = z.array(CheckResultSchema).length(4).safeParse(results);
  if (!parsed.success) return false;
  const first = parsed.data[0]!;
  return (
    parsed.data.every(
      (result, index) =>
        result.check === CHECK_IDS[index] &&
        result.outcome === 'pass' &&
        result.inputHash === hash &&
        result.attempt === attempt &&
        result.workspaceId === first.workspaceId &&
        result.imageId === first.imageId &&
        result.toolchainHash === first.toolchainHash,
    ) && new Set(parsed.data.map((result) => result.id)).size === 4
  );
}
