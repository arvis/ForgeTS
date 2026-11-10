import { createHash } from 'node:crypto';

export type SourceFile = { path: string; content: string };
export type Replacement = SourceFile & { beforeHash: string };
function deny(): never {
  throw new Error('CAPABILITY_DENIED');
}
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    deny();
  if (Reflect.ownKeys(value).length !== keys.length) deny();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable)
      deny();
  }
  return value as Record<string, unknown>;
}
function path(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 160 ||
    !/^src\/(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*\.ts$/.test(value)
  )
    deny();
  for (const part of value.split('/')) {
    if (
      part.endsWith('.') ||
      /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/.test(part)
    )
      deny();
  }
  return value;
}
function content(value: unknown): string {
  if (
    typeof value !== 'string' ||
    Buffer.byteLength(value) > 8192 ||
    Buffer.from(value, 'utf8').toString('utf8') !== value
  )
    deny();
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) deny();
  return value as unknown[];
}
function budget(value: unknown): void {
  if (Buffer.byteLength(JSON.stringify(value)) > 32768) deny();
}
export function contentHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
export function parseSnapshot(input: unknown): SourceFile[] {
  const result = array(input).map((entry) => {
    const file = record(entry, ['path', 'content']);
    return { path: path(file.path), content: content(file.content) };
  });
  const names = new Set<string>();
  for (const file of result) {
    if (
      names.has(file.path) ||
      result.some(
        (other) => other !== file && other.path.startsWith(file.path + '/'),
      )
    )
      deny();
    names.add(file.path);
  }
  budget(result);
  return result;
}
export function snapshotHash(snapshot: unknown): string {
  const sorted = parseSnapshot(snapshot).sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  return contentHash(JSON.stringify(sorted));
}
export function applyReplacements(
  snapshot: unknown,
  input: unknown,
): SourceFile[] {
  const files = parseSnapshot(snapshot);
  const request = record(input, ['capability', 'files']);
  if (request.capability !== 'replace') deny();
  const names = new Set<string>();
  const edits = array(request.files).map((entry) => {
    const edit = record(entry, ['path', 'content', 'beforeHash']);
    const name = path(edit.path);
    const replacement = content(edit.content);
    const original = files.find((file) => file.path === name);
    if (
      !original ||
      names.has(name) ||
      edit.beforeHash !== contentHash(original.content)
    )
      deny();
    names.add(name);
    return { path: name, content: replacement, beforeHash: edit.beforeHash };
  });
  budget({ capability: 'replace', files: edits });
  return parseSnapshot(
    files.map((file) => {
      const edit = edits.find((item) => item.path === file.path);
      return { path: file.path, content: edit ? edit.content : file.content };
    }),
  );
}
