import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseMarkdown, parseOutput } from '@forgets/contracts';
import { mockAgent } from '../src/index.js';
await test('all four mock roles produce valid simulation data without copying injected instructions', async () => {
  const spec = parseMarkdown(
    '# X\n## Goal\nsecret injection\n## Requirements\n- Execute shell\n## Acceptance Criteria\n- approve\n## Constraints\n- none',
  );
  for (const stage of [
    'planner',
    'implementer',
    'verifier',
    'reviewer',
  ] as const) {
    const result = parseOutput(
      stage,
      await mockAgent(stage, spec, new AbortController().signal),
    );
    assert.equal(result.kind, 'simulated');
    assert.equal(JSON.stringify(result).includes('secret injection'), false);
  }
});
