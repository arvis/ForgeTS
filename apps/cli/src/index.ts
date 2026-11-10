import { DomainError } from '@forgets/contracts';
import { runCli } from './client.js';
await runCli(process.argv.slice(2), process.env).then(
  (result) => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  },
  (error) => {
    process.stderr.write(
      `${error instanceof DomainError ? error.code : 'CLI_FAILED'}\n`,
    );
    process.exitCode = 1;
  },
);
