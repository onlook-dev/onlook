import { expect, test } from 'bun:test';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import app from '../apps/studio/package.json';
import { installAppDeps } from './install-app-deps.js';

test('the app postinstall uses the progress runner without changing its working directory', () => {
  expect(app.scripts.postinstall).toBe('bun --no-env-file ../../scripts/install-app-deps.ts');
});

test('Electron finishes before native dependencies start, with progress for both stages', async () => {
  const commands: string[][] = [];
  const output: string[] = [];
  const code = await installAppDeps({
    run: async (command) => {
      commands.push(command);
      expect(output.at(-1)).toContain(commands.length === 1 ? 'Checking/downloading Electron' : 'Checking/rebuilding native dependencies (node-pty)');
      return 0;
    },
    log: (message) => output.push(message),
  });
  expect(code).toBe(0);
  expect(commands).toEqual([['install-electron'], ['electron-builder', 'install-app-deps']]);
  expect(output.filter((line) => line.includes('complete'))).toHaveLength(2);
  expect(output.findIndex((line) => line.includes('Electron: complete')))
    .toBeLessThan(output.findIndex((line) => line.includes('Checking/rebuilding')));
});

test.each([23, 143])('an Electron failure preserves exit %i and never starts the rebuild', async (failure) => {
  const commands: string[][] = [];
  const output: string[] = [];
  expect(await installAppDeps({
    run: async (command) => { commands.push(command); return failure; },
    log: (message) => output.push(message),
  })).toBe(failure);
  expect(commands).toEqual([['install-electron']]);
  expect(output.join('\n')).toContain(`failed (exit ${failure})`);
  expect(output.join('\n')).not.toContain('complete');
});

test('a rebuild failure is not reported as a successful install', async () => {
  const output: string[] = [];
  expect(await installAppDeps({
    run: async (command) => command[0] === 'install-electron' ? 0 : 31,
    log: (message) => output.push(message),
  })).toBe(31);
  expect(output.join('\n')).toContain('node-pty): failed (exit 31)');
  expect(output.filter((line) => line.includes('complete'))).toHaveLength(1);
});

test('a command that cannot start keeps its original error and stops the install', async () => {
  const output: string[] = [];
  let calls = 0;
  expect(await installAppDeps({
    run: async () => { calls++; throw new Error('spawn install-electron ENOENT'); },
    log: (message) => output.push(message),
  })).toBe(1);
  expect(calls).toBe(1);
  expect(output.join('\n')).toContain('spawn install-electron ENOENT');
  expect(output.join('\n')).not.toContain('complete');
});

test('a quiet stage emits an elapsed-time heartbeat and clears it after failure', async () => {
  const stage = Promise.withResolvers<number>();
  const output: string[] = [];
  const installing = installAppDeps({
    run: () => stage.promise,
    log: (message) => { output.push(message); },
    heartbeatMs: 10,
  });
  try {
    await waitUntil(() => output.some((message) => message.includes('still running')), 1000);
    expect(output.at(-1)).toMatch(/Electron: still running \(\d+s elapsed\)/);
  } finally {
    stage.resolve(17);
    expect(await installing).toBe(17);
  }
  const finishedOutput = [...output];
  await Bun.sleep(40);
  expect(output).toEqual(finishedOutput);
});

function installFixture(failure?: 'electron' | 'rebuild') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'studio-install-app-deps-')));
  const studio = join(root, 'apps/studio');
  const tools = join(root, 'packages/install-tools');
  const home = join(root, 'home');
  for (const directory of [studio, tools, home, join(root, 'scripts')]) mkdirSync(directory, { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name: 'install-progress-fixture', private: true, workspaces: ['apps/*', 'packages/*'],
  }));
  writeFileSync(join(studio, 'package.json'), JSON.stringify({
    name: '@fixture/app', private: true,
    scripts: { postinstall: app.scripts.postinstall },
    devDependencies: { '@fixture/install-tools': 'workspace:*' },
  }));
  writeFileSync(join(tools, 'package.json'), JSON.stringify({
    name: '@fixture/install-tools', version: '1.0.0',
    bin: { 'install-electron': 'fake.cjs', 'electron-builder': 'fake.cjs' },
  }));
  writeFileSync(join(tools, 'fake.cjs'), `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = ${JSON.stringify(root)};
const stage = process.argv[2] === 'install-app-deps' ? 'rebuild' : 'electron';
process.stdout.write('fixture ' + stage + ' stdout\\n');
process.stderr.write('fixture ' + stage + ' stderr\\n');
fs.writeFileSync(path.join(root, stage + '.started'), JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }));
setTimeout(() => { process.stderr.write('fixture gate timed out\\n'); process.exit(124); }, 20_000).unref();
const timer = setInterval(() => {
  if (!fs.existsSync(path.join(root, stage + '.release'))) return;
  clearInterval(timer);
  process.exit(stage === ${JSON.stringify(failure ?? '')} ? 37 : 0);
}, 20);
`, { mode: 0o755 });
  copyFileSync(join(import.meta.dir, 'install-app-deps.ts'), join(root, 'scripts/install-app-deps.ts'));
  return { root, studio, home };
}

async function waitUntil(check: () => boolean, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for install progress');
    await Bun.sleep(20);
  }
}

