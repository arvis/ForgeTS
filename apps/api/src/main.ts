import { localConfig, DomainError } from '@forgets/contracts';
import { FactoryService } from '@forgets/core';
import { PgRepository } from '@forgets/persistence';
import { mockAgent } from '@forgets/agents';
import { createApi } from './index.js';

async function main() {
  const config = localConfig(process.env);
  const repository = new PgRepository(config);
  const service = new FactoryService(repository, mockAgent);
  try {
    await repository.start();
    const app = await createApi(service, repository, config);
    process.stdout.write(
      `ForgeTS mock API listening on ${await app.getUrl()}\n`,
    );
    let closing = false;
    const shutdown = async () => {
      if (closing) return;
      closing = true;
      await app.close();
      await service.close();
      await repository.close();
    };
    for (const signal of ['SIGINT', 'SIGTERM'] as const)
      process.once(signal, () => {
        void shutdown().catch(() => {
          process.stderr.write('SHUTDOWN_FAILED\n');
          process.exitCode = 1;
        });
      });
  } catch (error) {
    await service.close();
    await repository.close();
    throw error;
  }
}
await main().catch((error) => {
  process.stderr.write(
    `${error instanceof DomainError ? error.code : 'STARTUP_FAILED'}\n`,
  );
  process.exitCode = 1;
});
