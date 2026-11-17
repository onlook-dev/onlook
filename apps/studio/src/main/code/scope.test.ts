import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { resolveInWorktree } from './scope.js';

let worktree: string;
let outside: string;

beforeAll(() => {
  outside = makeDirWithFiles({
    name: 'code-scope-outside',
    files: { 'secret.ts': 'export const secret = 1;\n' },
  });
  worktree = makeDirWithFiles({
    name: 'code-scope',
    files: {
      'src/App.tsx': 'export const App = () => null;\n',
      '.git/config': '[core]\n',
    },
  });
  symlinkSync(outside, join(worktree, 'escape'));
  symlinkSync(join(worktree, 'src'), join(worktree, 'inside'));
  symlinkSync(join(worktree, '.git'), join(worktree, 'gitlink'));
});

afterAll(() => {
  cleanupTempFixtures();
});

describe('a path that leaves the worktree', () => {
  it('is refused when it climbs out with dot-dot', () => {
    const climb = relative(worktree, join(outside, 'secret.ts'));

    expect(resolveInWorktree(worktree, climb)).toEqual({ ok: false, code: 'out-of-scope' });
  });

  it('is refused when it names an absolute path elsewhere', () => {
    expect(resolveInWorktree(worktree, join(outside, 'secret.ts'))).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  it('is refused when every segment is innocent and a symlink does the leaving', () => {
    expect(resolveInWorktree(worktree, 'escape/secret.ts')).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  it('is refused when the path does not exist yet and its nearest ancestor escapes', () => {
    expect(resolveInWorktree(worktree, 'escape/new.ts')).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  it('is refused when it carries a NUL byte', () => {
    expect(resolveInWorktree(worktree, 'src/\0App.tsx')).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });
});

describe('a path that stays inside the worktree', () => {
  it('is allowed through a symlink whose target is also inside', () => {
    const verdict = resolveInWorktree(worktree, 'inside/App.tsx');

    expect(verdict).toEqual({ ok: true, path: join(realpathSync.native(worktree), 'src/App.tsx') });
  });

  it('is allowed when it does not exist yet and its nearest ancestor is inside', () => {
    const verdict = resolveInWorktree(worktree, 'inside/New.tsx');

    expect(verdict).toEqual({ ok: true, path: join(realpathSync.native(worktree), 'src/New.tsx') });
  });

  it('resolves to the same file whether the worktree arrives raw or canonical', () => {
    const raw = resolveInWorktree(worktree, 'src/App.tsx');
    const canonical = resolveInWorktree(realpathSync.native(worktree), 'src/App.tsx');

    expect(raw).toEqual(canonical);
  });
});

describe('the git directory', () => {
  it('is refused as a plain first segment', () => {
    expect(resolveInWorktree(worktree, '.git/config')).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  it('is refused through a dot-dot spelling that normalises onto it', () => {
    expect(resolveInWorktree(worktree, 'src/../.git/config')).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  it('is refused through an in-worktree symlink that reaches it', () => {
    expect(resolveInWorktree(worktree, 'gitlink/config')).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  it('is refused for a file it does not hold yet', () => {
    expect(resolveInWorktree(worktree, '.git/hooks/pre-commit')).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });
});

describe('what a contained path is still not allowed to be (ONL-2563)', () => {
  let root: string;

  beforeAll(() => {
    root = makeDirWithFiles({ name: 'code-scope-excluded', files: { 'keep.txt': 'x\n' } });
  });
  /* Studio copies the user's own env files into every worktree, so this file is
     always there and `resolveInWorktree` was the only gate read and write had. */
  it('refuses an env file, which is contained and is still not the designer’s code', () => {
    writeFileSync(join(root, '.env'), 'SECRET=1\n');
    expect(resolveInWorktree(root, '.env')).toEqual({ ok: false, code: 'out-of-scope' });
  });

  it('refuses a dependency’s own source', () => {
    mkdirSync(join(root, 'node_modules/lib'), { recursive: true });
    writeFileSync(join(root, 'node_modules/lib/index.js'), 'export default 1\n');
    expect(resolveInWorktree(root, 'node_modules/lib/index.js')).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  /* In a worktree checkout `.git` is a FILE holding `gitdir: <user checkout>/...`,
     so a rule that only knows it as a directory hands back the user's own path. */
  it('refuses the worktree’s git pointer, which is a file and not a directory', () => {
    writeFileSync(join(root, '.git'), 'gitdir: /Users/someone/checkout/.git/worktrees/x\n');
    expect(resolveInWorktree(root, '.git')).toEqual({ ok: false, code: 'out-of-scope' });
  });

  it('still admits an ordinary file beside them', () => {
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/App.tsx'), 'export const App = () => null\n');
    expect(resolveInWorktree(root, 'src/App.tsx')).toMatchObject({ ok: true });
  });
});
