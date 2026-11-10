import { z } from 'zod';
export {
  ProviderPlanSchema,
  ProviderImplementationSchema,
  TokenUsageSchema,
  InvocationSchema,
  ProviderContextSchema,
  ProviderConfigSchema,
  providerJSONSchema,
  type ProviderPlan,
  type ProviderImplementation,
  type Invocation,
} from './provider.js';

export const MAX_BYTES = 65_536;
export const MAX_TRANSITIONS = 20;
export const RUN_DEADLINE_MS = 30_000;
export const codes = [
  'VALIDATION',
  'CONFIG',
  'TRANSITION',
  'CONFLICT',
  'BUSY',
  'NOT_FOUND',
  'PERSISTENCE',
  'OWNER_BUSY',
  'CANCELLED',
  'DEADLINE',
  'BUDGET',
  'MOCK_FAILURE',
  'INTERRUPTED',
] as const;
export type ErrorCode = (typeof codes)[number];
export class DomainError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
    this.name = 'DomainError';
  }
}
export function fail(code: ErrorCode): never {
  throw new DomainError(code);
}
export function bounded(value: unknown): void {
  try {
    if (Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8') > MAX_BYTES)
      fail('VALIDATION');
  } catch {
    fail('VALIDATION');
  }
}
export function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  bounded(value);
  const result = schema.safeParse(value);
  if (!result.success) fail('VALIDATION');
  return result.data;
}
const text = z.string().trim().min(1).max(4096);
const items = z.array(text).min(1).max(32);
export const FeatureSpecSchema = z.strictObject({
  title: text,
  goal: text,
  requirements: items,
  acceptanceCriteria: items,
  constraints: items,
});
export type FeatureSpec = z.infer<typeof FeatureSpecSchema>;
export function parseMarkdown(value: unknown): FeatureSpec {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > MAX_BYTES)
    fail('VALIDATION');
  const lines = value.replace(/\r\n/g, '\n').trim().split('\n');
  const title = lines.shift()?.match(/^# (.+)$/)?.[1];
  const sections = new Map<string, string[]>();
  let section: string | undefined;
  for (const line of lines) {
    if (line.startsWith('#')) {
      const name = line.match(
        /^## (Goal|Requirements|Acceptance Criteria|Constraints)$/,
      )?.[1];
      if (!name || sections.has(name)) fail('VALIDATION');
      section = name;
      sections.set(name, []);
    } else if (line.trim()) {
      if (!section) fail('VALIDATION');
      sections.get(section)?.push(line.trim());
    }
  }
  const list = (name: string) =>
    (sections.get(name) ?? []).map((line) => {
      const match = line.match(/^- (.+)$/);
      if (!match) fail('VALIDATION');
      return match[1];
    });
  return validated(FeatureSpecSchema, {
    title,
    goal: (sections.get('Goal') ?? []).join(' '),
    requirements: list('Requirements'),
    acceptanceCriteria: list('Acceptance Criteria'),
    constraints: list('Constraints'),
  });
}
export const SubmissionSchema = z.strictObject({
  markdown: z.string().max(MAX_BYTES),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  mode: z.literal('mock').default('mock'),
});
export function parseSubmission(value: unknown) {
  return validated(SubmissionSchema, value);
}
export const states = [
  'CREATED',
  'SPEC_VALIDATED',
  'PLANNED',
  'IMPLEMENTING',
  'VERIFYING',
  'REVIEWING',
  'AWAITING_HUMAN_APPROVAL',
  'FAILED',
  'CANCELLED',
] as const;
export const StateSchema = z.enum(states);
export type State = z.infer<typeof StateSchema>;
export const activeStates: readonly State[] = states.slice(0, 6);
export const isActive = (state: State) => activeStates.includes(state);
export function transition(from: string, to: string): State {
  const source = StateSchema.safeParse(from);
  const target = StateSchema.safeParse(to);
  if (!source.success || !target.success || !isActive(source.data))
    fail('TRANSITION');
  const index = states.indexOf(source.data);
  if (
    target.data !== 'FAILED' &&
    target.data !== 'CANCELLED' &&
    states[index + 1] !== target.data
  )
    fail('TRANSITION');
  return target.data;
}
export const StageSchema = z.enum([
  'planner',
  'implementer',
  'verifier',
  'reviewer',
]);
export type Stage = z.infer<typeof StageSchema>;
const summary = z.string().min(1).max(512);
export const ImplementationPlanSchema = z.strictObject({
  stage: z.literal('planner'),
  kind: z.literal('simulated'),
  summary,
  steps: z.array(summary).min(1).max(8),
  fileChanges: z.array(summary).max(8),
  testStrategy: z.array(summary).min(1).max(8),
  risks: z.array(summary).max(8),
});
export const ImplementationSchema = z.strictObject({
  stage: z.literal('implementer'),
  kind: z.literal('simulated'),
  summary,
  changes: z.array(summary).max(8),
});
export const VerificationResultSchema = z.strictObject({
  stage: z.literal('verifier'),
  kind: z.literal('simulated'),
  summary,
  checks: z
    .array(
      z.strictObject({
        name: summary,
        outcome: z.enum(['pass', 'fail']),
        evidence: z.literal('fixture'),
      }),
    )
    .min(1)
    .max(8),
});
export const ReviewReportSchema = z.strictObject({
  stage: z.literal('reviewer'),
  kind: z.literal('simulated'),
  summary,
  recommendation: z.enum(['approve', 'reject']),
  concerns: z.array(summary).max(8),
  uncertainty: summary,
});
export const StageOutputSchema = z.discriminatedUnion('stage', [
  ImplementationPlanSchema,
  ImplementationSchema,
  VerificationResultSchema,
  ReviewReportSchema,
]);
export type StageOutput = z.infer<typeof StageOutputSchema>;
export function parseOutput(stage: Stage, value: unknown): StageOutput {
  const output = validated(StageOutputSchema, value);
  if (output.stage !== stage) fail('VALIDATION');
  return output;
}
export const ToolRequestSchema = z.strictObject({
  capability: z.literal('describe'),
  description: summary,
});
export const ToolResultSchema = z.strictObject({
  kind: z.literal('simulated'),
  executed: z.literal(false),
  summary,
});
export const FinalReportSchema = z.strictObject({
  mode: z.literal('mock'),
  mergeReady: z.literal(false),
  outcome: StateSchema,
  outputs: z.array(StageOutputSchema).max(4),
  error: z.enum(codes).nullable(),
  limitations: z.array(summary).min(1).max(8),
});
export type FinalReport = z.infer<typeof FinalReportSchema>;
export const FactoryRunSchema = z.strictObject({
  id: z.uuid(),
  key: z.string(),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  mode: z.literal('mock'),
  spec: FeatureSpecSchema,
  state: StateSchema,
  version: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  outputs: z.array(StageOutputSchema).max(4),
  report: FinalReportSchema.nullable(),
});
export type FactoryRun = z.infer<typeof FactoryRunSchema>;
export const EventSchema = z.strictObject({
  runId: z.uuid(),
  sequence: z.number().int().nonnegative(),
  state: StateSchema,
  at: z.iso.datetime(),
  error: z.enum(codes).nullable(),
});
export type RunEvent = z.infer<typeof EventSchema>;
export const CursorSchema = z.strictObject({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});
export type Cursor = z.infer<typeof CursorSchema>;
export function encodeCursor(cursor: Cursor) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}
const PageQuery = z.strictObject({
  limit: z
    .string()
    .regex(/^(?:[1-9]|[1-9][0-9]|100)$/)
    .optional(),
  cursor: z.string().max(256).optional(),
  state: StateSchema.optional(),
  after: z
    .string()
    .regex(/^\d{1,9}$/)
    .optional(),
});
export function parsePage(value: unknown) {
  const query = validated(PageQuery, value);
  let cursor: Cursor | undefined;
  if (query.cursor) {
    if (!/^[A-Za-z0-9_-]+$/.test(query.cursor)) fail('VALIDATION');
    try {
      cursor = validated(
        CursorSchema,
        JSON.parse(
          Buffer.from(query.cursor, 'base64url').toString('utf8'),
        ) as unknown,
      );
    } catch {
      fail('VALIDATION');
    }
  }
  return {
    limit: Number(query.limit ?? 20),
    cursor,
    state: query.state,
    after: query.after === undefined ? -1 : Number(query.after),
  };
}
export type Page = ReturnType<typeof parsePage>;
export type LocalConfig = {
  purpose: 'development' | 'test';
  host: '127.0.0.1';
  apiPort: number;
  database: string;
  user: string;
  password: string;
  port: number;
};
export function localConfig(
  env: Record<string, string | undefined>,
): LocalConfig {
  const allowed = new Set([
    'FORGETS_ENV',
    'FORGETS_HOST',
    'FORGETS_PORT',
    'FORGETS_DB_HOST',
    'FORGETS_DB_NAME',
    'FORGETS_DB_USER',
    'FORGETS_DB_PORT',
    'FORGETS_DB_PASSWORD',
  ]);
  if (
    Object.keys(env).some(
      (key) =>
        key.startsWith('FORGETS_') &&
        env[key] !== undefined &&
        !allowed.has(key),
    )
  )
    fail('CONFIG');
  if (
    Object.keys(env).some(
      (key) => (key.startsWith('PG') || key === 'DATABASE_URL') && env[key],
    )
  )
    fail('CONFIG');
  const purpose = env.FORGETS_ENV ?? 'development';
  if (purpose !== 'development' && purpose !== 'test') fail('CONFIG');
  const test = purpose === 'test';
  const database = test ? 'forgets_test' : 'forgets';
  const port = test ? 5434 : 5433;
  for (const [key, expected] of Object.entries({
    FORGETS_HOST: '127.0.0.1',
    FORGETS_DB_HOST: '127.0.0.1',
    FORGETS_DB_NAME: database,
    FORGETS_DB_USER: database,
    FORGETS_DB_PORT: String(port),
  })) {
    if (env[key] !== undefined && env[key] !== expected) fail('CONFIG');
  }
  if (
    env.FORGETS_DB_URL ||
    !env.FORGETS_DB_PASSWORD ||
    env.FORGETS_DB_PASSWORD.length > 256
  )
    fail('CONFIG');
  const apiPort = Number(env.FORGETS_PORT ?? (test ? 4311 : 4310));
  if (!Number.isInteger(apiPort) || apiPort < 1024 || apiPort > 65535)
    fail('CONFIG');
  return {
    purpose,
    host: '127.0.0.1',
    apiPort,
    database,
    user: database,
    password: env.FORGETS_DB_PASSWORD,
    port,
  };
}