function startInstall(fixture: ReturnType<typeof installFixture>, verbose: boolean) {
  const child = Bun.spawn([process.execPath, 'install', ...(verbose ? ['--verbose'] : [])], {
    cwd: fixture.root,
    env: {
      ...process.env,
      PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
      HOME: fixture.home,
      XDG_CONFIG_HOME: fixture.home,
      BUN_INSTALL_CACHE_DIR: join(fixture.root, 'cache'),
    },
    stdout: 'pipe', stderr: 'pipe',
  });
  let output = '';
  const logPath = join(fixture.root, 'install.log');
  console.info(`Install progress fixture log: ${logPath}`);
  const capture = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      output += decoder.decode(chunk, { stream: true });
      appendFileSync(logPath, chunk);
    }
    output += decoder.decode();
  };
  const captured = Promise.all([capture(child.stdout), capture(child.stderr)]);
  return { child, captured, output: () => output };
}

test('bun install --verbose streams an elapsed heartbeat, both stage labels and raw diagnostics before command exit', async () => {
  const fixture = installFixture();
  const install = startInstall(fixture, true);
  try {
    await waitUntil(() => existsSync(join(fixture.root, 'electron.started')));
    await waitUntil(() => install.output().includes('fixture electron stdout') && install.output().includes('fixture electron stderr'));
    expect(install.child.exitCode).toBeNull();
    expect(install.output()).toContain('Checking/downloading Electron');
    expect(install.output()).toContain('fixture electron stdout');
    expect(install.output()).not.toContain('Electron: complete');
    expect(existsSync(join(fixture.root, 'rebuild.started'))).toBe(false);
    await waitUntil(() => install.output().includes('Electron: still running'), 15_000);
    expect(install.child.exitCode).toBeNull();
    expect(install.output()).not.toContain('Electron: complete');
    writeFileSync(join(fixture.root, 'electron.release'), '');
    await waitUntil(() => existsSync(join(fixture.root, 'rebuild.started')));
    await waitUntil(() => install.output().includes('fixture rebuild stdout') && install.output().includes('fixture rebuild stderr'));
    expect(install.child.exitCode).toBeNull();
    expect(install.output()).toContain('Checking/rebuilding native dependencies (node-pty)');
    expect(install.output()).toContain('fixture rebuild stdout');
    expect(JSON.parse(readFileSync(join(fixture.root, 'rebuild.started'), 'utf8')))
      .toEqual({ cwd: fixture.studio, args: ['install-app-deps'] });
    writeFileSync(join(fixture.root, 'rebuild.release'), '');
    expect(await install.child.exited).toBe(0);
    await install.captured;
    expect(install.output()).toContain('node-pty): complete');
  } finally {
    writeFileSync(join(fixture.root, 'electron.release'), '');
    writeFileSync(join(fixture.root, 'rebuild.release'), '');
    install.child.kill();
    await install.child.exited;
    await install.captured;
  }
}, 30_000);

test.each(['electron', 'rebuild'] as const)('default bun install buffers progress but retains a real %s failure', async (failure) => {
  const fixture = installFixture(failure);
  const install = startInstall(fixture, false);
  try {
    await waitUntil(() => existsSync(join(fixture.root, 'electron.started')));
    expect(install.output()).not.toContain('[install-app-deps] Checking/downloading Electron');
    writeFileSync(join(fixture.root, 'electron.release'), '');
    if (failure === 'rebuild') {
      await waitUntil(() => existsSync(join(fixture.root, 'rebuild.started')));
      expect(install.output()).not.toContain('[install-app-deps] Checking/rebuilding');
      writeFileSync(join(fixture.root, 'rebuild.release'), '');
    }
    expect(await install.child.exited).not.toBe(0);
    await install.captured;
    expect(install.output()).toContain(`fixture ${failure} stdout`);
    expect(install.output()).toContain(`fixture ${failure} stderr`);
    expect(install.output()).toContain('failed (exit 37)');
    if (failure === 'electron') expect(existsSync(join(fixture.root, 'rebuild.started'))).toBe(false);
  } finally {
    writeFileSync(join(fixture.root, 'electron.release'), '');
    writeFileSync(join(fixture.root, 'rebuild.release'), '');
    install.child.kill();
    await install.child.exited;
    await install.captured;
  }
}, 30_000);

test.each(['SIGINT', 'SIGTERM'] as const)('the install CLI forwards %s to its running child and stops before rebuilding', async (signal) => {
  const fixture = installFixture();
  const binary = join(fixture.root, 'install-electron');
  copyFileSync(join(fixture.root, 'packages/install-tools/fake.cjs'), binary);
  const child = Bun.spawn([process.execPath, '--no-env-file', join(fixture.root, 'scripts/install-app-deps.ts')], {
    cwd: fixture.studio,
    env: { ...process.env, PATH: `${fixture.root}${delimiter}${process.env.PATH ?? ''}` },
    stdout: 'pipe', stderr: 'pipe',
  });
  const output = new Response(child.stderr).text();
  try {
    await waitUntil(() => existsSync(join(fixture.root, 'electron.started')));
    child.kill(signal);
    expect(await child.exited).toBe(signal === 'SIGINT' ? 130 : 143);
    expect(await output).toContain(`failed (exit ${signal === 'SIGINT' ? 130 : 143})`);
    expect(existsSync(join(fixture.root, 'rebuild.started'))).toBe(false);
  } finally {
    writeFileSync(join(fixture.root, 'electron.release'), '');
    child.kill();
    await child.exited;
    await output;
  }
}, 15_000);
