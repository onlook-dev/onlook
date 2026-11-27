import { afterAll, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { cleanupTempFixtures, makeGitRepo } from '@studio/fixtures';
import { runCli, type CliResult } from '../env/cli.js';
import { cloneRepository, type GithubCloneNetwork } from './clone.js';
import { withGitCredential } from './git.js';
import { cleanupPendingClones, trackClone } from './pending.js';
import { isWindows } from '../env/platform.js';

const root = await mkdtemp(join(tmpdir(), 'onlook-github-clone-test-'));
afterAll(async () => { cleanupTempFixtures(); await rm(root, { recursive: true, force: true }); });
const credential = () => ({ status: 'ready' as const, remoteUrl: 'https://github.com/team/website.git', username: 'x-access-token' as const, password: 'secret-not-for-projects', expiresAt: Date.now() + 300_000 });
const helperConfigPath = (helperCommand: string) => /--config ('.*') --data-binary @-/.exec(helperCommand)![1]!.slice(1, -1).replaceAll("'\\''", "'");
const askCredential = (config: string, init: RequestInit, path = '') => {
  const socket = /^unix-socket = (.+)$/m.exec(config);
  return fetch(`${JSON.parse(/^url = (.+)$/m.exec(config)![1]!) as string}${path}`, {
    method: 'POST', ...init,
    ...(socket ? { unix: JSON.parse(socket[1]!) as string } : {}),
  });
};
const credentialFields = 'protocol=https\nhost=github.com\npath=team/website.git\n\n';
const helperConfig = async (run: (args: string[]) => Promise<CliResult>) => {
  const command = await run(['config', '--get', 'credential.helper']);
  expect(command.ok).toBe(true);
  const path = helperConfigPath(command.out);
  return { command: command.out, path, config: await readFile(path, 'utf8') };
};

test('real Git clones the selected branch and credits the designer without persisting a credential', async () => {
  const source = makeGitRepo({ name: 'github-import-source' });
  expect((await runCli('git', source.path, ['checkout', '-b', 'design'], { timeoutMs: 10_000 })).ok).toBe(true);
  const transport: GithubCloneNetwork = {
    author: async () => ({ id: 42, login: 'designer' }),
    withCredential: async (secret, work) => work((args, options = {}) => runCli('git', root, ['-c', 'core.hooksPath=/dev/null', ...args.map((arg) => arg === secret.remoteUrl ? source.path : arg)], { timeoutMs: 30_000, ...options })),
  };
  const result = await cloneRepository({ credential: credential(), repository: 'team/website', branch: 'design', parent: join(root, 'complete'), signal: new AbortController().signal, progress: () => {} }, transport);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure);
  expect(basename(result.sourcePath)).toBe('website');
  const config = await readFile(join(result.sourcePath, '.git', 'config'), 'utf8');
  expect(config).not.toContain(credential().password);
  expect(config).not.toContain('credential');
  expect(config).toContain('designer'); expect(config).toContain('42+designer@users.noreply.github.com');
  const head = await runCli('git', result.sourcePath, ['rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 10_000 });
  expect(head.out).toBe('design');
  expect((await runCli('git', result.sourcePath, ['commit', '--allow-empty', '-m', 'Designer change'], { timeoutMs: 10_000 })).ok).toBe(true);
  expect((await runCli('git', result.sourcePath, ['log', '-1', '--format=%ae'], { timeoutMs: 10_000 })).out).toBe('42+designer@users.noreply.github.com');
});

test('a repository with no listed default branch clones remote HEAD without an empty branch argument', async () => {
  const source = makeGitRepo({ name: 'github-remote-head' });
  const calls: string[][] = [];
  const transport: GithubCloneNetwork = {
    author: async () => ({ id: 42, login: 'designer' }),
    withCredential: async (secret, work) => work((args, options = {}) => {
      calls.push(args);
      return runCli('git', root, ['-c', 'core.hooksPath=/dev/null', ...args.map((arg) => arg === secret.remoteUrl ? source.path : arg)], { timeoutMs: 30_000, ...options });
    }),
  };
  const result = await cloneRepository({ credential: credential(), repository: 'team/website', branch: '', parent: join(root, 'remote-head'), signal: new AbortController().signal, progress: () => {} }, transport);
  expect(result.ok).toBe(true);
  expect(calls.find((args) => args.includes('clone'))).not.toContain('--branch');
});

for (const failure of ['cancelled', 'disk', 'access', 'network', 'empty'] as const) test(`failed clone removes only its exclusively owned directory: ${failure}`, async () => {
  const parent = await mkdtemp(join(root, `${failure}-`));
  await writeFile(join(parent, 'keep.txt'), 'designer files');
  const controller = new AbortController();
  const transport: GithubCloneNetwork = {
    author: async () => ({ id: 42, login: 'designer' }),
    withCredential: async (_credential, work) => work(async () => {
      if (failure === 'cancelled') controller.abort();
      const err = { cancelled: 'RPC failed', disk: 'No space left on device', access: 'Authentication failed', network: 'RPC failed', empty: 'empty repository' }[failure];
      return { ok: false, out: '', err, timedOut: false, missing: false, exitCode: 1 };
    }),
  };
  const result = await cloneRepository({ credential: credential(), repository: 'team/website', branch: 'main', parent, signal: controller.signal, progress: () => {} }, transport);
  expect(result).toEqual({ ok: false, failure });
  expect(await readdir(parent)).toEqual(['keep.txt']);
});

test.skipIf(process.platform === 'win32')('a denied cleanup never claims the unfinished copy was removed', async () => {
  const parent = await mkdtemp(join(root, 'denied-cleanup-'));
  const transport: GithubCloneNetwork = {
    author: async () => ({ id: 42, login: 'designer' }),
    withCredential: async (_credential, work) => work(async () => {
      await chmod(parent, 0o500);
      return { ok: false, out: '', err: 'RPC failed', timedOut: false, missing: false, exitCode: 1 };
    }),
  };
  try {
    const result = await cloneRepository({ credential: credential(), repository: 'team/website', branch: 'main', parent, signal: new AbortController().signal, progress: () => {} }, transport);
    expect(result).toEqual({ ok: false, failure: 'cleanup' });
  } finally { await chmod(parent, 0o700); }
});

test('an abandoned clone is recovered on relaunch only when its ownership marker still matches', async () => {
  const abandoned = await mkdtemp(join(root, 'abandoned-'));
  const changed = await mkdtemp(join(root, 'changed-'));
  await trackClone(abandoned); await trackClone(changed);
  await writeFile(join(changed, '.onlook-clone-in-progress'), 'not our clone');
  await cleanupPendingClones();
  expect(await readdir(root)).not.toContain(basename(abandoned));
  expect(await readdir(changed)).toEqual(['.onlook-clone-in-progress']);
});

test('real Git credential helper only returns a secret for its exact HTTPS repository', async () => {
  await withGitCredential(credential(), async (run) => {
    const allowed = await run(['credential', 'fill'], { stdin: 'protocol=https\nhost=github.com\npath=team/website.git\n\n' });
    expect(allowed.ok).toBe(true); expect(allowed.out).toContain('password=secret-not-for-projects');
    for (const fields of ['protocol=https\nhost=attacker.test\npath=team/website.git', 'protocol=https\nhost=github.com\npath=other/repo.git', 'protocol=http\nhost=github.com\npath=team/website.git']) {
      const denied = await run(['credential', 'fill'], { stdin: `${fields}\n\n` });
      expect(denied.ok).toBe(false); expect(denied.out).not.toContain('secret-not-for-projects');
    }
  });
});

test('credential requests require the nonce and keep the password out of helper files and commands', async () => {
  let helperPath = '';
  await withGitCredential(credential(), async (run) => {
    const helper = await helperConfig(run);
    expect(helper.command).not.toContain(credential().password);
    helperPath = helper.path;
    expect(helper.config).not.toContain(credential().password);
    if (!isWindows()) expect((await stat(helperPath)).mode & 0o777).toBe(0o600);
    const nonce = /^header = "X-Onlook-Nonce: (.+)"$/m.exec(helper.config)![1]!;
    for (const supplied of ['', 'incorrect']) {
      const denied = await askCredential(helper.config, { body: credentialFields, headers: { 'X-Onlook-Nonce': supplied } });
      expect(denied.status).toBe(403);
      expect(await denied.text()).not.toContain(credential().password);
    }
    const allowed = await askCredential(helper.config, { body: credentialFields, headers: { 'X-Onlook-Nonce': nonce } });
    expect(allowed.status).toBe(200);
    expect(await allowed.text()).toContain(`password=${credential().password}`);
  });
  await expect(stat(helperPath)).rejects.toThrow();
});

test('the credential listener answers only a bounded POST to its own path', async () => {
  await withGitCredential(credential(), async (run) => {
    const helper = await helperConfig(run);
    const nonce = { 'X-Onlook-Nonce': /^header = "X-Onlook-Nonce: (.+)"$/m.exec(helper.config)![1]! };
    const refused = [
      await askCredential(helper.config, { method: 'GET', headers: nonce }).then((response) => response.text()),
      await askCredential(helper.config, { body: credentialFields, headers: nonce }, 'credential').then((response) => response.text()),
      await askCredential(helper.config, { body: `${'o'.repeat(9000)}\n${credentialFields}`, headers: nonce })
        .then((response) => response.text(), () => 'the oversized request was dropped'),
    ];
    for (const answer of refused) expect(answer).not.toContain(credential().password);
  });
});

test.skipIf(isWindows())('the credential listener is a socket file in a folder only its owner can enter', async () => {
  let socketPath = '';
  await withGitCredential(credential(), async (run) => {
    const helper = await helperConfig(run);
    expect(helper.config).not.toContain('127.0.0.1');
    socketPath = JSON.parse(/^unix-socket = (.+)$/m.exec(helper.config)![1]!) as string;
    expect((await stat(socketPath)).isSocket()).toBe(true);
    expect((await stat(dirname(socketPath))).mode & 0o777).toBe(0o700);
  });
  await expect(stat(socketPath)).rejects.toThrow();
});

test.skipIf(!isWindows())('the credential listener is a loopback port where a socket cannot be served', async () => {
  await withGitCredential(credential(), async (run) => {
    const helper = await helperConfig(run);
    expect(helper.config).not.toContain('unix-socket');
    expect(/^url = "http:\/\/127\.0\.0\.1:\d+\/"$/m.test(helper.config)).toBe(true);
  });
});

test.skipIf(isWindows())('the credential socket moves to a shorter directory when the temporary path cannot hold it', async () => {
  const configured = process.env['TMPDIR'];
  const deep = join(await mkdtemp(join(root, 'deep-')), 'a'.repeat(60));
  await mkdir(deep, { recursive: true });
  process.env['TMPDIR'] = deep;
  try {
    await withGitCredential(credential(), async (run) => {
      const helper = await helperConfig(run);
      const socketPath = JSON.parse(/^unix-socket = (.+)$/m.exec(helper.config)![1]!) as string;
      expect(socketPath.startsWith('/tmp/')).toBe(true);
      expect((await stat(dirname(socketPath))).mode & 0o777).toBe(0o700);
      const filled = await run(['credential', 'fill'], { stdin: credentialFields });
      expect(filled.out).toContain(`password=${credential().password}`);
    });
  } finally {
    if (configured === undefined) delete process.env['TMPDIR']; else process.env['TMPDIR'] = configured;
  }
});

test('the credential helper ignores curl settings that redirect its response or use a proxy', async () => {
  const curlHome = await mkdtemp(join(root, 'curl-home-'));
  const redirected = join(curlHome, 'credential-output');
  await writeFile(join(curlHome, '.curlrc'), `output = ${JSON.stringify(redirected.replaceAll('\\', '/'))}\n`);
  await withGitCredential(credential(), async (run) => {
    const command = await run(['config', '--get', 'credential.helper']);
    expect(command.ok).toBe(true);
    const home = `'${curlHome.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`;
    const helper = `!export CURL_HOME=${home} ALL_PROXY='http://127.0.0.1:9' NO_PROXY=''; ${command.out.slice(1)}`;
    const result = await run(['-c', 'credential.helper=', '-c', `credential.helper=${helper}`, 'credential', 'fill'], {
      stdin: 'protocol=https\nhost=github.com\npath=team/website.git\n\n',
    });
    expect(result.ok).toBe(true);
    expect(result.out).toContain(`password=${credential().password}`);
  });
  expect(await readdir(curlHome)).toEqual(['.curlrc']);
});

test('the credential helper refuses expired credentials', async () => {
  await withGitCredential({ ...credential(), expiresAt: Date.now() - 1 }, async (run) => {
    const result = await run(['credential', 'fill'], { stdin: credentialFields });
    expect(result.ok).toBe(false);
    expect(result.out).not.toContain(credential().password);
  });
});

test('the credential helper works when the app executable cannot run as Node', async () => {
  const executable = Object.getOwnPropertyDescriptor(process, 'execPath')!;
  Object.defineProperty(process, 'execPath', { ...executable, value: join(root, 'packaged-app-without-node-mode') });
  try {
    await withGitCredential(credential(), async (run) => {
      const result = await run(['credential', 'fill'], { stdin: 'protocol=https\nhost=github.com\npath=team/website.git\n\n' });
      expect(result.err).toBe('');
      expect(result.ok).toBe(true);
      expect(result.out).toContain(`password=${credential().password}`);
    });
  } finally {
    Object.defineProperty(process, 'execPath', executable);
  }
});
