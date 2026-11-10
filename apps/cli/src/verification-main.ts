import { DomainError } from '@forgets/contracts';
import { runVerificationCli } from './verification.js';
await runVerificationCli(process.argv.slice(2), process.env).then(
  (run) => {
    process.stdout.write(JSON.stringify(run, null, 2) + '\n');
    if (run.state === 'FAILED' || run.state === 'CANCELLED')
      process.exitCode = 1;
  },
  (error) => {
    process.stderr.write(
      (error instanceof DomainError ? error.code : 'VERIFICATION_FAILED') +
        '\n',
    );
    process.exitCode = 1;
  },
);
