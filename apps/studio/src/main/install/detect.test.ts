import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import {
  detectInstall,
  snapshotDir,
  type DirSnapshot,
  type PackageManager,
} from './detect.js';

afterAll(() => {
  cleanupTempFixtures();
});

function project(entries: string[], packageManagerField?: string): DirSnapshot {
  return {
    entries: ['package.json', ...entries],
    ...(packageManagerField !== undefined ? { packageManagerField } : {}),
  };
}

describe('detectInstall — a lockfile names the manager', () => {
  const cases: Array<[string, PackageManager]> = [
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
    ['npm-shrinkwrap.json', 'npm'],
  ];

  for (const [lockfile, manager] of cases) {
    it(`${lockfile} -> ${manager} install`, () => {
      const plan = detectInstall(project([lockfile]));
      expect(plan?.manager).toBe(manager);
      expect(plan?.command).toBe(manager);
      expect(plan?.args).toEqual(['install']);
    });
  }

  it('counts bun.lock and bun.lockb as one manager, not as ambiguity', () => {
    expect(detectInstall(project(['bun.lock', 'bun.lockb']))?.manager).toBe('bun');
  });
});

describe('detectInstall — the packageManager field outranks the lockfile', () => {
  it('takes the field when it disagrees with a lockfile', () => {
    expect(detectInstall(project(['yarn.lock'], 'pnpm@8.15.0'))?.manager).toBe('pnpm');
  });

  it('takes the field when there is no lockfile at all', () => {
    expect(detectInstall(project([], 'yarn@4.1.0'))?.manager).toBe('yarn');
  });

  it('accepts a field carrying a hash suffix', () => {
    expect(detectInstall(project([], 'pnpm@8.15.0+sha512.deadbeef'))?.manager).toBe('pnpm');
  });

  it('ignores a field naming a tool we do not run, and falls back to the lockfile', () => {
    expect(detectInstall(project(['package-lock.json'], 'deno@1.40.0'))?.manager).toBe('npm');
  });
});

describe('detectInstall — no plan is a first-class answer', () => {
  it('refuses a directory with no package.json, lockfile or not', () => {
    expect(detectInstall({ entries: ['pnpm-lock.yaml', 'src'] })).toBeUndefined();
  });

  it('refuses a package.json with no lockfile and no field', () => {
    expect(detectInstall(project([]))).toBeUndefined();
  });

  it('refuses two lockfile families rather than picking one', () => {
    expect(detectInstall(project(['package-lock.json', 'bun.lock']))).toBeUndefined();
  });

  it('refuses an unknown field with nothing else to go on', () => {
    expect(detectInstall(project([], 'deno@1.40.0'))).toBeUndefined();
  });
});

describe('snapshotDir — the instrument, against real directories', () => {
  it('reports the entries it finds, and reads the packageManager field', async () => {
    const dir = makeDirWithFiles({
      name: 'detect-field',
      files: {
        'package.json': JSON.stringify({ name: 'x', packageManager: 'pnpm@8.15.0' }),
        'yarn.lock': '',
      },
    });

    const snapshot = await snapshotDir(dir);

    expect(snapshot.entries.sort()).toEqual(['package.json', 'yarn.lock']);
    expect(snapshot.packageManagerField).toBe('pnpm@8.15.0');
    expect(detectInstall(snapshot)?.manager).toBe('pnpm');
  });

  it('finds a lockfile end-to-end when there is no field', async () => {
    const dir = makeDirWithFiles({
      name: 'detect-lock',
      files: { 'package.json': '{"name":"x"}', 'bun.lock': '' },
    });

    const snapshot = await snapshotDir(dir);
    expect(snapshot.packageManagerField).toBeUndefined();
    expect(detectInstall(snapshot)?.manager).toBe('bun');
  });

  it('degrades a malformed package.json to no field, not to no install', async () => {
    const dir = makeDirWithFiles({
      name: 'detect-malformed',
      files: { 'package.json': '{ "name": "x", ', 'pnpm-lock.yaml': '' },
    });

    const snapshot = await snapshotDir(dir);
    expect(snapshot.entries).toContain('package.json');
    expect(snapshot.packageManagerField).toBeUndefined();
    expect(detectInstall(snapshot)?.manager).toBe('pnpm');
  });

  it('answers with an empty snapshot for a directory that is not there', async () => {
    const snapshot = await snapshotDir('/nope/definitely/not/a/directory');
    expect(snapshot.entries).toEqual([]);
    expect(detectInstall(snapshot)).toBeUndefined();
  });

  it('ignores a packageManager field that is not a string', async () => {
    const dir = makeDirWithFiles({
      name: 'detect-nonstring',
      files: { 'package.json': '{"packageManager": 42}', 'yarn.lock': '' },
    });

    const snapshot = await snapshotDir(dir);
    expect(snapshot.packageManagerField).toBeUndefined();
    expect(detectInstall(snapshot)?.manager).toBe('yarn');
  });
});
