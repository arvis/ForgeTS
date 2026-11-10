import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// Observed official 24.11.0-bookworm-slim index; the worker selects linux/amd64.
export const IMAGE =
  'node@sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152';
const HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine';
let busy = false;
let cleanupFailed = false;
export function workerArguments(name: string): string[] {
  if (
    !/^forgets-worker-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(name)
  )
    throw new Error('WORKER_CONFIG');
  return [
    'create',
    '--name',
    name,
    '--label=forgets.worker=m2-v1',
    '--pull=never',
    '--platform=linux/amd64',
    '--network=none',
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--user=1000:1000',
    '--memory=128m',
    '--memory-swap=128m',
    '--pids-limit=32',
    '--cpus=0.5',
    '--init',
    '--ipc=none',
    '--ulimit=nofile=128:128',
    '--log-driver=none',
    '--workdir=/workspace',
    '--tmpfs=/workspace:rw,nosuid,nodev,noexec,size=16777216,uid=1000,gid=1000,mode=0700',
    '--entrypoint=/usr/local/bin/node',
    '-i',
    IMAGE,
  ];
}
export function dockerEnvironment(): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'TEMP', 'TMP'])
    if (process.env[key] !== undefined) result[key] = process.env[key];
  return result;
}
function docker(
  args: string[],
  input = '',
  timeout = 15000,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) return Promise.reject(new Error('WORKER_CANCELLED'));
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['--host', HOST, ...args], {
      shell: false,
      windowsHide: true,
      env: dockerEnvironment(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const output: Buffer[] = [];
    let size = 0;
    let failure: string | undefined;
    const stop = (code: string) => {
      failure ??= code;
      child.kill();
    };
    const abort = () => stop('WORKER_CANCELLED');
    const timer = setTimeout(() => stop('WORKER_TIMEOUT'), timeout);
    signal?.addEventListener('abort', abort, { once: true });
    const clean = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    };
    child.stdout.on('data', (data: Buffer) => {
      size += data.length;
      if (size > 65536) stop('WORKER_OUTPUT');
      else output.push(data);
    });
    child.stderr.on('data', (data: Buffer) => {
      size += data.length;
      if (size > 65536) stop('WORKER_OUTPUT');
    });
    child.stdin.on('error', () => {
      /* Docker closing stdin is handled by its exit status. */
    });
    child.once('error', () => {
      clean();
      reject(new Error('WORKER_UNAVAILABLE'));
    });
    child.once('close', (code) => {
      clean();
      if (failure) reject(new Error(failure));
      else if (code !== 0)
        reject(new Error(code === 137 ? 'WORKER_RESOURCE' : 'WORKER_FAILED'));
      else resolve(Buffer.concat(output).toString('utf8'));
    });
    child.stdin.end(input);
    if (signal?.aborted) abort();
  });
}
// Internal test/control-plane primitive. Never exported as a model capability.
export async function executeTrustedWorker(
  code: string,
  input: string,
  signal: AbortSignal,
): Promise<string> {
  if (signal.aborted) throw new Error('WORKER_CANCELLED');
  if (process.platform !== 'win32') throw new Error('WORKER_UNSUPPORTED');
  if (cleanupFailed) throw new Error('WORKER_CLEANUP');
  if (busy) throw new Error('WORKER_BUSY');
  if (Buffer.byteLength(input) > 65536) throw new Error('WORKER_INPUT');
  busy = true;
  const name = `forgets-worker-${randomUUID()}`;
  let creationAttempted = false;
  try {
    const info = JSON.parse(
      await docker(['info', '--format', '{{json .}}']),
    ) as {
      OSType?: string;
      Architecture?: string;
      CgroupVersion?: string;
      SecurityOptions?: string[];
    };
    if (
      info.OSType !== 'linux' ||
      info.Architecture !== 'x86_64' ||
      info.CgroupVersion !== '2' ||
      !info.SecurityOptions?.some((value) => value.startsWith('name=seccomp,'))
    )
      throw new Error('WORKER_UNSUPPORTED');
    if (signal.aborted) throw new Error('WORKER_CANCELLED');
    creationAttempted = true;
    await docker([...workerArguments(name), '-e', code]);
    if (signal.aborted) throw new Error('WORKER_CANCELLED');
    return await docker(
      ['start', '--attach', '--interactive', name],
      input,
      5000,
      signal,
    );
  } finally {
    try {
      if (creationAttempted) {
        await docker(['rm', '--force', name]);
        const remaining = await docker([
          'ps',
          '--all',
          '--quiet',
          '--filter',
          `name=^/${name}$`,
        ]);
        if (remaining.trim()) throw new Error('WORKER_CLEANUP');
      }
    } catch {
      cleanupFailed = true;
      throw new Error('WORKER_CLEANUP');
    } finally {
      busy = false;
    }
  }
}
