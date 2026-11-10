import type { RepairInput } from '@forgets/core';
import { contentHash } from '@forgets/agents';
export type RepairScenario =
  'clean' | 'repair' | 'persistent' | 'malformed' | 'provider-failure';
export function fixtureRepair(
  input: RepairInput,
  scenario: RepairScenario,
): Promise<unknown> {
  if (scenario === 'provider-failure')
    return Promise.reject(new Error('FIXTURE_PROVIDER_FAILURE'));
  if (scenario === 'malformed') return Promise.resolve({ allowShell: true });
  const source = input.files.find((file) => file.path === 'src/main.ts');
  if (!source) return Promise.reject(new Error('FIXTURE_INPUT'));
  const content =
    scenario === 'persistent'
      ? source.content
      : source.content.replace(
          'message: 123',
          "message: 'Hello from the sandbox'",
        );
  return Promise.resolve({
    output: {
      stage: 'repair',
      summary: 'Deterministic fixture repair; inference is simulated',
      request: {
        capability: 'replace',
        files: [
          {
            path: source.path,
            beforeHash: contentHash(source.content),
            content,
          },
        ],
      },
    },
    invocationId: input.invocationId,
    runId: input.runId,
    workspaceId: input.workspaceId,
    templateVersion: 'm3-v1',
    transport: 'fake',
    usage: null,
  });
}
