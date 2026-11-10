import { DomainError } from '@forgets/contracts';
import { runSandboxCli } from './sandbox.js';
await runSandboxCli(process.argv.slice(2), process.env).then(
  (run) => {
    process.stdout.write(JSON.stringify(run, null, 2) + '\n');
    if (run.state === 'FAILED' || run.state === 'CANCELLED')
      process.exitCode = 1;
  },
  (error) => {
    process.stderr.write(
      (error instanceof DomainError ? error.code : 'SANDBOX_FAILED') + '\n',
    );
    process.exitCode = 1;
  },
);
