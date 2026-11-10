import process from 'node:process';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  lstat,
  readdir,
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  realpath,
} from 'node:fs/promises';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import {
  dockerEnvironment,
  IMAGE,
} from '../packages/runner/dist/src/docker.js';

if (process.argv.length !== 2 || process.platform !== 'win32')
  throw new Error('PREPARE_CONFIG');
const exec = promisify(execFile);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const moduleRoot = await realpath(join(root, 'node_modules'));
const ownedRoot = join(root, '.workspaces');
await mkdir(ownedRoot, { recursive: true });
const ownedReal = await realpath(ownedRoot);
const context = await mkdtemp(join(ownedRoot, 'm3-tools-'));
const fingerprint = createHash('sha256');
let count = 0;
let bytes = 0;
const versions = {
  typescript: '5.9.3',
  eslint: '10.14.0',
  prettier: '3.9.10',
  'typescript-eslint': '8.72.1',
};
async function copyRegular(source, target) {
  const stat = await lstat(source);
  const actual = await realpath(source);
  if (!actual.startsWith(moduleRoot + sep) || stat.isSymbolicLink())
    throw new Error('PREPARE_LINK');
  if (stat.isFile() && stat.nlink !== 1) throw new Error('PREPARE_LINK');
  if (stat.isDirectory()) {
    for (const entry of (await readdir(source)).sort()) {
      if (
        entry === 'node_modules' ||
        entry === '.bin' ||
        entry === '.git' ||
        entry === '.npmrc' ||
        entry === '.env' ||
        entry.startsWith('.env.')
      )
        continue;
      await copyRegular(join(source, entry), join(target, entry));
    }
  } else if (stat.isFile() && stat.size <= 16777216) {
    const value = await readFile(source);
    bytes += value.length;
    count++;
    if (bytes > 209715200 || count > 30000) throw new Error('PREPARE_BUDGET');
    const name = relative(context, target).split(sep).join('/');
    fingerprint.update(name + '\0').update(value);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, value, { flag: 'wx' });
  } else throw new Error('PREPARE_FILE');
}
try {
  const lock = JSON.parse(
    await readFile(join(root, 'package-lock.json'), 'utf8'),
  );
  for (const name of Object.keys(lock.packages).sort()) {
    const entry = lock.packages[name];
    if (!name.startsWith('node_modules/') || entry.link) continue;
    if (
      !/^node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+(?:\/node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+)*$/.test(
        name,
      ) ||
      !entry.resolved?.startsWith('https://registry.npmjs.org/') ||
      !entry.integrity
    )
      throw new Error('PREPARE_LOCK');
    try {
      await copyRegular(join(root, name), join(context, 'toolchain', name));
    } catch (error) {
      if (!(entry.optional && error?.code === 'ENOENT')) throw error;
    }
  }
  for (const [name, version] of Object.entries(versions)) {
    const installed = JSON.parse(
      await readFile(
        join(context, 'toolchain', 'node_modules', name, 'package.json'),
        'utf8',
      ),
    );
    if (installed.version !== version) throw new Error('PREPARE_VERSION');
  }
  for (const name of [
    'eslint.config.mjs',
    'tsconfig.json',
    'prettier.json',
    'greeting.test.mjs',
    'reporter.mjs',
  ]) {
    const value = await readFile(
      join(root, 'packages', 'runner', 'worker-assets', name),
    );
    fingerprint.update(name + '\0').update(value);
    await writeFile(join(context, 'toolchain', name), value, { flag: 'wx' });
  }
  const sourceHash = fingerprint.digest('hex');
  await writeFile(
    join(context, 'Dockerfile'),
    `FROM ${IMAGE}\nCOPY toolchain/ /opt/forgets/\n`,
    { flag: 'wx' },
  );
  const args = [
    '--host',
    'npipe:////./pipe/dockerDesktopLinuxEngine',
    'build',
    '--pull=false',
    '--network=none',
    '--tag',
    'forgets-worker:m3-v1',
    '--label',
    'forgets.toolchain=m3-v1',
    '--label',
    `forgets.base=${IMAGE}`,
    '--label',
    `forgets.source=${sourceHash}`,
    context,
  ];
  await exec('docker', args, {
    timeout: 180000,
    maxBuffer: 65536,
    env: dockerEnvironment(),
    windowsHide: true,
  });
  const result = await exec(
    'docker',
    [
      '--host',
      'npipe:////./pipe/dockerDesktopLinuxEngine',
      'image',
      'inspect',
      'forgets-worker:m3-v1',
      '--format',
      '{{.Id}}',
    ],
    { timeout: 15000, env: dockerEnvironment(), windowsHide: true },
  );
  const imageId = result.stdout.trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(imageId)) throw new Error('PREPARE_IMAGE');
  await writeFile(
    join(ownedRoot, 'm3-toolchain.json'),
    JSON.stringify(
      { version: 'm3-v1', imageId, baseImage: IMAGE, sourceHash, versions },
      null,
      2,
    ) + '\n',
  );
  process.stdout.write(
    JSON.stringify({ imageId, sourceHash, files: count, bytes, versions }) +
      '\n',
  );
} finally {
  await cleanupContext();
}
async function cleanupContext() {
  const resolved = await realpath(context);
  if (
    !resolved.startsWith(ownedReal + sep) ||
    !relative(ownedReal, resolved).startsWith('m3-tools-')
  )
    throw new Error('PREPARE_CLEANUP_SCOPE');
  await rm(context, { recursive: true, force: true });
}
