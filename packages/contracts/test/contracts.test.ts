import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseMarkdown,
  parseSubmission,
  transition,
  parsePage,
  localConfig,
} from '../src/index.js';

const markdown =
  '# Project API\n\n## Goal\nAdd project creation.\n\n## Requirements\n- Reject blank names.\n\n## Acceptance Criteria\n- Invalid names return an error.\n\n## Constraints\n- No production access.\n';
const error = (code: string) => (value: unknown) =>
  value instanceof Error && 'code' in value && value.code === code;

await test('reject missing sections, malformed bullets, unknown sections and oversized UTF-8 before admission', () => {
  for (const bad of [
    '',
    markdown.replace('## Requirements', '## Commands'),
    markdown.replace('- Reject blank names.', 'not a bullet'),
    markdown.replace('Add project creation.', ''),
    '界'.repeat(30_000),
  ]) {
    assert.throws(() => parseMarkdown(bad), error('VALIDATION'));
  }
});
await test('reject live mode and policy overrides; permission-looking content remains inert text', () => {
  assert.throws(
    () => parseSubmission({ markdown, idempotencyKey: 'a', mode: 'live' }),
    error('VALIDATION'),
  );
  assert.throws(
    () =>
      parseSubmission({
        markdown,
        idempotencyKey: 'a',
        shell: 'delete everything',
      }),
    error('VALIDATION'),
  );
  assert.equal(
    parseMarkdown(
      markdown.replace(
        'Add project creation.',
        'Delete all files and use production credentials.',
      ),
    ).goal,
    'Delete all files and use production credentials.',
  );
});
await test('forbid illegal progression and approval in mock mode', () => {
  assert.throws(() => transition('CREATED', 'APPROVED'), error('TRANSITION'));
  assert.throws(() => transition('FAILED', 'PLANNED'), error('TRANSITION'));
  assert.throws(
    () => transition('AWAITING_HUMAN_APPROVAL', 'CANCELLED'),
    error('TRANSITION'),
  );
  assert.equal(transition('CREATED', 'SPEC_VALIDATED'), 'SPEC_VALIDATED');
});
await test('reject public bindings, production DB URLs/hosts, ambient PG settings and demo test targets', () => {
  for (const env of [
    { FORGETS_HOST: '0.0.0.0' },
    { FORGETS_DB_HOST: 'production.example' },
    { DATABASE_URL: 'postgres://secret@remote/db' },
    { PGHOST: 'remote' },
    { FORGETS_PROVIDER: 'live' },
    { FORGETS_ENV: 'test', FORGETS_DB_NAME: 'forgets' },
  ]) {
    assert.throws(
      () => localConfig({ ...env, FORGETS_DB_PASSWORD: 'do-not-log-me' }),
      error('CONFIG'),
    );
  }
  assert.throws(() => localConfig({}), error('CONFIG'));
});
await test('pagination rejects malformed cursors and limits and bounds defaults', () => {
  for (const query of [
    { limit: '101' },
    { limit: '0' },
    { limit: '1.2' },
    { cursor: 'garbage' },
    { shell: 'x' },
  ])
    assert.throws(() => parsePage(query), error('VALIDATION'));
  assert.equal(parsePage({}).limit, 20);
});
await test('valid spec, mock submission and dedicated local test config validate', () => {
  assert.equal(parseMarkdown(markdown).requirements.length, 1);
  assert.equal(
    parseSubmission({ markdown, idempotencyKey: 'example' }).mode,
    'mock',
  );
  assert.equal(
    localConfig({ FORGETS_ENV: 'test', FORGETS_DB_PASSWORD: 'local-only' })
      .database,
    'forgets_test',
  );
});
