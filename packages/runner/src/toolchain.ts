import { readFile } from 'node:fs/promises';
import { ToolchainSchema } from '@forgets/contracts';
export async function readToolchain() {
  try {
    return ToolchainSchema.parse(
      JSON.parse(
        await readFile(
          new URL('../../../../.workspaces/m3-toolchain.json', import.meta.url),
          'utf8',
        ),
      ) as unknown,
    );
  } catch {
    throw new Error('CHECK_TOOLCHAIN');
  }
}
