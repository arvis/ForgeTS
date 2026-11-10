import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  ResponsesProvider,
  type ProviderInput,
  type Transport,
} from '../src/provider.js';
import { contentHash } from '../src/capability-policy.js';
const key = 'fixture-key-not-a-real-credential';
const config = {
  provider: 'openai',
  model: 'fixture-model',
  apiKey: key,
  allowPaid: false,
  deadlineMs: 30,
};
const context = () => ({ runId: randomUUID(), workspaceId: randomUUID() });
const files = [
  { path: 'src/app.service.ts', content: 'export const greeting = "hello";\n' },
];
const spec = {
  title: 'Greeting',
  goal: 'Change greeting',
  requirements: ['Use bounded replacements'],
  acceptanceCriteria: ['Hello becomes hi'],
  constraints: ['No host tools'],
};
const input = (): ProviderInput => ({ stage: 'planner', spec, files });
const plan = {
  stage: 'planner' as const,
  summary: 'Change greeting',
  steps: ['Replace greeting'],
  fileChanges: ['src/app.service.ts'],
  testStrategy: ['M3 verification pending'],
  risks: [],
};
const response = (
  output: unknown = plan,
  extra: Record<string, unknown> = {},
) =>
  new Response(
    JSON.stringify({
      id: 'resp_fixture',
      status: 'completed',
      output: [
        {
          type: 'message',
          status: 'completed',
          role: 'assistant',
          content: [{ type: 'output_text', text: JSON.stringify(output) }],
        },
      ],
      ...extra,
    }),
  );
const fake: Transport = () => Promise.resolve(response());

