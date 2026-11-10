import { ResponsesProvider } from '@forgets/agents';
export function fixtureProvider(
  identity: {
    runId: string;
    workspaceId: string;
  },
  fault: 'none' | 'type' = 'none',
) {
  return new ResponsesProvider(
    {
      provider: 'openai',
      model: 'fixture-model',
      apiKey: 'fixture-not-a-real-provider-key',
      allowPaid: false,
    },
    identity,
    (_url, init) => {
      const body = JSON.parse(init.body as string) as { input: string };
      const input = JSON.parse(body.input) as {
        stage: 'planner' | 'implementer';
        files: { path: string; content: string; beforeHash: string }[];
      };
      const source = input.files.find((file) => file.path === 'src/main.ts');
      if (!source) throw new Error('FIXTURE_INPUT');
      const output =
        input.stage === 'planner'
          ? {
              stage: 'planner',
              summary: 'Fixture greeting replacement',
              steps: ['Replace greeting in the approved sample'],
              fileChanges: ['src/main.ts'],
              testStrategy: ['Generated-code verification remains pending M3'],
              risks: ['Fake inference is not live model evidence'],
            }
          : {
              stage: 'implementer',
              summary: 'Fixture replacement proposal',
              request: {
                capability: 'replace',
                files: [
                  {
                    path: source.path,
                    beforeHash: source.beforeHash,
                    content:
                      fault === 'type'
                        ? source.content.replace("'Hello from ForgeTS'", '123')
                        : source.content.replace(
                            'Hello from ForgeTS',
                            'Hello from the sandbox',
                          ),
                  },
                ],
              },
            };
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: 'completed',
            output: [
              {
                type: 'message',
                status: 'completed',
                role: 'assistant',
                content: [
                  { type: 'output_text', text: JSON.stringify(output) },
                ],
              },
            ],
          }),
        ),
      );
    },
  );
}
