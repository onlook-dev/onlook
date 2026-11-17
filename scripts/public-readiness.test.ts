import { afterAll, describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPublicReadiness } from './public-readiness.js';
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
  const cwd = mkdtempSync(join(tmpdir(), 'public-readiness-'));
  temporary.push(cwd);
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.name', 'Example contributor');
  git(cwd, 'config', 'user.email', 'contributor@example.test');
  writeFileSync(join(cwd, 'public-readiness.json'), '{"reviews":[]}');
  writeFileSync(join(cwd, 'package.json'), '{"scripts":{"test":"bun test"},"dependencies":{}}');
  commit(cwd);
  git(cwd, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  return cwd;
}

function commit(cwd: string, message = 'test: public-safe fixture'): void {
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-qm', message);
}

function review(cwd: string, path: string, text: string): void {
  writeFileSync(join(cwd, 'review.md'), 'Public source and license reviewed. Required notices retained.');
  const sha256 = createHash('sha256').update(text).digest('hex');
  const ledger = JSON.parse(readFileSync(join(cwd, 'public-readiness.json'), 'utf8'));
  ledger.reviews.push({ path, sha256, evidence: 'review.md' });
  writeFileSync(join(cwd, 'public-readiness.json'), JSON.stringify(ledger));
  git(cwd, 'add', '.');
}

function homePath(user = 'private-person'): string {
  return ['', 'Users', user, 'project'].join('/');
}