await test('rejects paid opt-in before any injected transport can execute', () => {
  let calls = 0;
  const transport: Transport = () => {
    calls++;
    return Promise.resolve(response());
  };
  assert.throws(
    () =>
      new ResponsesProvider(
        { ...config, allowPaid: true },
        context(),
        transport,
      ),
    /^Error: PROVIDER_CONFIG$/,
  );
  assert.equal(calls, 0);
});
await test('rejects escaped credential echoes after parsing structured output', async () => {
  const escaped = key
    .split('')
    .map((char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
  const text = JSON.stringify({ ...plan, summary: key }).replace(key, escaped);
  const transport: Transport = () =>
    Promise.resolve(
      response(plan, {
        output: [
          {
            type: 'message',
            status: 'completed',
            role: 'assistant',
            content: [{ type: 'output_text', text }],
          },
        ],
      }),
    );
  await assert.rejects(
    new ResponsesProvider(config, context(), transport).invoke(
      input(),
      new AbortController().signal,
    ),
    /^Error: PROVIDER_RESPONSE$/,
  );
});
await test('cancels a streaming fake response body when the deadline expires', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const transport: Transport = () => Promise.resolve(new Response(stream));
  await assert.rejects(
    new ResponsesProvider(
      { ...config, deadlineMs: 10 },
      context(),
      transport,
    ).invoke(input(), new AbortController().signal),
    /^Error: PROVIDER_TIMEOUT$/,
  );
  assert.equal(cancelled, true);
});

await test('native transport stays disabled and unknown/missing configuration fails without network', async () => {
  await assert.rejects(
    new ResponsesProvider(config, context()).invoke(
      input(),
      new AbortController().signal,
    ),
    /^Error: PROVIDER_DISABLED$/,
  );
  for (const value of [
    { ...config, provider: 'other' },
    { ...config, endpoint: 'https://untrusted.invalid' },
    { ...config, apiKey: '' },
    { ...config, model: '' },
    { ...config, deadlineMs: 10001 },
  ])
    assert.throws(
      () => new ResponsesProvider(value, context(), fake),
      /^Error: PROVIDER_CONFIG$/,
    );
});
await test('malformed, refused, truncated, tool and wrong-stage responses fail closed with sanitized diagnostics', async () => {
  for (const transport of [
    () => Promise.resolve(new Response('{broken')),
    () => Promise.resolve(new Response(key, { status: 401 })),
    () => Promise.resolve(response(plan, { status: 'incomplete' })),
    () => Promise.resolve(response({ ...plan, stage: 'reviewer' })),
    () => Promise.resolve(response({ ...plan, allowShell: true })),
    () =>
      Promise.resolve(
        response(plan, { output: [{ type: 'function_call', name: 'shell' }] }),
      ),
    () => Promise.resolve(response({ ...plan, summary: key })),
    () => Promise.reject(new Error(key)),
    () =>
      Promise.resolve(
        response(plan, {
          usage: { input_tokens: 10, output_tokens: 2, total_tokens: 99 },
        }),
      ),
  ]) {
    await assert.rejects(
      new ResponsesProvider(config, context(), transport).invoke(
        input(),
        new AbortController().signal,
      ),
      /^Error: PROVIDER_RESPONSE$/,
    );
  }
});
await test('deadlines and cancellation bound ignored signals and consume attempts', async () => {
  let calls = 0;
  const hanging: Transport = () => {
    calls++;
    return new Promise(() => {});
  };
  const provider = new ResponsesProvider(
    { ...config, deadlineMs: 10 },
    context(),
    hanging,
  );
  await assert.rejects(
    provider.invoke(input(), new AbortController().signal),
    /^Error: PROVIDER_TIMEOUT$/,
  );
  const controller = new AbortController();
  const task = provider.invoke(input(), controller.signal);
  controller.abort();
  await assert.rejects(task, /^Error: PROVIDER_CANCELLED$/);
  await assert.rejects(
    provider.invoke(input(), new AbortController().signal),
    /^Error: PROVIDER_BUDGET$/,
  );
  assert.ok(calls <= 2);
});
await test('rejects excess input/output and concurrent dispatch without granting extra attempts', async () => {
  let called = 0;
  const provider = new ResponsesProvider(config, context(), () => {
    called++;
    return Promise.resolve(response());
  });
  await assert.rejects(
    provider.invoke(
      { ...input(), spec: { ...spec, goal: 'x'.repeat(20000) } },
      new AbortController().signal,
    ),
    /^Error: PROVIDER_INPUT$/,
  );
  assert.equal(called, 0);
  await assert.rejects(
    new ResponsesProvider(config, context(), () =>
      Promise.resolve(new Response('x'.repeat(65537))),
    ).invoke(input(), new AbortController().signal),
    /^Error: PROVIDER_RESPONSE$/,
  );
  const hanging = new ResponsesProvider(
    { ...config, deadlineMs: 10 },
    context(),
    () => new Promise(() => {}),
  );
  const task = hanging.invoke(input(), new AbortController().signal);
  await assert.rejects(
    hanging.invoke(input(), new AbortController().signal),
    /^Error: PROVIDER_BUSY$/,
  );
  await assert.rejects(task, /^Error: PROVIDER_TIMEOUT$/);
});
await test('builds fixed versioned JSON request and records fixture provenance and observed usage', async () => {
  let sent: RequestInit | undefined;
  const identity = context();
  const provider = new ResponsesProvider(config, identity, (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    sent = init;
    return Promise.resolve(
      response(plan, {
        usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 },
      }),
    );
  });
  const result = await provider.invoke(input(), new AbortController().signal);
  assert.deepEqual(result.output, plan);
  assert.equal(result.invocation.transport, 'fake');
  assert.equal(result.invocation.runId, identity.runId);
  assert.equal(result.invocation.workspaceId, identity.workspaceId);
  assert.equal(result.invocation.templateVersion, 'm2-v1');
  assert.deepEqual(result.invocation.usage, {
    inputTokens: 20,
    outputTokens: 10,
    totalTokens: 30,
  });
  assert.ok(!JSON.stringify(result).includes(key));
  assert.equal(sent?.redirect, 'error');
  const body = JSON.parse(sent?.body as string) as Record<string, unknown>;
  assert.equal(body.store, false);
  assert.equal(body.stream, false);
  assert.equal(body.max_output_tokens, 2048);
  assert.deepEqual(body.tools, []);
  assert.ok(!String(sent?.body).includes(key));
  assert.equal(
    (
      await new ResponsesProvider(config, context(), fake).invoke(
        input(),
        new AbortController().signal,
      )
    ).invocation.usage,
    null,
  );
});
await test('implementation output is validated against exact workspace preimages before exposure', async () => {
  const output = {
    stage: 'implementer',
    summary: 'Changed greeting',
    request: {
      capability: 'replace',
      files: [
        {
          path: files[0]!.path,
          beforeHash: contentHash(files[0]!.content),
          content: 'export const greeting = "hi";\n',
        },
      ],
    },
  };
  const result = await new ResponsesProvider(config, context(), () =>
    Promise.resolve(response(output)),
  ).invoke(
    { ...input(), stage: 'implementer', plan },
    new AbortController().signal,
  );
  assert.deepEqual(result.output, output);
  await assert.rejects(
    new ResponsesProvider(config, context(), () =>
      Promise.resolve(
        response({
          ...output,
          request: {
            ...output.request,
            files: [{ ...output.request.files[0], path: '../escape.ts' }],
          },
        }),
      ),
    ).invoke(
      { ...input(), stage: 'implementer', plan },
      new AbortController().signal,
    ),
    /^Error: PROVIDER_RESPONSE$/,
  );
});
