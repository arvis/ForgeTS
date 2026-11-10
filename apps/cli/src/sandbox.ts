import { open } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fail, localConfig, type FactoryRun } from '@forgets/contracts';
import { SandboxService } from '@forgets/core';
import { migrate, PgRepository } from '@forgets/persistence';
import {
  recoverAbandonedWorkers,
  replaceInWorker,
  SAMPLE_FILES,
  fixtureProvider,
} from '@forgets/runner';
export async function runSandboxCli(
  args: string[],
  env: Record<string, string | undefined>,
): Promise<FactoryRun> {
  if (
    args.length < 1 ||
    args.length > 2 ||
    !args[0]?.endsWith('.md') ||
    args[0].startsWith('-') ||
    (args[1] !== undefined && !/^[a-zA-Z0-9_-]{1,128}$/.test(args[1]))
  )
    fail('VALIDATION');
  const config = localConfig(env);
  let markdown: string;
  try {
    const handle = await open(args[0], 'r');
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 8192) fail('VALIDATION');
      const buffer = Buffer.alloc(8193);
      const read = await handle.read(buffer, 0, buffer.length, 0);
      if (read.bytesRead > 8192) fail('VALIDATION');
      markdown = new TextDecoder('utf8', { fatal: true }).decode(
        buffer.subarray(0, read.bytesRead),
      );
    } finally {
      await handle.close();
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
    const service = new SandboxService(
      repository,
      fixtureProvider,
      (files, request, signal) =>
        replaceInWorker(files, request, signal, () => repository.assertOwner()),
      SAMPLE_FILES,
    );
    return await service.run(
      {
        mode: 'sandbox-fixture',
        target: 'nest-greeting-v1',
        markdown,
        idempotencyKey: args[1] ?? randomUUID(),
      },
      controller.signal,
    );
  } finally {
    process.off('SIGINT', abort);
    process.off('SIGTERM', abort);
    await repository.close();
  }
}
