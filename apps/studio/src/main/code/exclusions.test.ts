import { describe, expect, it } from 'bun:test';
import { isExcludedDir, isExcludedFile, isExcludedPath } from './exclusions.js';

describe('what the picker never browses', () => {
  it('skips dependency, build and version-control folders', () => {
    for (const name of ['node_modules', 'dist', 'build', 'out', '.next', '.turbo', '.git']) {
      expect(isExcludedDir(name)).toBe(true);
    }
  });

  it('walks the folders a designer works in', () => {
    for (const name of ['src', 'components', 'styles', 'docs', 'public', 'app']) {
      expect(isExcludedDir(name)).toBe(false);
    }
  });

  it('skips the env files Studio copied into the worktree', () => {
    expect(isExcludedFile('.env')).toBe(true);
    expect(isExcludedFile('.env.local')).toBe(true);
    expect(isExcludedFile('.env.production')).toBe(true);
  });

  it('keeps the config and lock files a project is read through', () => {
    for (const name of ['package.json', 'bun.lock', 'tsconfig.json', 'vite.config.ts', 'env.d.ts']) {
      expect(isExcludedFile(name)).toBe(false);
    }
  });

  it('decides a whole path on any of its segments', () => {
    expect(isExcludedPath('node_modules/left-pad/index.js')).toBe(true);
    expect(isExcludedPath('src/app/.env.local')).toBe(true);
    expect(isExcludedPath('src/components/Hero.tsx')).toBe(false);
    expect(isExcludedPath('.')).toBe(false);
  });
});
