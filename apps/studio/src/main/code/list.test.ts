import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { listCodeFiles, walkWorktree } from './list.js';

let worktree: string;
let outside: string;

function filesOf(request: Parameters<typeof listCodeFiles>[1] = {}): readonly string[] {
  const result = listCodeFiles(worktree, request);
  if (!result.ok) throw new Error(`refused: ${result.code}`);
  return result.files;
}

beforeAll(() => {
  outside = makeDirWithFiles({
    name: 'code-list-outside',
    files: { 'secret.ts': 'export const secret = 1;\n' },
  });
  worktree = makeDirWithFiles({
    name: 'code-list',
    files: {
      'package.json': '{ "name": "skylark" }\n',
      'src/App.tsx': 'export const App = () => null;\n',
      'src/components/Hero.tsx': 'export const Hero = () => null;\n',
      '.env': 'FIXTURE_ONLY=not-a-real-secret\n',
      '.env.local': 'FIXTURE_ONLY=not-a-real-secret\n',
      '.DS_Store': 'not-really-finder-metadata\n',
      '.git/config': '[core]\n',
      'node_modules/left-pad/index.js': 'module.exports = (s) => s;\n',
      'dist/bundle.js': '// built output\n',
      '.next/cache/one.js': '// cached\n',
    },
  });
  symlinkSync(outside, join(worktree, 'escape'));
  symlinkSync(join(worktree, 'src/components'), join(worktree, 'mirror'));
  symlinkSync(worktree, join(worktree, 'src/loop'));
});

afterAll(() => {
  cleanupTempFixtures();
});

describe('listing the Project', () => {
  it('leaves out the dependency, build and version-control folders', () => {
    const files = filesOf();

    expect(files).toContain('package.json');
    expect(files).toContain('src/App.tsx');
    expect(files.some((file) => file.startsWith('node_modules/'))).toBe(false);
    expect(files.some((file) => file.startsWith('dist/'))).toBe(false);
    expect(files.some((file) => file.startsWith('.next/'))).toBe(false);
    expect(files.some((file) => file.startsWith('.git/'))).toBe(false);
  });

  it("leaves out the user's env files", () => {
    const files = filesOf();

    expect(files).not.toContain('.env');
    expect(files).not.toContain('.env.local');
  });

  it('leaves out a directory symlink whose target is outside the worktree', () => {
    const files = filesOf();

    expect(files.some((file) => file.startsWith('escape/'))).toBe(false);
  });

  it('walks a directory symlink whose target stays inside the worktree', () => {
    expect(filesOf()).toContain('mirror/Hero.tsx');
  });

  it('keeps both spellings of a mirrored folder, because both are real paths a tab can hold', () => {
    const files = filesOf();

    expect(files).toContain('mirror/Hero.tsx');
    expect(files).toContain('src/components/Hero.tsx');
  });

  it('stops at a symlink that loops back onto the worktree rather than walking forever', () => {
    expect(filesOf().some((file) => file.startsWith('src/loop/'))).toBe(false);
    expect(filesOf({ path: 'src' }).some((file) => file.startsWith('src/loop/'))).toBe(false);
  });

  it('starts from a folder inside the Project and still answers worktree-relative paths', () => {
    expect(filesOf({ path: 'src' })).toEqual(['src/App.tsx', 'src/components/Hero.tsx']);
  });

  it('refuses an excluded folder named outright rather than walking it', () => {
    expect(listCodeFiles(worktree, { path: 'node_modules' })).toEqual({
      ok: false,
      code: 'out-of-scope',
    });
  });

  it('names a missing folder', () => {
    expect(listCodeFiles(worktree, { path: 'src/nowhere' })).toEqual({
      ok: false,
      code: 'not-found',
    });
  });

  it('refuses a view the routing does not place in a Project', () => {
    expect(listCodeFiles(undefined, {})).toEqual({ ok: false, code: 'no-project' });
  });

  it('answers truncated rather than reading past its cap', () => {
    const walk = walkWorktree(worktree, { limit: 2 });

    expect(walk.files).toHaveLength(2);
    expect(walk.truncated).toBe(true);
  });
});
