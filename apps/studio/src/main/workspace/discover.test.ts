import { accessSync, chmodSync, constants, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it, setDefaultTimeout } from 'bun:test';
import {
  cleanupTempFixtures,
  gitOutput as sh,
  makeGitRepo,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import type {
  ProjectCreateState,
  WorkspaceCreated,
  WorkspaceCreateResult,
} from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { canvasDir } from '../canvas/dir.js';
import { BLANK_MARKER_FILE, BLANK_SOURCE_DIR } from './blank.js';
import { projectCreations, type ProjectCreateDeps } from './create-project.js';
import { discoveredWorktrees, discoverWorktrees, recoverWorktreeAt } from './discover.js';
import { addWorktree } from './git.js';
import type { ReadyWorkspacePlan } from './index.js';
import { repoIdentityFromRemoteUrl } from './naming.js';
import { readQuarantinedProjects } from './quarantine.js';
import { rememberProject, resetWorkspaceCache } from './store.js';
import { renameProjectByAgent } from './rename.js';

setDefaultTimeout(60_000);

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `discover-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  return root;
}

function identityDir(root: string, name: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function cut(repo: string, worktree: string, branch: string, startPoint = 'origin/main'): Promise<string> {
  mkdirSync(dirname(worktree), { recursive: true });
  const added = await addWorktree({ root: repo, worktreePath: worktree, branch, startPoint });
  expect(added).toMatchObject({ ok: true });
  return worktree;
}

function seedLocalRepo(dir: string): string {
  mkdirSync(dir, { recursive: true });
  sh(dir, ['init', '--quiet', '-b', 'main']);
  sh(dir, ['config', 'user.email', 'fixture@example.com']);
  sh(dir, ['config', 'user.name', 'Fixture User']);
  writeFileSync(join(dir, 'index.js'), '// seed\n');
  sh(dir, ['add', '-A']);
  sh(dir, ['commit', '--quiet', '-m', 'init']);
  return dir;
}

function remember(workspacePath: string): WorkspaceCreated {
  const workspace: WorkspaceCreated = {
    workspacePath,
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'alpha',
    sourcePath: '/Users/fixture/alpha',
    sourceRepoRoot: '/Users/fixture/alpha',
    repoIdentity: 'github.com/fixture/alpha',
    copiedEnvFiles: [],
  };
  rememberProject(workspace);
  return workspace;
}

function plantQuarantine(root: string, stamp: string, records: Record<string, unknown>): void {
  writeFileSync(
    join(root, `workspaces.json.corrupt-${stamp}`),
    `${JSON.stringify({ version: 4, data: { workspaces: records, archivedRepos: {}, workspaceNames: {}, workspaceOrder: [] } })}\n`,
  );
}

function offered(projects: readonly { workspace: WorkspaceCreated }[]): string[] {
  return projects.map((project) => project.workspace.workspacePath);
}

function canList(path: string): boolean {
  try {
    accessSync(path, constants.R_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function canRead(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

describe('discovering worktrees Studio has no record of (ONL-2522)', () => {
  it('offers the unregistered worktree and not the registered one beside it', async () => {
    const root = useOwnWorkspaceRoot('two');
    const { path: repo } = makeGitRepo({ name: 'discover-two' });
    const bucket = identityDir(root, 'github-com-fixture-alpha');
    const known = await cut(repo, join(bucket, 'teal-skylark'), 'fixture/teal-skylark');
    const unknown = await cut(repo, join(bucket, 'amber-kestrel'), 'fixture/amber-kestrel');
    remember(known);

    const found = await discoverWorktrees();

    expect(offered(found.projects)).toEqual([canonicalPath(unknown)]);
    expect(found.refused).toBe(0);
  });

  it('leaves a half-cut bucket to the boot sweep while its creating marker is there, and offers it once cleared', async () => {
    const root = useOwnWorkspaceRoot('marker');
    const bucket = identityDir(root, 'copied-aaaa');
    const source = seedLocalRepo(join(bucket, BLANK_SOURCE_DIR));
    const worktree = await cut(source, join(bucket, 'teal-skylark'), 'fixture/teal-skylark', 'main');
    const marker = join(bucket, BLANK_MARKER_FILE);
    writeFileSync(marker, '{}\n');

    expect(await discoverWorktrees()).toEqual({ projects: [], refused: 0 });

    rmSync(marker);
    const found = await discoverWorktrees();

    expect(offered(found.projects)).toEqual([canonicalPath(worktree)]);
  });

  it('still offers the worktrees of an identity-named bucket carrying a creating file, which no sweep clears', async () => {
    const root = useOwnWorkspaceRoot('marker-imported');
    const { path: repo } = makeGitRepo({ name: 'discover-marker-imported' });
    const bucket = identityDir(root, 'github-com-fixture-alpha');
    const worktree = await cut(repo, join(bucket, 'teal-skylark'), 'fixture/teal-skylark');
    writeFileSync(join(bucket, BLANK_MARKER_FILE), '{}\n');

    const found = await discoverWorktrees();

    expect(offered(found.projects)).toEqual([canonicalPath(worktree)]);
    expect(found.refused).toBe(0);
  });

  it('offers a sibling even when one candidate’s own .git cannot be read', async () => {
    const root = useOwnWorkspaceRoot('unreadable-pointer');
    const { path: repo } = makeGitRepo({ name: 'discover-unreadable-pointer' });
    const bucket = identityDir(root, 'github-com-fixture-alpha');
    const readable = await cut(repo, join(bucket, 'teal-skylark'), 'fixture/teal-skylark');
    const pointer = join(await cut(repo, join(bucket, 'amber-kestrel'), 'fixture/amber-kestrel'), '.git');
    chmodSync(pointer, 0o000);

    if (canRead(pointer)) {
      chmodSync(pointer, 0o644);
      return;
    }

    try {
      const found = await discoverWorktrees();
      expect(offered(found.projects)).toEqual([canonicalPath(readable)]);
      expect(found.refused).toBe(1);
    } finally {
      chmodSync(pointer, 0o644);
    }
  });

  it('never offers the held source checkout inside a bucket, and does not count it as refused', async () => {
    const root = useOwnWorkspaceRoot('held-source');
    const bucket = identityDir(root, 'blank-0000');
    const source = seedLocalRepo(join(bucket, BLANK_SOURCE_DIR));
    const worktree = await cut(source, join(bucket, 'teal-skylark'), 'onlook/teal-skylark', 'main');

    const found = await discoverWorktrees();

    expect(offered(found.projects)).toEqual([canonicalPath(worktree)]);
    expect(found.refused).toBe(0);
  });

  it('never offers the canvas registry’s own directory, and does not count it as refused', async () => {
    const root = useOwnWorkspaceRoot('canvas');
    mkdirSync(join(canvasDir(), 'doc_abc'), { recursive: true });
    writeFileSync(join(canvasDir(), 'doc_abc.json'), '{}\n');
    const { path: repo } = makeGitRepo({ name: 'discover-canvas' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');

    const found = await discoverWorktrees();

    expect(offered(found.projects)).toEqual([canonicalPath(worktree)]);
    expect(found.refused).toBe(0);
  });

  it('does not offer a worktree whose creation is still in flight, before that creation publishes its path', async () => {
    const root = useOwnWorkspaceRoot('in-flight');
    const { path: repo } = makeGitRepo({ name: 'discover-in-flight' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');

    let release: (result: WorkspaceCreateResult) => void = () => undefined;
    const held = new Promise<WorkspaceCreateResult>((resolveHeld) => {
      release = resolveHeld;
    });
    let reached: () => void = () => undefined;
    const atFabricate = new Promise<void>((resolveReached) => {
      reached = resolveReached;
    });
    const plan: ReadyWorkspacePlan = {
      kind: 'ready',
      sourcePath: repo,
      sourceRepoRoot: repo,
      sourceRepoName: 'alpha',
      repoIdentity: 'github.com/fixture/alpha',
      baseBranch: 'main',
      baseRef: 'origin/main',
      baseRefSource: 'remote-head',
      workspaceName: 'teal-skylark',
      branchName: 'fixture/teal-skylark',
      workspacePath: worktree,
    };
    const unreached = (): never => {
      throw new Error('the held creation ran past fabricate');
    };
    const states: ProjectCreateState[] = [];
    const deps: ProjectCreateDeps = {
      plan: () => Promise.resolve(plan),
      fabricate: () => {
        reached();
        return held;
      },
      rollback: unreached,
      register: unreached,
      capture: () => undefined,
      startSession: unreached,
      install: unreached,
      awaitIdle: unreached,
      detect: unreached,
      awaitOpen: unreached,
      awaitStart: unreached,
      sendStartIntent: unreached,
      authorFrame: unreached,
      awaitRunning: unreached,
      emit: (state) => {
        if (state !== null) states.push(state);
      },
    };

    const done = projectCreations.start('discover-in-flight', { sourcePath: repo, entryPoint: 'projects' }, deps);
    await atFabricate;

    expect(states.map((state) => state.kind)).toContain('copying');
    expect(await discoverWorktrees()).toEqual({ projects: [], refused: 0 });

    release({ ok: false, reason: 'create-failed', detail: 'held by the test' });
    await done;
    projectCreations.forget('discover-in-flight');

    const found = await discoverWorktrees();
    expect(offered(found.projects)).toEqual([canonicalPath(worktree)]);
  });

  it('does not offer a registered worktree a second time under the other spelling of its path', async () => {
    const holder = makeWorkspaceRoot({ name: 'discover-spelling' });
    const real = join(holder, 'real');
    mkdirSync(real, { recursive: true });
    const link = join(holder, 'through-a-link');
    symlinkSync(real, link);
    process.env['STUDIO_WORKSPACE_ROOT'] = link;
    resetWorkspaceCache();

    const { path: repo } = makeGitRepo({ name: 'discover-spelling-src' });
    await cut(repo, join(real, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    const throughLink = join(link, 'github-com-fixture-alpha', 'teal-skylark');
    // Without this the fixture cannot fail: the two spellings have to actually differ.
    expect(canonicalPath(throughLink)).not.toBe(resolve(throughLink));
    remember(throughLink);

    expect(await discoverWorktrees()).toEqual({ projects: [], refused: 0 });
  });

  it('finds nothing in a root whose every worktree is already a project', async () => {
    const root = useOwnWorkspaceRoot('all-known');
    const { path: repo } = makeGitRepo({ name: 'discover-all-known' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    remember(worktree);

    expect(await discoverWorktrees()).toEqual({ projects: [], refused: 0 });
  });

  it('finds nothing, and does not throw, when the workspace root is not there at all', async () => {
    const root = makeWorkspaceRoot({ name: 'discover-absent' });
    process.env['STUDIO_WORKSPACE_ROOT'] = join(root, 'never-created');
    resetWorkspaceCache();

    expect(await discoverWorktrees()).toEqual({ projects: [], refused: 0 });
  });

  it('offers a sibling even when one identity directory cannot be listed', async () => {
    const root = useOwnWorkspaceRoot('unlistable');
    const { path: repo } = makeGitRepo({ name: 'discover-unlistable' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    const sealed = identityDir(root, 'github-com-fixture-sealed');
    chmodSync(sealed, 0o000);

    if (canList(sealed)) {
      chmodSync(sealed, 0o755);
      return;
    }

    try {
      const found = await discoverWorktrees();
      expect(offered(found.projects)).toEqual([canonicalPath(worktree)]);
    } finally {
      chmodSync(sealed, 0o755);
    }
  });
});

describe('the fields a recovered worktree carries (ONL-2522)', () => {
  it('recovers a copied provisional name and still permits its first agent rename', async () => {
    const root = useOwnWorkspaceRoot('provisional-copy');
    const bucket = identityDir(root, 'copied-provisional');
    const repo = makeGitRepo({ name: 'discover-provisional-copy', remote: false }).path;
    const source = join(bucket, BLANK_SOURCE_DIR);
    renameSync(repo, source);
    const worktree = await cut(source, join(bucket, 'copy-one'), 'fixture/copy-one', 'main');
    plantQuarantine(root, '2026-10-14T12-00-00-000Z', {
      [canonicalPath(worktree)]: {
        workspacePath: worktree, repoIdentity: 'copied/provisional', origin: 'duplicate',
        heldOrigin: 'copied', baseBranch: 'main', sourcePath: source,
        displayName: 'Landing copy', displayNameSource: 'provisional',
      },
    });
    const recovered = await recoverWorktreeAt(worktree, readQuarantinedProjects(root));
    expect(recovered).toMatchObject({ ok: true });
    if (!recovered.ok) throw new Error(`expected recovered provisional Project: ${JSON.stringify(recovered)}`);
    expect(recovered.project.workspace.displayNameSource).toBe('provisional');
    expect(recovered.project.workspace.origin).toBe('duplicate');
    expect(recovered.project.workspace.heldOrigin).toBe('copied');
    rememberProject(recovered.project.workspace);
    const renamed = await renameProjectByAgent(worktree, 'Checkout flow', {
      renameBranch: async () => ({ ok: true, moved: false, branch: 'fixture/copy-one' }),
      capture: () => {},
    });
    expect(renamed).toMatchObject({ ok: true, name: 'Checkout flow' });
  });

  it('takes displayName, sourcePath, baseBranch and the timestamps from a record, and the rest from the live worktree', async () => {
    const root = useOwnWorkspaceRoot('record-fields');
    const { path: repo } = makeGitRepo({ name: 'discover-record-fields' });
    const bucket = identityDir(root, 'github-com-fixture-alpha');
    const recovered = await cut(repo, join(bucket, 'teal-skylark'), 'fixture/teal-skylark');
    const bare = await cut(repo, join(bucket, 'amber-kestrel'), 'fixture/amber-kestrel');
    const web = join(repo, 'apps', 'web');
    mkdirSync(web, { recursive: true });
    plantQuarantine(root, '2026-10-01T12-00-00-000Z', {
      [canonicalPath(recovered)]: {
        workspacePath: recovered,
        repoIdentity: 'github.com/fixture/alpha',
        origin: 'imported',
        baseBranch: 'release',
        sourcePath: web,
        displayName: 'Checkout flow',
        displayNameSource: 'user',
        comfort: 'ship',
        createdAt: '2026-09-01T10:00:00.000Z',
        lastOpenedAt: '2026-09-02T10:00:00.000Z',
      },
    });

    const byPath = new Map(
      (await discoverWorktrees()).projects.map((project) => [project.workspace.workspacePath, project]),
    );

    const fromRecord = byPath.get(canonicalPath(recovered));
    expect(fromRecord?.completedBy).toBe('record');
    expect(fromRecord?.workspace.displayName).toBe('Checkout flow');
    expect(fromRecord?.workspace.displayNameSource).toBe('user');
    expect(fromRecord?.workspace.comfort).toBe('ship');
    expect(fromRecord?.workspace.sourcePath).toBe(web);
    expect(fromRecord?.workspace.baseBranch).toBe('release');
    expect(fromRecord?.workspace.repoIdentity).toBe('github.com/fixture/alpha');
    expect(fromRecord?.createdAt).toBe('2026-09-01T10:00:00.000Z');
    expect(fromRecord?.lastOpenedAt).toBe('2026-09-02T10:00:00.000Z');
    // From the live worktree either way: a stale stored path cannot be opened, and a rename moves the branch.
    expect(fromRecord?.workspace.workspacePath).toBe(canonicalPath(recovered));
    expect(fromRecord?.workspace.workspaceName).toBe('teal-skylark');
    expect(fromRecord?.workspace.branchName).toBe('fixture/teal-skylark');
    expect(fromRecord?.workspace.copiedEnvFiles).toEqual([]);

    const fromGit = byPath.get(canonicalPath(bare));
    expect(fromGit?.completedBy).toBe('git');
    expect(fromGit?.workspace.baseBranch).toBe('main');
    expect(fromGit?.workspace.sourcePath).toBe(repo);
    expect(fromGit?.workspace.sourceRepoRoot).toBe(repo);
    expect(fromGit?.workspace.branchName).toBe('fixture/amber-kestrel');
    expect(fromGit?.workspace.displayName).toBeUndefined();
    expect(fromGit?.createdAt).toBeUndefined();
  });

  it('falls back to the repository root for a stored sourcePath that points outside it', async () => {
    const root = useOwnWorkspaceRoot('source-elsewhere');
    const { path: repo } = makeGitRepo({ name: 'discover-source-elsewhere' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    plantQuarantine(root, '2026-10-01T12-00-00-000Z', {
      [canonicalPath(worktree)]: {
        workspacePath: worktree,
        repoIdentity: 'github.com/fixture/alpha',
        sourcePath: '/Users/fixture/a-checkout-that-moved',
      },
    });

    const found = await discoverWorktrees();

    expect(found.projects[0]?.workspace.sourcePath).toBe(repo);
  });

  it('keeps a held Project’s stored sourcePath, which is the user’s own folder outside the bucket', async () => {
    const root = useOwnWorkspaceRoot('source-held');
    const bucket = identityDir(root, 'copied-aaaa');
    const source = seedLocalRepo(join(bucket, BLANK_SOURCE_DIR));
    const worktree = await cut(source, join(bucket, 'teal-skylark'), 'fixture/teal-skylark', 'main');
    plantQuarantine(root, '2026-10-01T12-00-00-000Z', {
      [canonicalPath(worktree)]: {
        workspacePath: worktree,
        repoIdentity: 'copied/aaaa',
        origin: 'copied',
        sourcePath: '/Users/fixture/the-folder-the-user-picked',
      },
    });

    const found = await discoverWorktrees();

    expect(found.projects[0]?.workspace.sourcePath).toBe('/Users/fixture/the-folder-the-user-picked');
  });

  it('does not infer a held bucket from a nested folder selected by the picker', async () => {
    const root = useOwnWorkspaceRoot('nested-held-name');
    const { path: repo } = makeGitRepo({ name: 'discover-nested-held-name' });
    const worktree = await cut(repo, join(root, 'nested', 'blank-0000', 'teal-skylark'), 'fixture/nested');

    const found = await recoverWorktreeAt(worktree, readQuarantinedProjects(root));

    expect(found.ok).toBe(true);
    if (!found.ok) throw new Error('nested linked worktree should remain importable');
    expect(found.project.workspace.origin).toBe('imported');
    expect(found.project.workspace.repoIdentity).toBe(repoIdentityFromRemoteUrl(sh(repo, ['remote', 'get-url', 'origin'])));
    expect(found.project.workspace.sourceRepoRoot).toBe(canonicalPath(repo));
  });

  it('keeps the live held origin and identity when a quarantined record claims imported origin', async () => {
    const root = useOwnWorkspaceRoot('contradictory-held-origin');
    const bucket = identityDir(root, 'blank-0000');
    const source = seedLocalRepo(join(bucket, BLANK_SOURCE_DIR));
    const worktree = await cut(source, join(bucket, 'teal-skylark'), 'fixture/held', 'main');
    plantQuarantine(root, '2026-10-01T12-00-00-000Z', {
      [canonicalPath(worktree)]: {
        workspacePath: worktree,
        repoIdentity: 'github.com/fixture/alpha',
        origin: 'imported',
        sourcePath: '/Users/fixture/the-folder-the-user-picked',
      },
    });

    const found = await discoverWorktrees();

    expect(found.projects[0]?.workspace.origin).toBe('blank');
    expect(found.projects[0]?.workspace.repoIdentity).toBe('blank/0000');
    expect(found.projects[0]?.workspace.sourcePath).toBe('/Users/fixture/the-folder-the-user-picked');
  });

  it('resolves the base the worktree was cut from, not the branch its repository is sitting on now', async () => {
    const root = useOwnWorkspaceRoot('unrelated-branch');
    const { path: repo } = makeGitRepo({ name: 'discover-unrelated-branch' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    sh(repo, ['checkout', '--quiet', '-b', 'release']);
    sh(repo, ['push', '--quiet', '-u', 'origin', 'release']);
    expect(sh(repo, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toBe('origin/release');

    const found = await discoverWorktrees();

    expect(offered(found.projects)).toEqual([canonicalPath(worktree)]);
    expect(found.projects[0]?.workspace.baseBranch).toBe('main');
  });

  it('counts a candidate whose base cannot be resolved at all as refused, and does not offer it', async () => {
    const root = useOwnWorkspaceRoot('no-base');
    const { path: repo } = makeGitRepo({ name: 'discover-no-base', remote: false });
    await cut(repo, join(root, 'local-only', 'teal-skylark'), 'fixture/teal-skylark', 'main');
    sh(repo, ['branch', '-m', 'main', 'trunk']);

    expect(await discoverWorktrees()).toEqual({ projects: [], refused: 1 });
  });

  it('carries the Workspace name a quarantined registry held for the identity', async () => {
    const root = useOwnWorkspaceRoot('group-name');
    const { path: repo } = makeGitRepo({ name: 'discover-group-name' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    writeFileSync(
      join(root, 'workspaces.json.corrupt-2026-10-01T12-00-00-000Z'),
      `${JSON.stringify({
        version: 4,
        data: {
          workspaces: {
            [canonicalPath(worktree)]: { workspacePath: worktree, repoIdentity: 'github.com/fixture/alpha' },
          },
          archivedRepos: {},
          workspaceNames: { 'github.com/fixture/alpha': 'Checkout rewrite' },
          workspaceOrder: [],
        },
      })}\n`,
    );

    const found = await discoverWorktrees();

    expect(found.projects[0]?.groupName).toBe('Checkout rewrite');
  });
});

describe('the summary a discovered row renders (ONL-2522)', () => {
  it('carries the path as the handle, and the repository’s own folder when no record named the Workspace', async () => {
    const root = useOwnWorkspaceRoot('summary-git');
    const { path: repo } = makeGitRepo({ name: 'discover-summary-git' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');

    expect(await discoveredWorktrees()).toEqual([
      {
        handle: canonicalPath(worktree),
        name: 'teal-skylark',
        branchName: 'fixture/teal-skylark',
        groupName: basename(canonicalPath(repo)),
        repoIdentity: expect.any(String),
        completedBy: 'git',
      },
    ]);
  });

  it('prefers the record’s own display name and Workspace name over what git can answer', async () => {
    const root = useOwnWorkspaceRoot('summary-record');
    const { path: repo } = makeGitRepo({ name: 'discover-summary-record' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    writeFileSync(
      join(root, 'workspaces.json.corrupt-2026-10-01T12-00-00-000Z'),
      `${JSON.stringify({
        version: 4,
        data: {
          workspaces: {
            [canonicalPath(worktree)]: {
              workspacePath: worktree,
              repoIdentity: 'github.com/fixture/alpha',
              displayName: 'Checkout rewrite',
            },
          },
          archivedRepos: {},
          workspaceNames: { 'github.com/fixture/alpha': 'Alpha' },
          workspaceOrder: [],
        },
      })}\n`,
    );

    expect(await discoveredWorktrees()).toEqual([
      {
        handle: canonicalPath(worktree),
        name: 'Checkout rewrite',
        branchName: 'fixture/teal-skylark',
        groupName: 'Alpha',
        repoIdentity: 'github.com/fixture/alpha',
        completedBy: 'record',
      },
    ]);
  });
});
