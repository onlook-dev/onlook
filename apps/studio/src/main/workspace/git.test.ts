import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import {
  cleanupTempFixtures,
  gitOutput as sh,
  makeGitRepo,
  makeDirWithFiles,
} from '@studio/fixtures';
import { ignoredEnvFiles } from './env-files.js';
import {
  addWorktree,
  branchExists,
  defaultRemote,
  gitCommonDir,
  gitDir,
  gitFailureDetail,
  initializeRepository,
  renameBranch,
  repoRoot,
  resolveBaseRef,
  worktreePointer,
} from './git.js';
import {
  handleFromRemoteUrl,
  repoIdentityFromRemoteUrl,
  repoNameFromRemoteUrl,
  resolveHandle,
  slugify,
} from './naming.js';

afterAll(() => {
  cleanupTempFixtures();
});

describe('initializeRepository', () => {
  const ok = { ok: true, out: '', err: '', exitCode: 0, timedOut: false, missing: false } as const;
  const failed = (err: string) => ({ ok: false, out: '', err, exitCode: 129, timedOut: false, missing: false } as const);

  it('names the branch in the one command every current Git has', async () => {
    const runs: string[][] = [];
    const result = await initializeRepository('/scratch', async (_cwd, args) => { runs.push(args); return ok; });
    expect(runs).toEqual([['init', '--quiet', '-b', 'main']]);
    expect(result.ok).toBe(true);
  });

  it('takes the second way in only for a Git that refuses -b', async () => {
    const runs: string[][] = [];
    const old = async (_cwd: string, args: string[]) => {
      runs.push(args);
      return args.includes('-b') ? failed('error: unknown switch `b`') : ok;
    };
    expect((await initializeRepository('/scratch', old)).ok).toBe(true);
    expect(runs).toEqual([['init', '--quiet', '-b', 'main'], ['init', '--quiet'], ['symbolic-ref', 'HEAD', 'refs/heads/main']]);

    // A real failure is reported at once: running init again only makes the person wait twice for the same answer.
    const broken: string[][] = [];
    const refused = await initializeRepository('/scratch', async (_cwd, args) => { broken.push(args); return failed('fatal: permission denied'); });
    expect(broken).toEqual([['init', '--quiet', '-b', 'main']]);
    expect(refused.err).toBe('fatal: permission denied');
  });

  it('names the command that spoke when the branch cannot be set', async () => {
    const result = await initializeRepository('/scratch', async (_cwd, args) => {
      if (args.includes('-b')) return failed('error: unknown switch `b`');
      return args[0] === 'symbolic-ref' ? { ...failed(''), exitCode: 1 } : ok;
    });
    expect(gitFailureDetail('init', result)).toBe('git symbolic-ref exited with code 1');
  });

});

describe('gitFailureDetail', () => {
  it('reports stdout verdicts or exit codes without serializing command arguments', () => {
    expect(gitFailureDetail('commit', { ok: false, out: 'nothing added to commit\n\tprivate.env', err: '', exitCode: 1, timedOut: false, missing: false }))
      .toBe('git commit exited with code 1: nothing added to commit');
    expect(gitFailureDetail('commit', { ok: false, out: '', err: '', exitCode: 1, timedOut: false, missing: false }))
      .toBe('git commit exited with code 1');
    expect(gitFailureDetail('init', { ok: false, out: '', err: 'fatal: permission denied', exitCode: 128, timedOut: false, missing: false }))
      .toBe('fatal: permission denied');
  });
});

function makeFixture(name: string): { origin: string; repo: string; root: string } {
  const { origin, path, root } = makeGitRepo({
    name: `git-${name}`,
    seedFile: 'app.ts',
    seedContent: 'export const a = 1;\n',
  });
  return { origin, repo: path, root };
}

let pristine: { origin: string; repo: string; root: string } | undefined;
/** Shared by the cases that only read the repo or add state under their own name. */
function sharedFixture(): { origin: string; repo: string; root: string } {
  pristine ??= makeFixture('shared');
  return pristine;
}

describe('repoRoot', () => {
  it('resolves the root from a subdirectory', async () => {
    const { repo } = sharedFixture();
    mkdirSync(join(repo, 'root-case', 'web'), { recursive: true });
    expect(await repoRoot(join(repo, 'root-case', 'web'))).toBe(repo);
  });

  it('returns undefined for a folder that is not in a repo', async () => {
    const plain = makeDirWithFiles({ name: 'git-plain' });
    expect(await repoRoot(plain)).toBeUndefined();
  });
});

