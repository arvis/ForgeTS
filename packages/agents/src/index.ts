import type { Agent } from '@forgets/core';
export const mockAgent: Agent = (stage, _spec, signal) => {
  if (signal.aborted)
    return Promise.reject(
      signal.reason instanceof Error ? signal.reason : new Error('CANCELLED'),
    );
  return Promise.resolve(
    stage === 'planner'
      ? {
          stage,
          kind: 'simulated',
          summary: 'Deterministic fixture plan',
          steps: ['Describe a sample change without executing it'],
          fileChanges: ['Simulated sample application change'],
          testStrategy: ['Fixture-based verification only'],
          risks: ['No generated code is executed or inspected.'],
        }
      : stage === 'implementer'
        ? {
            stage,
            kind: 'simulated',
            summary: 'Deterministic fixture implementation',
            changes: ['Description only; no files were edited.'],
          }
        : stage === 'verifier'
          ? {
              stage,
              kind: 'simulated',
              summary: 'Deterministic fixture verification',
              checks: [
                { name: 'mock fixture', outcome: 'pass', evidence: 'fixture' },
              ],
            }
          : {
              stage,
              kind: 'simulated',
              summary: 'Deterministic advisory review',
              recommendation: 'approve',
              concerns: [],
              uncertainty: 'No real code or security properties were verified.',
            },
  );
};
