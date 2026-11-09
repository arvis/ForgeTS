import type {
  FeatureSpec,
  FactoryRun,
  State,
  StageOutput,
  FinalReport,
  ErrorCode,
  Page,
  RunEvent,
} from '@forgets/contracts';
export interface Repository {
  admit(
    spec: FeatureSpec,
    key: string,
    hash: string,
  ): Promise<{ run: FactoryRun; created: boolean }>;
  get(id: string): Promise<FactoryRun>;
  save(
    run: FactoryRun,
    state: State,
    outputs: StageOutput[],
    report: FinalReport | null,
    error: ErrorCode | null,
  ): Promise<FactoryRun>;
  list(page: Page): Promise<{ items: FactoryRun[]; nextCursor: string | null }>;
  events(
    id: string,
    page: Page,
  ): Promise<{ items: RunEvent[]; nextAfter: number | null }>;
}
