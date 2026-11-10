import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contentHash, snapshotHash } from '@forgets/agents';
import {
  executeTrustedWorker,
  dockerEnvironment,
  IMAGE,
} from '../src/docker.js';
import { replaceInWorker } from '../src/index.js';

const exec = promisify(execFile);
const host = 'npipe:////./pipe/dockerDesktopLinuxEngine';
const signal = () => new AbortController().signal;

await test(
  'real Docker worker containment and replacement',
  { timeout: 180000 },
  async (t) => {
    const canaryDirectory = await mkdtemp(join(tmpdir(), 'forgets-canary-'));
    const canary = join(canaryDirectory, 'unchanged.txt');
    await writeFile(canary, 'disposable host canary');
    process.env.FORGETS_WORKER_CREDENTIAL_CANARY = 'never-transfer-this-value';
    try {
      await t.test(
        'worker runs as non-root with enforced namespaces and cgroup/filesystem limits',
        async () => {
          const output = await executeTrustedWorker(
            `
        const fs=require('node:fs');
        const result={uid:process.getuid(), env:Object.keys(process.env),socket:fs.existsSync('/var/run/docker.sock'),memory:fs.readFileSync('/sys/fs/cgroup/memory.max','utf8').trim(),pids:fs.readFileSync('/sys/fs/cgroup/pids.max','utf8').trim(),cpu:fs.readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim(),interfaces:fs.readdirSync('/sys/class/net')};
        try{fs.writeFileSync('/forbidden','x'); result.rootWritable=true}catch{result.rootWritable=false}
        try{fs.writeFileSync('/workspace/oversized',Buffer.alloc(17*1024*1024));result.diskBound=false}catch(e){result.diskBound=e.code==='ENOSPC'}
        console.log(JSON.stringify(result));`,
            '',
            signal(),
          );
          const result = JSON.parse(output) as {
            uid: number;
            env: string[];
            socket: boolean;
            memory: string;
            pids: string;
            cpu: string;
            interfaces: string[];
            rootWritable: boolean;
            diskBound: boolean;
          };
          assert.equal(result.uid, 1000);
          assert.equal(result.socket, false);
          assert.ok(!result.env.includes('FORGETS_WORKER_CREDENTIAL_CANARY'));
          assert.ok(!result.env.includes('OPENAI_API_KEY'));
          assert.equal(result.memory, '134217728');
          assert.equal(result.pids, '32');
          assert.equal(result.cpu, '50000 100000');
          assert.deepEqual(result.interfaces, ['lo']);
          assert.equal(result.rootWritable, false);
          assert.equal(result.diskBound, true);
        },
      );
      await t.test(
        'controlled reachable host service is unreachable from restricted worker',
        async () => {
          const server = createServer((_request, response) =>
            response.end('controlled-test-service'),
          );
          await new Promise<void>((resolve) =>
            server.listen(0, '127.0.0.1', resolve),
          );
          try {
            const address = server.address();
            assert.ok(address && typeof address === 'object');
            const url = `http://host.docker.internal:${address.port}`;
            const probe = `fetch(${JSON.stringify(url)},{signal:AbortSignal.timeout(1500)}).then(r=>r.text()).then(x=>console.log(x),()=>console.log('NETWORK_DENIED'))`;
            const positive = await exec(
              'docker',
              [
                '--host',
                host,
                'run',
                '--rm',
                '--pull=never',
                '--read-only',
                '--user=1000:1000',
                IMAGE,
                'node',
                '-e',
                probe,
              ],
              {
                timeout: 15000,
                maxBuffer: 65536,
                env: dockerEnvironment(),
                windowsHide: true,
              },
            );
            assert.equal(positive.stdout.trim(), 'controlled-test-service');
            assert.equal(
              (await executeTrustedWorker(probe, '', signal())).trim(),
              'NETWORK_DENIED',
            );
          } finally {
            await new Promise<void>((resolve, reject) =>
              server.close((error) => (error ? reject(error) : resolve())),
            );
          }
        },
      );
      await t.test(
        'PID and memory limits stop resource exhaustion',
        async () => {
          const output = await executeTrustedWorker(
            `const {spawn}=require('node:child_process');let count=0;function next(){const c=spawn('/bin/sleep',['20']);c.once('spawn',()=>{count++;if(count<40)next()});c.once('error',e=>{console.log(e.code);process.exit(0)})}next();`,
            '',
            signal(),
          );
          assert.equal(output.trim(), 'EAGAIN');
          await assert.rejects(
            executeTrustedWorker(
              `const values=[];setInterval(()=>values.push(Buffer.alloc(16*1024*1024,1)),5);`,
              '',
              signal(),
            ),
            /^Error: WORKER_RESOURCE$/,
          );
        },
      );
      await t.test(
        'output/time/cancellation limits terminate workers and descendants',
        async () => {
          await assert.rejects(
            executeTrustedWorker(
              `process.stdout.write('x'.repeat(100000));setInterval(()=>{},1000);`,
              '',
              signal(),
            ),
            /^Error: WORKER_OUTPUT$/,
          );
          await assert.rejects(
            executeTrustedWorker(
              `require('node:child_process').spawn('/bin/sleep',['60']);setInterval(()=>{},1000);`,
              '',
              signal(),
            ),
            /^Error: WORKER_TIMEOUT$/,
          );
          const controller = new AbortController();
          const task = executeTrustedWorker(
            `require('node:child_process').spawn('/bin/sleep',['60']);setInterval(()=>{},1000);`,
            '',
            controller.signal,
          );
          const timer = setTimeout(() => controller.abort(), 1500);
          try {
            await assert.rejects(task, /^Error: WORKER_CANCELLED$/);
          } finally {
            clearTimeout(timer);
          }
        },
      );
      await t.test(
        'actual regular-file replacement is hashed and leaves the host source canary unchanged',
        async () => {
          const files = [
            {
              path: 'src/app.service.ts',
              content: 'export const greeting = "hello";\n',
            },
          ];
          const result = await replaceInWorker(
            files,
            {
              capability: 'replace',
              files: [
                {
                  path: files[0]!.path,
                  beforeHash: contentHash(files[0]!.content),
                  content: 'export const greeting = "hi";\n',
                },
              ],
            },
            signal(),
          );
          assert.equal(result.baseHash, snapshotHash(files));
          assert.equal(result.resultHash, snapshotHash(result.files));
          assert.equal(
            result.files[0]!.content,
            'export const greeting = "hi";\n',
          );
          assert.equal(files[0]!.content, 'export const greeting = "hello";\n');
          assert.equal(
            await readFile(canary, 'utf8'),
            'disposable host canary',
          );
        },
      );
    } finally {
      delete process.env.FORGETS_WORKER_CREDENTIAL_CANARY;
      await rm(canaryDirectory, { recursive: true, force: true });
    }
    const leftovers = await exec(
      'docker',
      ['--host', host, 'ps', '-aq', '--filter', 'label=forgets.worker=m2-v1'],
      { timeout: 15000, env: dockerEnvironment(), windowsHide: true },
    );
    assert.equal(
      leftovers.stdout.trim(),
      '',
      'all containers and their process namespaces must be removed',
    );
  },
);