describe('defaultRemote', () => {
  it('finds origin', async () => {
    const { repo } = sharedFixture();
    expect(await defaultRemote(repo)).toBe('origin');
  });

  it('returns undefined when the repo has no remote at all', async () => {
    const dir = makeDirWithFiles({ name: 'git-noremote' });
    sh(dir, ['init', '--quiet']);
    expect(await defaultRemote(dir)).toBeUndefined();
  });
});

describe('resolveBaseRef — the ladder', () => {
  it('prefers main over other remote branches when several exist', async () => {
    const { repo } = makeFixture('conventional');
    sh(repo, ['checkout', '--quiet', '-b', 'feature']);
    sh(repo, ['push', '--quiet', 'origin', 'feature']);
    sh(repo, ['checkout', '--quiet', '-b', 'detached-ish']);

    const resolved = await resolveBaseRef(repo, 'origin');
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.branch).toBe('main');
    expect(resolved.source).toBe('conventional-name');
  });

  it('refuses, with candidates, when nothing looks like a trunk', async () => {
    const { origin, repo } = makeFixture('ambiguous');
    sh(repo, ['checkout', '--quiet', '-b', 'alpha']);
    sh(repo, ['push', '--quiet', 'origin', 'alpha']);
    sh(repo, ['checkout', '--quiet', '-b', 'beta']);
    sh(repo, ['push', '--quiet', 'origin', 'beta']);
    // User config that would give `beta` an upstream.
    try {
      sh(repo, ['branch', '--unset-upstream']);
    } catch {
      // Already disabled.
    }
    sh(origin, ['symbolic-ref', 'HEAD', 'refs/heads/alpha']);
    sh(repo, ['push', '--quiet', 'origin', '--delete', 'main']);
    sh(repo, ['fetch', '--quiet', '--prune']);
    // Some git versions drop the dangling remote HEAD with the branch; `--delete` then exits non-zero.
    try {
      sh(repo, ['symbolic-ref', '--delete', 'refs/remotes/origin/HEAD']);
    } catch {
    }
    expect(() => sh(repo, ['rev-parse', '--verify', 'refs/remotes/origin/HEAD'])).toThrow();

    const resolved = await resolveBaseRef(repo, 'origin');
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.candidates.sort()).toEqual(['origin/alpha', 'origin/beta']);
  });
});

