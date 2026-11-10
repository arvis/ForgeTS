import { open } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  DomainError,
  fail,
  MAX_BYTES,
  FactoryRunSchema,
  EventSchema,
  FinalReportSchema,
  validated,
  parseSubmission,
  parseMarkdown,
} from '@forgets/contracts';

export function apiEndpoint(env: Record<string, string | undefined>) {
  const raw = env.FORGETS_API_URL ?? 'http://127.0.0.1:4310';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    fail('CONFIG');
  }
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    Number(url.port) < 1024 ||
    Number(url.port) > 65535
  )
    fail('CONFIG');
  return url.origin;
}
export async function request(
  endpoint: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  try {
    const response = await fetch(endpoint + path, {
      method: body === undefined ? 'GET' : 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(35000),
      ...(body === undefined
        ? {}
        : {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      fail(
        response.status === 409
          ? 'CONFLICT'
          : response.status === 404
            ? 'NOT_FOUND'
            : response.status >= 500
              ? 'PERSISTENCE'
              : 'VALIDATION',
      );
    }
    if (!response.body) fail('VALIDATION');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 8 * 1024 * 1024) fail('VALIDATION');
        chunks.push(chunk.value);
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    fail('PERSISTENCE');
  }
}
export async function runCli(
  args: string[],
  env: Record<string, string | undefined> = {},
): Promise<unknown> {
  const [command, value, key, ...extra] = args;
  if (
    !command ||
    !['run', 'inspect', 'events', 'report', 'wait', 'cancel', 'list'].includes(
      command,
    ) ||
    extra.length
  )
    fail('VALIDATION');
  if (command === 'list' && (value || key)) fail('VALIDATION');
  if (command !== 'run' && command !== 'list' && (!value || key))
    fail('VALIDATION');
  if (command === 'run' && !value) fail('VALIDATION');
  const endpoint = apiEndpoint(env);
  if (command === 'run') {
    const handle = await open(value ?? '', 'r');
    let markdown: string;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_BYTES) fail('VALIDATION');
      const data = Buffer.alloc(MAX_BYTES + 1);
      const read = await handle.read(data, 0, data.length, 0);
      if (read.bytesRead > MAX_BYTES) fail('VALIDATION');
      markdown = data.subarray(0, read.bytesRead).toString('utf8');
    } finally {
      await handle.close();
    }
    const submission = parseSubmission({
      markdown,
      idempotencyKey: key ?? randomUUID(),
      mode: 'mock',
    });
    parseMarkdown(markdown);
    const admitted = validated(
      z.strictObject({ run: FactoryRunSchema, created: z.boolean() }),
      await request(endpoint, '/runs', submission),
    );
    return validated(
      FactoryRunSchema,
      await request(endpoint, `/runs/${admitted.run.id}/wait`),
    );
  }
  if (command === 'list')
    return z
      .strictObject({
        items: z.array(FactoryRunSchema).max(100),
        nextCursor: z.string().nullable(),
      })
      .parse(await request(endpoint, '/runs'));
  const id = validated(FactoryRunSchema.shape.id, value);
  const path = `/runs/${id}`;
  if (command === 'events')
    return z
      .strictObject({
        items: z.array(EventSchema).max(100),
        nextAfter: z.number().nullable(),
      })
      .parse(await request(endpoint, path + '/events'));
  if (command === 'report')
    return validated(
      FinalReportSchema.nullable(),
      await request(endpoint, path + '/report'),
    );
  return validated(
    FactoryRunSchema,
    await request(
      endpoint,
      path + (command === 'inspect' ? '' : `/${command}`),
      command === 'cancel' ? {} : undefined,
    ),
  );
}
