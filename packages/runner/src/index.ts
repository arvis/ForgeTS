import {
  applyReplacements,
  contentHash,
  parseSnapshot,
  snapshotHash,
  type SourceFile,
} from '@forgets/agents';
import { executeTrustedWorker } from './docker.js';
import { REPLACEMENT_WORKER } from './worker.js';
export { recoverAbandonedWorkers } from './docker.js';
export { SAMPLE_FILES } from './sample.js';
export { fixtureProvider } from './fixture.js';
export async function replaceInWorker(
  snapshot: unknown,
  request: unknown,
  signal: AbortSignal,
  assertOwner?: () => Promise<void>,
): Promise<{ files: SourceFile[]; baseHash: string; resultHash: string }> {
  const files = parseSnapshot(snapshot);
  const expected = applyReplacements(files, request);
  if (signal.aborted) throw new Error('WORKER_CANCELLED');
  // Reconstruct plain data after policy validation; never serialize unchecked extra fields.
  const replacements = expected
    .filter((file, index) => file.content !== files[index]!.content)
    .map((file) => ({ ...file, beforeHash: '' }));
  for (const edit of replacements)
    edit.beforeHash = contentHash(
      files.find((file) => file.path === edit.path)!.content,
    );
  const output = await executeTrustedWorker(
    REPLACEMENT_WORKER,
    JSON.stringify({ files, replacements }),
    signal,
    assertOwner,
  );
  let result: SourceFile[];
  try {
    result = parseSnapshot(JSON.parse(output) as unknown);
  } catch {
    throw new Error('WORKER_RESULT');
  }
  if (snapshotHash(result) !== snapshotHash(expected))
    throw new Error('WORKER_RESULT');
  return {
    files: result,
    baseHash: snapshotHash(files),
    resultHash: snapshotHash(result),
  };
}