describe('ignoredEnvFiles', () => {
  it('finds nested env files and never those inside an ignored directory', async () => {
    const { repo } = makeFixture('envs');
    writeFileSync(join(repo, '.env'), 'SECRET=1\n');
    writeFileSync(join(repo, '.env.local'), 'SECRET=2\n');
    mkdirSync(join(repo, 'apps', 'web'), { recursive: true });
    writeFileSync(join(repo, 'apps', 'web', '.env'), 'NESTED=1\n');
    mkdirSync(join(repo, 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(join(repo, 'node_modules', 'pkg', '.env'), 'DECOY=1\n');

    const found = await ignoredEnvFiles(repo);
    expect(found).toEqual(['.env', '.env.local', 'apps/web/.env']);
    expect(found.some((path) => path.includes('node_modules'))).toBe(false);
  });

  it('does not offer tracked files, which the worktree already carries', async () => {
    const { repo } = makeFixture('tracked');
    writeFileSync(join(repo, '.env.example'), 'SECRET=\n');
    sh(repo, ['add', '--force', '.env.example']);
    sh(repo, ['commit', '--quiet', '-m', 'example']);

    expect(await ignoredEnvFiles(repo)).toEqual([]);
  });
});

describe('addWorktree — the isolation guarantee', () => {
  it('branches from the REMOTE ref, so uncommitted and local-only work is unreachable', async () => {
    const { repo, root } = makeFixture('isolation');

    sh(repo, ['checkout', '--quiet', '-b', 'scratch']);
    writeFileSync(join(repo, 'app.ts'), 'export const a = 2; // local commit\n');
    sh(repo, ['add', '-A']);
    sh(repo, ['commit', '--quiet', '-m', 'local only']);
    writeFileSync(join(repo, 'app.ts'), 'export const a = 3; // UNCOMMITTED\n');
    writeFileSync(join(repo, '.env'), 'SECRET=real\n');

    const worktree = join(root, 'workspace');
    const added = await addWorktree({
      root: repo,
      worktreePath: worktree,
      branch: 'fixture/teal-skylark',
      startPoint: 'origin/main',
    });
    expect(added.ok).toBe(true);

    expect(await Bun.file(join(worktree, 'app.ts')).text()).toBe('export const a = 1;\n');
    expect(sh(worktree, ['merge-base', 'HEAD', 'origin/main'])).toBe(
      sh(repo, ['rev-parse', 'origin/main']),
    );

    expect(await Bun.file(join(worktree, '.env')).exists()).toBe(false);

    expect(sh(repo, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('scratch');
    expect(await Bun.file(join(repo, 'app.ts')).text()).toBe(
      'export const a = 3; // UNCOMMITTED\n',
    );
  });

  it('leaves the project branch with no upstream', async () => {
    const { repo, root } = sharedFixture();
    const worktree = join(root, 'notrack-ws');
    await addWorktree({
      root: repo,
      worktreePath: worktree,
      branch: 'fixture/no-upstream',
      startPoint: 'origin/main',
    });
    expect(() => sh(worktree, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();
  });

  it('reports an existing branch so a name collision can be re-rolled', async () => {
    const { repo, root } = sharedFixture();
    expect(await branchExists(repo, 'fixture/taken')).toBe(false);
    await addWorktree({
      root: repo,
      worktreePath: join(root, 'collide-ws'),
      branch: 'fixture/taken',
      startPoint: 'origin/main',
    });
    expect(await branchExists(repo, 'fixture/taken')).toBe(true);
  });
});

describe('renameBranch — the branch follows the name (ONL-2181)', () => {
  async function cutWorktree(name: string): Promise<{ repo: string; worktree: string }> {
    const { repo, root } = sharedFixture();
    const worktree = join(root, `rename-${name}`);
    const added = await addWorktree({
      root: repo,
      worktreePath: worktree,
      branch: `${name}/teal-skylark`,
      startPoint: 'origin/main',
    });
    expect(added.ok).toBe(true);
    return { repo, worktree };
  }

  it('moves the current branch, and the worktree still has no upstream afterwards', async () => {
    const { repo, worktree } = await cutWorktree('move');

    const moved = await renameBranch(worktree, 'move/pricing-page');

    expect(moved).toEqual({ ok: true, branch: 'move/pricing-page', moved: true });
    expect(sh(worktree, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('move/pricing-page');
    expect(await branchExists(repo, 'move/teal-skylark')).toBe(false);
    expect(await branchExists(repo, 'move/pricing-page')).toBe(true);
    expect(() => sh(worktree, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();
    expect(sh(repo, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main');
  });

  it('a target equal to the current branch is a no-op — no move, no suffix', async () => {
    const { repo, worktree } = await cutWorktree('same');

    const moved = await renameBranch(worktree, 'same/teal-skylark');

    expect(moved).toEqual({ ok: true, branch: 'same/teal-skylark', moved: false });
    expect(await branchExists(repo, 'same/teal-skylark-2')).toBe(false);
  });

  it('a collision takes the next free suffix, and a repeat rename already on that suffix stays put', async () => {
    const { repo, worktree } = await cutWorktree('collide');
    sh(repo, ['branch', 'collide/pricing-page']);

    const first = await renameBranch(worktree, 'collide/pricing-page');
    expect(first).toEqual({ ok: true, branch: 'collide/pricing-page-2', moved: true });

    sh(repo, ['branch', 'collide/pricing-page-3']);
    const second = await renameBranch(worktree, 'collide/pricing-page');
    expect(second).toEqual({ ok: true, branch: 'collide/pricing-page-2', moved: false });

    sh(repo, ['branch', 'collide/other']);
    const third = await renameBranch(worktree, 'collide/other');
    expect(third).toEqual({ ok: true, branch: 'collide/other-2', moved: true });
    expect(sh(worktree, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('collide/other-2');
  });

  it('refuses in a directory that is not on a branch', async () => {
    const plain = makeDirWithFiles({ name: 'git-rename-plain' });
    const moved = await renameBranch(plain, 'fixture/anything');
    expect(moved.ok).toBe(false);
  });
});

describe('worktree recognition — the facts behind it (ONL-2522)', () => {
  it('separates a linked worktree from the repository own checkout by its git directory', async () => {
    const { repo, root } = makeFixture('recognise');
    const worktree = join(root, 'recognise-ws');
    expect(
      (await addWorktree({
        root: repo,
        worktreePath: worktree,
        branch: 'fixture/recognise',
        startPoint: 'origin/main',
      })).ok,
    ).toBe(true);

    const treeDir = await gitDir(worktree);
    const treeCommon = await gitCommonDir(worktree);
    expect(treeDir).toBeDefined();
    expect(treeCommon).toBeDefined();
    if (treeDir === undefined || treeCommon === undefined) return;
    expect(treeDir).not.toBe(treeCommon);
    expect(dirname(dirname(treeDir))).toBe(treeCommon);

    const checkoutCommon = await gitCommonDir(repo);
    expect(checkoutCommon).toBeDefined();
    if (checkoutCommon === undefined) return;
    expect(await gitDir(repo)).toBe(checkoutCommon);

    expect(worktreePointer(worktree)).toBe(treeDir);
    expect(worktreePointer(repo)).toBeUndefined();
  });

  it('keeps the pointer when the repository is gone, where every rev-parse fails as in a plain directory', async () => {
    const { repo, root } = makeFixture('orphan');
    const worktree = join(root, 'orphan-ws');
    await addWorktree({
      root: repo,
      worktreePath: worktree,
      branch: 'fixture/orphan',
      startPoint: 'origin/main',
    });
    const pointerBefore = worktreePointer(worktree);

    rmSync(repo, { recursive: true, force: true });

    expect(await gitDir(worktree)).toBeUndefined();
    expect(await gitCommonDir(worktree)).toBeUndefined();
    expect(await repoRoot(worktree)).toBeUndefined();

    const plain = makeDirWithFiles({ name: 'git-pointerless' });
    expect(await gitDir(plain)).toBeUndefined();

    expect(worktreePointer(worktree)).toBe(pointerBefore);
    expect(worktreePointer(plain)).toBeUndefined();
  });

  it('reads nothing out of a .git file carrying no gitdir line', () => {
    const decoy = makeDirWithFiles({ name: 'git-decoy', files: { '.git': 'not a pointer\n' } });
    expect(worktreePointer(decoy)).toBeUndefined();
  });
});

describe('naming', () => {
  it('parses a handle out of both remote URL forms', () => {
    expect(handleFromRemoteUrl('git@github.com:onlook-dev/onlook.git')).toBe('onlook-dev');
    expect(handleFromRemoteUrl('https://github.com/onlook-dev/onlook.git')).toBe('onlook-dev');
    expect(handleFromRemoteUrl('https://github.com/onlook-dev/onlook')).toBe('onlook-dev');
  });

  it('reads the repo name off a remote URL, never its owner', () => {
    for (const url of [
      'git@github.com:onlook-dev/onlook.git',
      'https://github.com/onlook-dev/onlook.git',
      'https://github.com/onlook-dev/onlook',
    ]) {
      const name = repoNameFromRemoteUrl(url);
      expect(name).toBe('onlook');
      expect(name).not.toContain('onlook-dev');
    }
    expect(repoNameFromRemoteUrl('')).toBeUndefined();
  });

  it('does not mistake a .git path segment for an account handle', () => {
    expect(handleFromRemoteUrl('/Users/someone/project/.git/local-origin.git')).toBeUndefined();
    expect(
      resolveHandle({
        remoteUrl: '/Users/someone/project/.git/local-origin.git',
        userName: 'Ada Lovelace',
      }),
    ).toBe('ada-lovelace');
    expect(handleFromRemoteUrl('git@github.com:onlook-dev/onlook.git')).toBe('onlook-dev');
  });

  it('falls down the ladder to user.name, then to onlook', () => {
    expect(resolveHandle({ remoteUrl: 'git@github.com:acme/thing.git' })).toBe('acme');
    expect(resolveHandle({ userName: 'Ada Lovelace' })).toBe('ada-lovelace');
    expect(resolveHandle({})).toBe('onlook');
    expect(resolveHandle({ remoteUrl: 'not-a-url', userName: '' })).toBe('onlook');
  });

  it('collapses the ways one repo can be addressed into one identity', () => {
    const ssh = repoIdentityFromRemoteUrl('git@github.com:Onlook-Dev/Onlook.git');
    const https = repoIdentityFromRemoteUrl('https://github.com/onlook-dev/onlook');
    expect(ssh).toBe(https);
    expect(ssh).toBe('github.com/onlook-dev/onlook');
  });

  it('produces slugs that are legal in a git ref', () => {
    expect(slugify('Wren Quill')).toBe('wren-quill');
    expect(slugify('  weird//name!! ')).toBe('weird-name');
    expect(slugify('')).toBe('');
  });
});
