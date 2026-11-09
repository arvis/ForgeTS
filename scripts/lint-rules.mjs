import assert from 'node:assert/strict';
import process from 'node:process';
import { ESLint } from 'eslint';

const eslint = new ESLint();
const prefix =
  'async function task(): Promise<void> {} function callback(fn: () => void) { fn(); } ';
const negative = await eslint.lintText(prefix + 'task(); callback(task);', {
  filePath: 'packages/core/src/index.ts',
});
const ids = negative.flatMap((result) =>
  result.messages.map((message) => message.ruleId),
);
assert.ok(ids.includes('@typescript-eslint/no-floating-promises'));
assert.ok(ids.includes('@typescript-eslint/no-misused-promises'));
const positive = await eslint.lintText(
  prefix + 'await task(); callback(() => { void task().catch(() => {}); });',
  { filePath: 'packages/core/src/index.ts' },
);
assert.equal(
  positive.reduce((count, result) => count + result.errorCount, 0),
  0,
);
process.stdout.write(
  'Typed promise rules rejected both unsafe cases and accepted handled cases.\n',
);
