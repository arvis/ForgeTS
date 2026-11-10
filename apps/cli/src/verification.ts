import { open } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {
  fail,
  localConfig,
  parseMarkdown,
  type FactoryRun,
} from '@forgets/contracts';
import { SandboxService, VerificationService } from '@forgets/core';
import { migrate, PgRepository } from '@forgets/persistence';
import {
  fixtureProvider,
  fixtureRepair,
  runCheck,
  replaceInWorker,
  recoverAbandonedWorkers,
  SAMPLE_FILES,
  type RepairScenario,
} from '@forgets/runner';
export async function runVerificationCli(
  args: string[],
  env: Record<string, string | undefined>,
): Promise<FactoryRun> {
  if (
    args.length < 1 ||
    args.length > 3 ||
    !args[0]?.endsWith('.md') ||
    args[0].startsWith('-') ||
    (args[1] !== undefined &&
      ![
        'clean',
        'repair',
        'persistent',
        'malformed',
        'provider-failure',
      ].includes(args[1])) ||
    (args[2] !== undefined && !/^[a-zA-Z0-9_-]{1,96}$/.test(args[2]))
  )
    fail('VALIDATION');
  const scenario = (args[1] ?? 'repair') as RepairScenario;
  const key = args[2] ?? randomUUID();
  const config = localConfig(env);
  let markdown: string;
  try {
    const file = await open(args[0], 'r');
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 8192) fail('VALIDATION');
      const buffer = Buffer.alloc(8193);
      const result = await file.read(buffer, 0, buffer.length, 0);
      if (result.bytesRead > 8192) fail('VALIDATION');
      markdown = new TextDecoder('utf8', { fatal: true }).decode(
        buffer.subarray(0, result.bytesRead),
      );
      parseMarkdown(markdown);
    } finally {
      await file.close();
    }
  } catch {
    fail('VALIDATION');
  }
  await migrate(config);
  const repository = new PgRepository(config);
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  try {
    await repository.start();
    await recoverAbandonedWorkers(() => repository.assertOwner());
    const worker = (
      files: { path: string; content: string }[],
      request: unknown,
      signal: AbortSignal,
    ) =>
      replaceInWorker(files, request, signal, () => repository.assertOwner());
    const initial = new SandboxService(
      repository,
      (identity) =>
        fixtureProvider(identity, scenario === 'clean' ? 'none' : 'type'),
      worker,
      SAMPLE_FILES,
    );
    const run = await initial.run(
      {
        mode: 'sandbox-fixture',
        target: 'nest-greeting-v1',
        markdown,
        idempotencyKey: `m3_${scenario}_${key}`,
      },
      controller.signal,
    );
    if (run.state === 'FAILED' && !run.verification) return run;
    const service = new VerificationService(
      repository,
      (request, signal) =>
        runCheck(request, signal, () => repository.assertOwner()),
      (input) => fixtureRepair(input, scenario),
      worker,
      SAMPLE_FILES,
    );
    return await service.verify(run.id, controller.signal);
  } finally {
    process.off('SIGINT', abort);
    process.off('SIGTERM', abort);
    await repository.close();
  }
}
