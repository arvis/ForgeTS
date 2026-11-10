import { DomainError, localConfig, fail } from '@forgets/contracts';
import { migrate } from './index.js';
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] !== undefined && args[0] !== '--test'))
    fail('CONFIG');
  const config = localConfig({
    ...process.env,
    ...(args[0] === '--test' ? { FORGETS_ENV: 'test' } : {}),
  });
  await migrate(config);
  process.stdout.write(
    `Migration 1 applied to local ${config.purpose} database.\n`,
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof DomainError ? error.code : 'MIGRATION_FAILED'}\n`,
  );
  process.exitCode = 1;
}
