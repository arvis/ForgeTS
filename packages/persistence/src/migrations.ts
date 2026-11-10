// Trusted, additive developer migration. Never supplied by a run or model.
export const migration1 = `
CREATE TABLE IF NOT EXISTS factory_migrations (version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS factory_runs (
  id uuid PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  input_hash text NOT NULL,
  state text NOT NULL CHECK (state IN ('CREATED','SPEC_VALIDATED','PLANNED','IMPLEMENTING','VERIFYING','REVIEWING','AWAITING_HUMAN_APPROVAL','FAILED','CANCELLED')),
  version integer NOT NULL CHECK (version >= 0),
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL CHECK (octet_length(data::text) <= 65536),
  CHECK (data->>'state' = state),
  CHECK ((data->>'version')::integer = version),
  CHECK (data->>'id' = id::text)
);
CREATE UNIQUE INDEX IF NOT EXISTS factory_runs_active ON factory_runs ((true))
  WHERE state IN ('CREATED','SPEC_VALIDATED','PLANNED','IMPLEMENTING','VERIFYING','REVIEWING');
CREATE INDEX IF NOT EXISTS factory_runs_history ON factory_runs (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS factory_runs_state_history ON factory_runs (state, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS factory_events (
  run_id uuid NOT NULL REFERENCES factory_runs(id),
  sequence integer NOT NULL CHECK (sequence >= 0),
  state text NOT NULL,
  data jsonb NOT NULL CHECK (octet_length(data::text) <= 65536),
  PRIMARY KEY (run_id, sequence)
);
INSERT INTO factory_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
`;
export const migration2 = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM factory_migrations WHERE version=2) THEN
    ALTER TABLE factory_runs DROP CONSTRAINT factory_runs_state_check;
    ALTER TABLE factory_runs ADD CONSTRAINT factory_runs_state_check CHECK (state IN ('CREATED','SPEC_VALIDATED','PLANNED','IMPLEMENTING','VERIFYING','REVIEWING','AWAITING_HUMAN_APPROVAL','FAILED','CANCELLED','IMPLEMENTED_UNVERIFIED'));
    INSERT INTO factory_migrations(version) VALUES (2);
  END IF;
END $$;
`;
export const migration3 = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM factory_migrations WHERE version=3) THEN
    ALTER TABLE factory_runs DROP CONSTRAINT factory_runs_state_check;
    ALTER TABLE factory_runs ADD CONSTRAINT factory_runs_state_check CHECK (state IN ('CREATED','SPEC_VALIDATED','PLANNED','IMPLEMENTING','VERIFYING','REVIEWING','AWAITING_HUMAN_APPROVAL','FAILED','CANCELLED','IMPLEMENTED_UNVERIFIED','REPAIRING','VERIFIED_AWAITING_REVIEW'));
    DROP INDEX factory_runs_active;
    CREATE UNIQUE INDEX factory_runs_active ON factory_runs ((true)) WHERE state IN ('CREATED','SPEC_VALIDATED','PLANNED','IMPLEMENTING','VERIFYING','REVIEWING','REPAIRING');
    INSERT INTO factory_migrations(version) VALUES (3);
  END IF;
END $$;
`;
