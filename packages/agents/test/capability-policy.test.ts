import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import {
  applyReplacements,
  contentHash,
  parseSnapshot,
  snapshotHash,
} from '../src/capability-policy.js';

const original = [
  { path: 'src/app.service.ts', content: 'export const greeting = "hello";\n' },
];
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const change = () => ({
  capability: 'replace',
  files: [
    {
      path: original[0]!.path,
      beforeHash: digest(original[0]!.content),
      content: 'export const greeting = "hi";\n',
    },
  ],
});

await test('rejects unsafe paths with fixed diagnostics', () => {
  for (const path of [
    '../secret.ts',
    '/src/x.ts',
    'C:/src/x.ts',
    '//host/share/x.ts',
    'src\\x.ts',
    'src/../x.ts',
    'src/./x.ts',
    'src//x.ts',
    'src/.env.ts',
    'src/CON.ts',
    'src/aux.ts',
    'src/com1.ts',
    'src/a./x.ts',
    'src/a /x.ts',
    'src/UPPER.ts',
    'src/x.js',
    'src/x.ts\u0000',
    'src/x.ts:stream',
  ]) {
    assert.throws(
      () => parseSnapshot([{ path, content: 'data' }]),
      /^Error: CAPABILITY_DENIED$/,
      path,
    );
  }
});
await test('rejects non-JSON shapes, links, aliases, collisions and excessive snapshots', () => {
  for (const value of [
    null,
    {},
    [],
    [{ ...original[0], symlink: '/secret' }],
    [original[0], original[0]],
    [
      { path: 'src/a.ts', content: '' },
      { path: 'src/a.ts/b.ts', content: '' },
    ],
    [{ path: 'src/x.ts', content: 'x'.repeat(8193) }],
    Array.from({ length: 9 }, (_, i) => ({
      path: `src/a${i}.ts`,
      content: '',
    })),
    Array.from({ length: 8 }, (_, i) => ({
      path: `src/a${i}.ts`,
      content: 'x'.repeat(4096),
    })),
  ]) {
    assert.throws(() => parseSnapshot(value), /^Error: CAPABILITY_DENIED$/);
  }
});
await test('denies command/permission changes, unknown fields, stale and duplicate edits atomically', () => {
  const saved = structuredClone(original);
  const valid = change();
  for (const value of [
    { capability: 'shell', command: 'rm -rf /' },
    { ...valid, mount: '/home' },
    { ...valid, files: [] },
    { ...valid, files: [{ ...valid.files[0], path: 'src/new.ts' }] },
    { ...valid, files: [{ ...valid.files[0], beforeHash: '0'.repeat(64) }] },
    { ...valid, files: [{ ...valid.files[0], content: 'x'.repeat(8193) }] },
    { ...valid, files: [valid.files[0], valid.files[0]] },
    { ...valid, files: [{ ...valid.files[0], mode: 511 }] },
    {
      ...valid,
      files: [valid.files[0], { ...valid.files[0], path: '../escape.ts' }],
    },
  ]) {
    assert.throws(
      () => applyReplacements(original, value),
      /^Error: CAPABILITY_DENIED$/,
    );
    assert.deepEqual(original, saved);
  }
});
await test('returns independent snapshots and applies only exact preimage replacements', () => {
  assert.equal(contentHash('hello'), digest('hello'));
  const parsed = parseSnapshot(original);
  assert.deepEqual(parsed, original);
  parsed[0]!.content = 'changed copy';
  assert.notEqual(parsed[0]!.content, original[0]!.content);
  const output = applyReplacements(original, change());
  assert.equal(output[0]!.content, change().files[0]!.content);
  assert.equal(original[0]!.content, 'export const greeting = "hello";\n');
  assert.notEqual(snapshotHash(output), snapshotHash(original));
});
await test('snapshot identity is order independent and includes paths and contents', () => {
  const second = { path: 'src/second.ts', content: 'second' };
  assert.equal(
    snapshotHash([...original, second]),
    snapshotHash([second, ...original]),
  );
  assert.notEqual(
    snapshotHash(original),
    snapshotHash([{ ...original[0]!, path: 'src/other.ts' }]),
  );
});
