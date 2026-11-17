import { afterAll, expect, test } from 'bun:test';
import { chmod, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { cleanupTempFixtures, makeGitRepo } from '@studio/fixtures';
import { runCli } from '../env/cli.js';
import { cloneRepository, type GithubCloneNetwork } from './clone.js';
import { withGitCredential } from './git.js';
import { cleanupPendingClones, trackClone } from './pending.js';

const root = await mkdtemp(join(tmpdir(), 'onlook-github-clone-test-'));
afterAll(async () => { cleanupTempFixtures(); await rm(root, { recursive: true, force: true }); });
const credential = () => ({ status: 'ready' as const, remoteUrl: 'https://github.com/team/website.git', username: 'x-access-token' as const, password: 'secret-not-for-projects', expiresAt: Date.now() + 300_000 });

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
  expect(await readdir(root)).not.toContain(abandoned.split('/').at(-1)!);
  expect(await readdir(changed)).toEqual(['.onlook-clone-in-progress']);
});

test('real Git credential helper only returns a secret for its exact HTTPS repository', async () => {
  await withGitCredential(credential(), async (run) => {
    const allowed = await run(['credential', 'fill'], { stdin: 'protocol=https\nhost=github.com\npath=team/website.git\n\n' });
    expect(allowed.ok).toBe(true); expect(allowed.out).toContain('password=secret-not-for-projects');
    for (const fields of ['protocol=https\nhost=attacker.test\npath=team/website.git', 'protocol=https\nhost=github.com\npath=other/repo.git']) {
      const denied = await run(['credential', 'fill'], { stdin: `${fields}\n\n` });
      expect(denied.ok).toBe(false); expect(denied.out).not.toContain('secret-not-for-projects');
    }
  });
});