describe('public readiness', () => {
  it('checks pending and committed base merges without rechecking inherited baseline content', () => {
    const cwd = repository();
    git(cwd, 'checkout', '-qb', 'feature');
    writeFileSync(join(cwd, 'source.ts'), 'export const title = "Example";');
    commit(cwd);
    git(cwd, 'checkout', '-qb', 'updated-base', 'origin/main');
    writeFileSync(join(cwd, 'inherited.ts'), homePath());
    writeFileSync(join(cwd, 'inherited.svg'), '<svg/>');
    commit(cwd);
    git(cwd, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(cwd, 'checkout', '-q', 'feature');
    git(cwd, 'merge', '--no-commit', '--no-ff', 'origin/main');
    expect(checkPublicReadiness(cwd)).toEqual([]);
    writeFileSync(join(cwd, 'source.ts'), homePath());
    git(cwd, 'add', '.');
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: 'source.ts', revision: 'working tree' })]);
    commit(cwd);
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: 'source.ts', revision: git(cwd, 'rev-parse', '--short=12', 'HEAD') })]);
  });

  it('still checks intermediate branch commits after merging an updated base', () => {
    const cwd = repository();
    git(cwd, 'checkout', '-qb', 'feature');
    writeFileSync(join(cwd, 'source.ts'), homePath());
    commit(cwd);
    writeFileSync(join(cwd, 'source.ts'), 'export const title = "Example";');
    commit(cwd);
    git(cwd, 'checkout', '-qb', 'updated-base', 'origin/main');
    writeFileSync(join(cwd, 'inherited.svg'), '<svg/>');
    commit(cwd);
    git(cwd, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(cwd, 'checkout', '-q', 'feature');
    git(cwd, 'merge', '--no-edit', '--no-ff', 'origin/main');
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: 'source.ts' })]);
  });

  it('passes safe source changes and script-only package edits', () => {
    const cwd = repository();
    writeFileSync(join(cwd, 'source.ts'), 'export const title = "Example";');
    writeFileSync(join(cwd, 'package.json'), '{"scripts":{"test":"bun test --timeout 1000"},"dependencies":{}}');
    git(cwd, 'add', '.');
    expect(checkPublicReadiness(cwd)).toEqual([]);
    commit(cwd);
    git(cwd, 'checkout', '--detach', '-q');
    expect(checkPublicReadiness(cwd, 'origin/main', 'feature/public-safe')).toEqual([]);
  });

  it('checks event branch names in detached CI and refuses a missing or invalid branch identity', () => {
    const cwd = repository();
    git(cwd, 'checkout', '--detach', '-q');
    expect(() => checkPublicReadiness(cwd)).toThrow('detached checkout');
    expect(checkPublicReadiness(cwd, 'origin/main', `feature${homePath()}`)).toEqual([expect.objectContaining({ path: '(branch name)' })]);
    expect(() => checkPublicReadiness(cwd, 'origin/main', 'invalid branch')).toThrow('branch name is invalid');
  });

  it('does not let binary diff attributes hide personal content in history or working files', () => {
    const cwd = repository();
    writeFileSync(join(cwd, '.gitattributes'), '*.ts -diff\n');
    writeFileSync(join(cwd, 'source.ts'), homePath());
    git(cwd, 'add', '.');
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: 'source.ts' })]);
    commit(cwd);
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: 'source.ts' })]);
  });

  it('catches a personal home directory without a trailing separator', () => {
    const cwd = repository();
    writeFileSync(join(cwd, 'source.ts'), ['', 'home', 'private-person'].join('/'));
    git(cwd, 'add', '.');
    expect(checkPublicReadiness(cwd)).toHaveLength(1);
  });

  it('catches personal content in an intermediate commit even after deletion', () => {
    const cwd = repository();
    writeFileSync(join(cwd, 'source.ts'), `const path = "${homePath()}";`);
    commit(cwd);
    git(cwd, 'rm', 'source.ts');
    git(cwd, 'commit', '-qm', 'test: remove fixture');
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: 'source.ts', reason: expect.stringContaining('Personal home path') })]);
  });

  it('checks working additions including plus-prefixed lines without printing their contents', () => {
    const cwd = repository();
    writeFileSync(join(cwd, 'source.ts'), `++ ${homePath()}`);
    git(cwd, 'add', '.');
    const findings = checkPublicReadiness(cwd);
    expect(findings).toHaveLength(1);
    expect(JSON.stringify(findings)).not.toContain('private-person');
  });

  it('checks commit messages and branch names and allows the invented example user', () => {
    const cwd = repository();
    writeFileSync(join(cwd, 'source.ts'), homePath('example'));
    commit(cwd, `test: fixture at ${homePath()}`);
    git(cwd, 'branch', '-m', `feature${homePath()}`);
    expect(checkPublicReadiness(cwd).map((finding) => finding.path)).toEqual(['(commit message)', '(branch name)']);
  });

  it('rejects sensitive filenames but accepts an environment example', () => {
    const cwd = repository();
    writeFileSync(join(cwd, '.env.example'), 'PUBLIC_URL=https://example.test');
    writeFileSync(join(cwd, '.env.local'), 'PUBLIC_URL=https://example.test');
    git(cwd, 'add', '.');
    expect(checkPublicReadiness(cwd).map((finding) => finding.path)).toEqual(['.env.local']);
  });

  it('requires review evidence for a changed dependency and accepts an exact file digest', () => {
    const cwd = repository();
    const manifest = '{"dependencies":{"example-package":"1.0.0"}}';
    writeFileSync(join(cwd, 'package.json'), manifest);
    git(cwd, 'add', '.');
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: 'package.json', reason: expect.stringContaining('review evidence') })]);
    review(cwd, 'package.json', manifest);
    expect(checkPublicReadiness(cwd)).toEqual([]);
    writeFileSync(join(cwd, 'package.json'), '{"dependencies":{"example-package":"2.0.0"}}');
    expect(checkPublicReadiness(cwd)).toHaveLength(1);
  });

  it('requires review for lockfiles, assets, binary files and notices', () => {
    const cwd = repository();
    for (const path of ['bun.lock', 'icon.svg', 'LICENSE', 'NOTICE.txt']) writeFileSync(join(cwd, path), 'example');
    writeFileSync(join(cwd, 'opaque.data'), Buffer.from([0, 1, 2]));
    git(cwd, 'add', '.');
    expect(checkPublicReadiness(cwd).map((finding) => finding.path).sort()).toEqual(['LICENSE', 'NOTICE.txt', 'bun.lock', 'icon.svg', 'opaque.data']);
  });

  it('requires evidence for historical assets even when they were removed', () => {
    const cwd = repository();
    writeFileSync(join(cwd, 'icon.svg'), '<svg/>');
    commit(cwd);
    git(cwd, 'rm', 'icon.svg');
    git(cwd, 'commit', '-qm', 'test: remove asset');
    expect(checkPublicReadiness(cwd)).toHaveLength(2);
    review(cwd, 'icon.svg', '<svg/>');
    review(cwd, 'icon.svg', '');
    expect(checkPublicReadiness(cwd)).toEqual([]);
  });

  it('requires new review evidence when a license is deleted', () => {
    const cwd = repository();
    writeFileSync(join(cwd, 'LICENSE'), 'Public license fixture');
    commit(cwd);
    git(cwd, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(cwd, 'rm', 'LICENSE');
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: 'LICENSE' })]);
    review(cwd, 'LICENSE', '');
    expect(checkPublicReadiness(cwd)).toEqual([]);
  });

  it('checks filenames literally rather than treating them as Git pathspecs', () => {
    const cwd = repository();
    writeFileSync(join(cwd, ':(exclude)source.ts'), homePath());
    git(cwd, 'add', '.');
    expect(checkPublicReadiness(cwd)).toEqual([expect.objectContaining({ path: ':(exclude)source.ts' })]);
  });

  it('fails closed for missing or invalid review evidence without exposing malformed JSON', () => {
    const cwd = repository();
    writeFileSync(join(cwd, 'public-readiness.json'), '{not-public-content');
    expect(() => checkPublicReadiness(cwd)).toThrow('Public-readiness JSON is invalid');
    writeFileSync(join(cwd, 'public-readiness.json'), JSON.stringify({ reviews: [{ path: 'asset.svg', sha256: '0'.repeat(64), evidence: '../outside.md' }] }));
    expect(() => checkPublicReadiness(cwd)).toThrow('tracked Markdown evidence');
    writeFileSync(join(cwd, 'public-readiness.json'), '{"reviews":[]}');
    review(cwd, 'asset.svg', '<svg/>');
    writeFileSync(join(cwd, 'review.md'), '');
    expect(() => checkPublicReadiness(cwd)).toThrow('nonempty regular file');
    git(cwd, 'rm', '-f', 'review.md');
    symlinkSync('package.json', join(cwd, 'review.md'));
    git(cwd, 'add', '.');
    expect(() => checkPublicReadiness(cwd)).toThrow('nonempty regular file');
  });

  it('fails closed for a missing base or incomplete history', () => {
    const cwd = repository();
    expect(() => checkPublicReadiness(cwd, 'missing-base')).toThrow('Fetch complete history');
    const shallow = mkdtempSync(join(tmpdir(), 'public-readiness-shallow-'));
    temporary.push(shallow);
    git(cwd, 'clone', '--depth=1', `file://${cwd}`, shallow);
    expect(() => checkPublicReadiness(shallow, 'HEAD')).toThrow('complete Git history');
  });
});

