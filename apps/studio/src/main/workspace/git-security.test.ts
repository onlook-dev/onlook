import { afterAll, describe, expect, it } from 'bun:test';
import { chmodSync, existsSync, mkdirSync, readdirSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, gitOutput, makeGitRepo } from '@studio/fixtures';
import { addWorktree, captureDiskSnapshot, git } from './git.js';

afterAll(cleanupTempFixtures);

describe('folder-controlled Git security', () => {
  it('security does not execute a repository checkout hook when creating a Project', async () => {
    const { path: source } = makeGitRepo();
    const marker = join(source, 'hook-executed');
    const hook = join(source, '.git/hooks/post-checkout');
    mkdirSync(join(source, '.git/hooks'), { recursive: true });
    writeFileSync(hook, `#!/bin/sh\ntouch '${marker}'\n`);
    chmodSync(hook, 0o755);
    const result = await addWorktree({ root: source, branch: 'security-test', worktreePath: join(source, 'project'), startPoint: 'HEAD' });
    expect(result.ok).toBe(true);
    expect(existsSync(marker)).toBe(false);
  });

  it('security does not execute repository filters while snapshotting folder contents', async () => {
    const { path: source } = makeGitRepo();
    const marker = join(source, 'filter-executed');
    writeFileSync(join(source, '.gitattributes'), '*.js filter=untrusted\n');
    writeFileSync(join(source, 'index.js'), 'changed content\n');
    expect((await git(source, ['config', 'filter.untrusted.clean', `touch '${marker}'; cat`])).ok).toBe(true);
    expect((await git(source, ['config', 'filter.untrusted.required', 'true'])).ok).toBe(true);
    expect((await git(source, ['status', '--porcelain'])).ok).toBe(true);
    expect(existsSync(marker)).toBe(false);
    const result = await captureDiskSnapshot(source);
    expect(result.tree).toMatch(/^[a-f0-9]{40}$/);
    expect((await git(source, ['show', `${result.tree}:index.js`])).out).toBe('changed content');
    expect(existsSync(marker)).toBe(false);
  });

  it('security disables repository fsmonitor programs for status reads', async () => {
    const { path: source } = makeGitRepo();
    const marker = join(source, 'monitor-executed');
    const monitor = join(source, 'monitor');
    writeFileSync(monitor, `#!/bin/sh\ntouch '${marker}'\n`);
    chmodSync(monitor, 0o755);
    expect((await git(source, ['config', 'core.fsmonitor', monitor])).ok).toBe(true);
    expect((await git(source, ['status', '--porcelain'])).ok).toBe(true);
    expect(existsSync(marker)).toBe(false);
  });

  it('security does not execute repository-selected upload-pack programs during fetch', async () => {
    const { path: source } = makeGitRepo();
    const marker = join(source, 'upload-pack-executed');
    expect((await git(source, ['config', 'remote.origin.uploadpack', `touch '${marker}'; git-upload-pack`])).ok).toBe(true);
    expect((await git(source, ['fetch', '--quiet', 'origin'])).ok).toBe(true);
    expect(existsSync(marker)).toBe(false);
  });

  it('security does not execute repository maintenance commands during automatic fetch', async () => {
    for (const protectedFetch of [false, true]) {
      const { path: source } = makeGitRepo();
      const marker = join(source, 'maintenance-executed');
      gitOutput(source, ['repack', '-d']);
      writeFileSync(join(source, 'index.js'), 'another packed commit\n');
      gitOutput(source, ['add', 'index.js']);
      gitOutput(source, ['-c', 'maintenance.auto=false', 'commit', '--quiet', '-m', 'second pack']);
      gitOutput(source, ['repack', '-d']);
      expect(readdirSync(join(source, '.git/objects/pack')).filter((name) => name.endsWith('.pack')).length).toBeGreaterThan(1);
      writeFileSync(join(source, 'unreachable'), 'unreachable object\n');
      const unreachable = gitOutput(source, ['hash-object', '-w', 'unreachable']);
      const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);
      utimesSync(join(source, '.git/objects', unreachable.slice(0, 2), unreachable.slice(2)), old, old);
      for (const [key, value] of [
        ['maintenance.auto', 'true'], ['maintenance.gc.enabled', 'true'], ['gc.auto', '1'], ['gc.autoPackLimit', '1'],
        ['gc.autoDetach', 'false'], ['maintenance.autoDetach', 'false'], ['gc.cruftPacks', 'true'],
        ['gc.recentObjectsHook', `touch '${marker}'`],
      ]) gitOutput(source, ['config', key!, value!]);
      if (protectedFetch) expect((await git(source, ['fetch', '--quiet', 'origin'])).ok).toBe(true);
      else gitOutput(source, ['fetch', '--quiet', 'origin']);
      expect(existsSync(marker)).toBe(!protectedFetch);
    }
  });
});
