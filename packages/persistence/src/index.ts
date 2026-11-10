import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import {
  DomainError,
  fail,
  localConfig,
  validated,
  FactoryRunSchema,
  EventSchema,
  transition,
  encodeCursor,
  type LocalConfig,
  type FeatureSpec,
  type FactoryRun,
  type State,
  type StageOutput,
  type FinalReport,
  type ErrorCode,
  type Page,
  type RunEvent,
  type SandboxExecution,
  SandboxExecutionSchema,
} from '@forgets/contracts';
import type { Repository } from '@forgets/core';
import { migration1, migration2, migration3 } from './migrations.js';
const OWNER_KEY = 714_930_121;
function poolFor(input: LocalConfig) {
  const config = localConfig({
    FORGETS_ENV: input.purpose,
    FORGETS_HOST: input.host,
    FORGETS_DB_HOST: input.host,
    FORGETS_DB_NAME: input.database,
    FORGETS_DB_USER: input.user,
    FORGETS_DB_PORT: String(input.port),
    FORGETS_PORT: String(input.apiPort),
    FORGETS_DB_PASSWORD: input.password,
  });
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: false,
    max: 4,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
    query_timeout: 5000,
    lock_timeout: 3000,
    idle_in_transaction_session_timeout: 5000,
    options: '-c search_path=public',
    application_name: 'forgets_mock',
  });
}
async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DomainError) throw error;
    fail('PERSISTENCE');
  }
}
async function transaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
) {
  return protect(async () => {
    const client = await pool.connect();
    let broken = false;
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        broken = true;
      }
      throw error;
    } finally {
      client.release(broken);
    }
  });
}
export async function migrate(config: LocalConfig): Promise<void> {
  const pool = poolFor(config);
  pool.on('error', () => {
    /* Client errors surface through bounded operations. */
  });
  try {
    await protect(async () => {
      const client = await pool.connect();
      try {
        const lock = await client.query<{ locked: boolean }>(
          'SELECT pg_try_advisory_lock($1) AS locked',
          [OWNER_KEY],
        );
        if (!lock.rows[0]?.locked) fail('OWNER_BUSY');
        await client.query('BEGIN');
        try {
          await client.query(migration1);
          await client.query(migration2);
          await client.query(migration3);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } finally {
        client.release(true);
      }
    });
  } finally {
    await pool.end();
  }
}
export class PgRepository implements Repository {
  async record(run: FactoryRun): Promise<FactoryRun> {
    this.guard();
    if (
      run.mode !== 'sandbox-fixture' ||
      !run.verification ||
      !['VERIFYING', 'REPAIRING', 'IMPLEMENTING'].includes(run.state)
    )
      fail('VALIDATION');
    return this.persist(run, run.state, run.outputs, run.report, null, false);
  }
  private readonly ownership = new AbortController();
  get ownershipSignal() {
    return this.ownership.signal;
  }
  async assertOwner(): Promise<void> {
    this.guard();
    try {
      await this.owner!.query('SELECT 1');
    } catch {
      this.lost = true;
      this.ownership.abort();
      fail('PERSISTENCE');
    }
    this.guard();
  }
  async admitSandbox(
    spec: FeatureSpec,
    key: string,
    hash: string,
    execution: SandboxExecution,
  ): Promise<{ run: FactoryRun; created: boolean }> {
    return this.admit(
      spec,
      key,
      hash,
      validated(SandboxExecutionSchema, execution),
    );
  }
  readonly pool: Pool;
  private owner: PoolClient | null = null;
  private lost = false;
  constructor(config: LocalConfig) {
    this.pool = poolFor(config);
    this.pool.on('error', () => {
      this.lost = true;
      this.ownership.abort();
    });
  }
  private guard() {
    if (!this.owner || this.lost) fail('PERSISTENCE');
  }
  async start(): Promise<void> {
    if (this.owner) fail('OWNER_BUSY');
    await protect(async () => {
      const client = await this.pool.connect();
      try {
        const lock = await client.query<{ locked: boolean }>(
          'SELECT pg_try_advisory_lock($1) AS locked',
          [OWNER_KEY],
        );
        if (!lock.rows[0]?.locked) fail('OWNER_BUSY');
        client.on('error', () => {
          this.lost = true;
          this.ownership.abort();
        });
        this.owner = client;
        await client.query(
          'SELECT version FROM factory_migrations WHERE version=3',
        );
        const unfinished = await this.pool.query<{ data: unknown }>(
          "SELECT data FROM factory_runs WHERE state IN ('CREATED','SPEC_VALIDATED','PLANNED','IMPLEMENTING','VERIFYING','REVIEWING','REPAIRING')",
        );
        for (const row of unfinished.rows) {
          const run = validated(FactoryRunSchema, row.data);
          const report: FinalReport = {
            mode: run.mode,
            mergeReady: false,
            outcome: 'FAILED',
            outputs: run.outputs,
            error: 'INTERRUPTED',
            limitations: [
              run.mode === 'mock'
                ? 'Simulation interrupted; no stages were replayed.'
                : 'Sandbox execution interrupted; no provider or worker actions replayed.',
            ],
          };
          const recoveredBase =
            run.execution?.tool?.status === 'pending'
              ? {
                  ...run,
                  execution: {
                    ...run.execution,
                    tool: {
                      ...run.execution.tool,
                      status: 'unknown' as const,
                      executed: null,
                      error: 'INTERRUPTED' as const,
                    },
                  },
                }
              : run;
          const recovered = run.verification
            ? {
                ...recoveredBase,
                verification: {
                  ...run.verification,
                  status: 'interrupted' as const,
                  completedAt: new Date().toISOString(),
                  rounds: run.verification.rounds.map((round) =>
                    round.status === 'pending'
                      ? { ...round, status: 'interrupted' as const }
                      : round,
                  ),
                  repairs: run.verification.repairs.map((repair) =>
                    repair.status === 'requested'
                      ? {
                          ...repair,
                          status: 'unknown' as const,
                          error: 'INTERRUPTED' as const,
                        }
                      : repair,
                  ),
                },
              }
            : recoveredBase;
          await this.save(
            recovered,
            'FAILED',
            run.outputs,
            report,
            'INTERRUPTED',
          );
        }
      } catch (error) {
        this.owner = null;
        client.release(true);
        throw error;
      }
    });
  }
  async close(): Promise<void> {
    this.ownership.abort();
    if (this.owner) {
      this.owner.release(true);
      this.owner = null;
    }
    await this.pool.end();
  }
  async admit(
    spec: FeatureSpec,
    key: string,
    hash: string,
    execution?: SandboxExecution,
  ): Promise<{ run: FactoryRun; created: boolean }> {
    this.guard();
    return transaction(this.pool, async (client) => {
      // Serialize admission, checking idempotency before single-run capacity.
      await client.query('SELECT pg_advisory_xact_lock($1)', [OWNER_KEY + 1]);
      const existing = await client.query<{ data: unknown }>(
        'SELECT data FROM factory_runs WHERE idempotency_key=$1',
        [key],
      );
      if (existing.rows[0]) {
        const run = validated(FactoryRunSchema, existing.rows[0].data);
        if (run.inputHash !== hash) fail('CONFLICT');
        return { run, created: false };
      }
      const active = await client.query(
        "SELECT id FROM factory_runs WHERE state IN ('CREATED','SPEC_VALIDATED','PLANNED','IMPLEMENTING','VERIFYING','REVIEWING','REPAIRING') LIMIT 1",
      );
      if (active.rowCount) fail('BUSY');
      const at = new Date().toISOString();
      const run = validated(FactoryRunSchema, {
        id: randomUUID(),
        key,
        inputHash: hash,
        mode: execution ? 'sandbox-fixture' : 'mock',
        spec,
        state: 'CREATED',
        version: 0,
        createdAt: at,
        updatedAt: at,
        outputs: [],
        report: null,
        ...(execution ? { execution } : {}),
      });
      await client.query(
        'INSERT INTO factory_runs(id,idempotency_key,input_hash,state,version,created_at,data) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [run.id, key, hash, run.state, 0, at, run],
      );
      const event = validated(EventSchema, {
        runId: run.id,
        sequence: 0,
        state: run.state,
        at,
        error: null,
      });
      await client.query(
        'INSERT INTO factory_events(run_id,sequence,state,data) VALUES($1,0,$2,$3)',
        [run.id, run.state, event],
      );
      return { run, created: true };
    });
  }
  async get(id: string): Promise<FactoryRun> {
    this.guard();
    return protect(async () => {
      const result = await this.pool.query<{ data: unknown }>(
        'SELECT data FROM factory_runs WHERE id=$1',
        [id],
      );
      if (!result.rows[0]) fail('NOT_FOUND');
      return validated(FactoryRunSchema, result.rows[0].data);
    });
  }
  async save(
    run: FactoryRun,
    state: State,
    outputs: StageOutput[],
    report: FinalReport | null,
    error: ErrorCode | null,
  ): Promise<FactoryRun> {
    return this.persist(run, state, outputs, report, error, true);
  }
  private async persist(
    run: FactoryRun,
    state: State,
    outputs: StageOutput[],
    report: FinalReport | null,
    error: ErrorCode | null,
    move: boolean,
  ): Promise<FactoryRun> {
    this.guard();
    if (move) transition(run.state, state);
    const next = validated(FactoryRunSchema, {
      ...run,
      state,
      version: run.version + 1,
      updatedAt: new Date().toISOString(),
      outputs,
      report,
    });
    return transaction(this.pool, async (client) => {
      const result = await client.query(
        'UPDATE factory_runs SET state=$1,version=$2,data=$3 WHERE id=$4 AND version=$5 AND state=$6',
        [state, next.version, next, run.id, run.version, run.state],
      );
      if (result.rowCount !== 1) fail('CONFLICT');
      const event = validated(EventSchema, {
        runId: run.id,
        sequence: next.version,
        state,
        at: next.updatedAt,
        error,
      });
      await client.query(
        'INSERT INTO factory_events(run_id,sequence,state,data) VALUES($1,$2,$3,$4)',
        [run.id, next.version, state, event],
      );
      return next;
    });
  }
  async list(
    page: Page,
  ): Promise<{ items: FactoryRun[]; nextCursor: string | null }> {
    this.guard();
    return protect(async () => {
      const result = await this.pool.query<{ data: unknown }>(
        `SELECT data FROM factory_runs WHERE ($1::text IS NULL OR state=$1) AND ($2::timestamptz IS NULL OR (created_at,id) < ($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4`,
        [
          page.state ?? null,
          page.cursor?.createdAt ?? null,
          page.cursor?.id ?? null,
          page.limit + 1,
        ],
      );
      const items = result.rows
        .slice(0, page.limit)
        .map((row) => validated(FactoryRunSchema, row.data));
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          result.rows.length > page.limit && last
            ? encodeCursor({ createdAt: last.createdAt, id: last.id })
            : null,
      };
    });
  }
  async events(
    id: string,
    page: Page,
  ): Promise<{ items: RunEvent[]; nextAfter: number | null }> {
    this.guard();
    await this.get(id);
    return protect(async () => {
      const result = await this.pool.query<{ data: unknown }>(
        'SELECT data FROM factory_events WHERE run_id=$1 AND sequence>$2 ORDER BY sequence LIMIT $3',
        [id, page.after, page.limit + 1],
      );
      const items = result.rows
        .slice(0, page.limit)
        .map((row) => validated(EventSchema, row.data));
      return {
        items,
        nextAfter:
          result.rows.length > page.limit
            ? (items.at(-1)?.sequence ?? null)
            : null,
      };
    });
  }
}
