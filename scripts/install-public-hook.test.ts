import { afterAll, describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installPublicHook } from './install-public-hook.js';

const temporary: string[] = [];
const hookSource = readFileSync(new URL('../.githooks/pre-push', import.meta.url), 'utf8');

afterAll(() => {
  for (const directory of temporary) rmSync(directory, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10_000, env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
  if (result.status !== 0) throw new Error(`Git fixture failed: ${args[0]}`);
  return result.stdout.trim();
}

function repository(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'public-hook-'));
  temporary.push(cwd);
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.name', 'Example contributor');
  git(cwd, 'config', 'user.email', 'contributor@example.test');
  writeFileSync(join(cwd, 'package.json'), '{"scripts":{"test":"bun test"},"dependencies":{}}');
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-qm', 'test: fixture');
  return cwd;
}

describe('pre-push hook', () => {
  function runHook(cwd: string, input: string, fail = '') {
    const bin = join(cwd, 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'bun'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$HOOK_LOG"\n[ "$*" != "$FAIL_COMMAND" ]\n');
    chmodSync(join(bin, 'bun'), 0o755);
    return spawnSync('sh', ['-c', hookSource], { cwd, input, encoding: 'utf8', timeout: 10_000, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOOK_LOG: join(cwd, 'hook.log'), FAIL_COMMAND: fail } });
  }

  it('runs the secret scan for HEAD pushes and stops when it fails', () => {
    const cwd = repository();
    const input = `refs/heads/feature ${git(cwd, 'rev-parse', 'HEAD')} refs/heads/feature ${'0'.repeat(40)}\n`;
    expect(runHook(cwd, input).status).toBe(0);
    expect(readFileSync(join(cwd, 'hook.log'), 'utf8')).toBe('run check:secrets\n');
    expect(runHook(cwd, input, 'run check:secrets').status).not.toBe(0);
  });

  it('blocks direct main and non-HEAD pushes and skips deletion-only pushes', () => {
    const cwd = repository();
    const head = git(cwd, 'rev-parse', 'HEAD');
    expect(runHook(cwd, `refs/heads/feature ${head} refs/heads/main ${head}\n`).stderr).toContain('Direct pushes to main');
    expect(runHook(cwd, `refs/heads/other ${'1'.repeat(40)} refs/heads/other ${head}\n`).status).not.toBe(0);
    expect(runHook(cwd, `(delete) ${'0'.repeat(40)} refs/heads/old ${head}\n`).status).toBe(0);
  });

  it('installs explicitly and never overwrites an existing hooksPath or pre-push hook', () => {
    const cwd = repository();
    mkdirSync(join(cwd, '.githooks'));
    writeFileSync(join(cwd, '.githooks/pre-push'), hookSource);
    git(cwd, 'add', '.githooks/pre-push');
    installPublicHook(cwd);
    expect(git(cwd, 'config', '--local', '--get', 'core.hooksPath')).toBe('.githooks');
    expect(() => installPublicHook(cwd)).not.toThrow();
    git(cwd, 'config', '--local', 'core.hooksPath', 'other-hooks');
    expect(() => installPublicHook(cwd)).toThrow('Another hooksPath');
    expect(git(cwd, 'config', '--local', '--get', 'core.hooksPath')).toBe('other-hooks');
    git(cwd, 'config', '--local', '--unset', 'core.hooksPath');
    writeFileSync(join(cwd, '.git/hooks/pre-push'), '#!/bin/sh\nexit 0\n');
    expect(() => installPublicHook(cwd)).toThrow('pre-push hook already exists');
  });

  it('preserves active default hooks rather than silently disabling them', () => {
    const cwd = repository();
    mkdirSync(join(cwd, '.githooks'));
    writeFileSync(join(cwd, '.githooks/pre-push'), hookSource);
    git(cwd, 'add', '.githooks/pre-push');
    writeFileSync(join(cwd, '.git/hooks/pre-commit'), '#!/bin/sh\nexit 0\n');
    chmodSync(join(cwd, '.git/hooks/pre-commit'), 0o755);
    expect(() => installPublicHook(cwd)).toThrow('Existing Git hooks would be disabled');
    expect(spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], { cwd }).status).toBe(1);
  });
});
