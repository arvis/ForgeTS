import { z } from 'zod';

const summary = z.string().min(1).max(512);
const path = z.string().min(1).max(160);
export const ProviderPlanSchema = z.strictObject({
  stage: z.literal('planner'),
  summary,
  steps: z.array(summary).min(1).max(8),
  fileChanges: z.array(path).max(8),
  testStrategy: z.array(summary).min(1).max(8),
  risks: z.array(summary).max(8),
});
export const ProviderImplementationSchema = z.strictObject({
  stage: z.literal('implementer'),
  summary,
  request: z.strictObject({
    capability: z.literal('replace'),
    files: z
      .array(
        z.strictObject({
          path,
          beforeHash: z.string().regex(/^[a-f0-9]{64}$/),
          content: z.string().max(8192),
        }),
      )
      .min(1)
      .max(8),
  }),
});
export type ProviderPlan = z.infer<typeof ProviderPlanSchema>;
export type ProviderImplementation = z.infer<
  typeof ProviderImplementationSchema
>;
export const TokenUsageSchema = z
  .strictObject({
    inputTokens: z.number().int().min(0).max(32768),
    outputTokens: z.number().int().min(0).max(2048),
    totalTokens: z.number().int().min(0).max(34816),
  })
  .refine(
    (value) => value.totalTokens === value.inputTokens + value.outputTokens,
  );
export const InvocationSchema = z.strictObject({
  id: z.uuid(),
  runId: z.uuid(),
  workspaceId: z.uuid(),
  provider: z.literal('openai'),
  transport: z.enum(['fake', 'network']),
  model: z.string().min(1).max(128),
  templateVersion: z.literal('m2-v1'),
  stage: z.enum(['planner', 'implementer']),
  responseHash: z.string().regex(/^[a-f0-9]{64}$/),
  usage: TokenUsageSchema.nullable(),
});
export type Invocation = z.infer<typeof InvocationSchema>;
export const ProviderContextSchema = z.strictObject({
  runId: z.uuid(),
  workspaceId: z.uuid(),
});
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const SourceSnapshotSchema = z
  .array(
    z.strictObject({
      path: z.string().min(1).max(160),
      content: z.string().max(8192),
    }),
  )
  .min(1)
  .max(8);
export const SandboxSubmissionSchema = z.strictObject({
  mode: z.literal('sandbox-fixture'),
  target: z.literal('nest-greeting-v1'),
  markdown: z.string().max(8192),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
});
export const SandboxExecutionSchema = z.strictObject({
  target: z.literal('nest-greeting-v1'),
  workspaceId: z.uuid(),
  targetHash: digest,
  providerAttempts: z.number().int().min(0).max(2),
  invocations: z.array(InvocationSchema).max(2),
  plan: ProviderPlanSchema.nullable(),
  implementation: ProviderImplementationSchema.nullable(),
  tool: z
    .strictObject({
      capability: z.literal('replace'),
      status: z.enum(['pending', 'completed', 'failed', 'unknown']),
      executed: z.boolean().nullable(),
      baseHash: digest,
      resultHash: digest.nullable(),
      error: z.enum(['WORKER_FAILURE', 'CANCELLED', 'INTERRUPTED']).nullable(),
    })
    .nullable(),
  artifact: z
    .strictObject({
      baseHash: digest,
      resultHash: digest,
      diffHash: digest,
      changes: z
        .array(
          z.strictObject({
            path: z.string().max(160),
            before: z.string().max(8192),
            after: z.string().max(8192),
            beforeHash: digest,
            afterHash: digest,
          }),
        )
        .max(8),
    })
    .nullable(),
});
export type SandboxExecution = z.infer<typeof SandboxExecutionSchema>;
export const ProviderConfigSchema = z.strictObject({
  provider: z.literal('openai'),
  model: z.string().regex(/^[a-zA-Z0-9._:-]{1,128}$/),
  apiKey: z
    .string()
    .min(1)
    .max(512)
    .regex(/^[!-~]+$/),
  allowPaid: z.literal(false).default(false),
  deadlineMs: z.number().int().min(1).max(10000).default(10000),
});
export function providerJSONSchema(stage: 'planner' | 'implementer') {
  const schema = z.toJSONSchema(
    stage === 'planner' ? ProviderPlanSchema : ProviderImplementationSchema,
  );
  delete schema.$schema;
  return schema;
}