describe('public readiness hook', () => {
  function runHook(cwd: string, input: string, fail = '') {
    const bin = join(cwd, 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'bun'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$HOOK_LOG"\n[ "$*" != "$FAIL_COMMAND" ]\n');
    chmodSync(join(bin, 'bun'), 0o755);
    return spawnSync('sh', ['-c', hookSource], { cwd, input, encoding: 'utf8', timeout: 10_000, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOOK_LOG: join(cwd, 'hook.log'), FAIL_COMMAND: fail } });
  }

  it('runs both checks for HEAD pushes and stops when the public check fails', () => {
    const cwd = repository();
    const input = `refs/heads/feature ${git(cwd, 'rev-parse', 'HEAD')} refs/heads/feature ${'0'.repeat(40)}\n`;
    expect(runHook(cwd, input).status).toBe(0);
    expect(readFileSync(join(cwd, 'hook.log'), 'utf8')).toBe('run check:public\nrun check:secrets\n');
    writeFileSync(join(cwd, 'hook.log'), '');
    expect(runHook(cwd, input, 'run check:public').status).not.toBe(0);
    expect(readFileSync(join(cwd, 'hook.log'), 'utf8')).toBe('run check:public\n');
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

  it('wires complete-history advisory CI and local verification to the same guards', () => {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const workflow = Bun.YAML.parse(readFileSync(new URL('../.github/workflows/public-readiness.yml', import.meta.url), 'utf8')) as { permissions: Record<string, string>; jobs: Record<string, { permissions: Record<string, string>; steps: { uses?: string; with?: Record<string, unknown>; run?: string }[] }> };
    expect(workflow.permissions).toEqual({});
    expect(workflow.jobs['public-readiness']!.permissions).toEqual({ contents: 'read' });
    const steps = workflow.jobs['public-readiness']!.steps;
    expect(steps.find((step) => step.uses?.startsWith('actions/checkout@'))?.with?.['fetch-depth']).toBe(0);
    expect(steps.some((step) => step.run?.includes('bun run check:public'))).toBe(true);
    expect(steps.some((step) => step.run === 'bun run check:secrets')).toBe(true);
    expect(manifest.scripts.verify).toContain('bun run check:secrets && bun run check:public');
  });

  it('uses the main baseline when a push event names an unavailable old branch tip', () => {
    const cwd = repository();
    const workflow = Bun.YAML.parse(readFileSync(new URL('../.github/workflows/public-readiness.yml', import.meta.url), 'utf8')) as { jobs: Record<string, { steps: { run?: string }[] }> };
    const command = workflow.jobs['public-readiness']!.steps.find((step) => step.run?.includes('BASE_SHA'))!.run!;
    const bin = join(cwd, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'bun'), '#!/bin/sh\nprintf "%s\\n" "$*"\n');
    chmodSync(join(bin, 'bun'), 0o755);
    const head = git(cwd, 'rev-parse', 'HEAD');
    for (const base of ['', '0'.repeat(40), '1'.repeat(40), head]) {
      const result = spawnSync('sh', ['-c', command], { cwd, encoding: 'utf8', timeout: 10_000, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, BASE_SHA: base, GITHUB_EVENT_NAME: 'push', PUBLIC_READINESS_BRANCH: 'main', BASE_BRANCH: 'main' } });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(base === head ? `run check:public --base ${head}` : 'run check:public');
    }
  });

  it('uses main for feature pushes and the event base for pull requests and default-branch pushes', () => {
    const cwd = repository();
    const workflow = Bun.YAML.parse(readFileSync(new URL('../.github/workflows/public-readiness.yml', import.meta.url), 'utf8')) as { jobs: Record<string, { steps: { env?: Record<string, string>; run?: string }[] }> };
    const step = workflow.jobs['public-readiness']!.steps.find((candidate) => candidate.run?.includes('BASE_SHA'))!;
    expect(step.env?.BASE_BRANCH).toBe('${{ github.event.repository.default_branch }}');
    const bin = join(cwd, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'bun'), '#!/bin/sh\nprintf "%s\\n" "$*"\n');
    chmodSync(join(bin, 'bun'), 0o755);
    const head = git(cwd, 'rev-parse', 'HEAD');
    for (const [event, branch, expected] of [
      ['push', 'feature', 'run check:public'],
      ['push', 'main', `run check:public --base ${head}`],
      ['pull_request', 'feature', `run check:public --base ${head}`],
    ]) {
      const result = spawnSync('sh', ['-c', step.run!], { cwd, encoding: 'utf8', timeout: 10_000, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, BASE_SHA: head, GITHUB_EVENT_NAME: event, PUBLIC_READINESS_BRANCH: branch, BASE_BRANCH: 'main' } });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(expected!);
    }
  });
});
