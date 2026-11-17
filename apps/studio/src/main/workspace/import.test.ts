import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it, setDefaultTimeout } from 'bun:test';
import {
  cleanupTempFixtures,
  gitOutput as sh,
  makeGitRepo,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import type {
  ProjectCreateState,
  WorkspaceCreated,
  WorkspaceCreateResult,
} from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { knownCanvasDocId, resetCanvasRegistryCache } from '../canvas/registry.js';
import { resetSessionsCache, storedClaudeSession } from '../agent-host/sessions.js';
import { BLANK_MARKER_FILE, BLANK_SOURCE_DIR } from './blank.js';
import { projectCreations, type ProjectCreateDeps } from './create-project.js';
import { addWorktree } from './git.js';
import { importWorktreeAt, type ProjectImportDeps } from './import.js';
import type { ReadyWorkspacePlan } from './index.js';
import { removeProjectByUser, type RemoveFlowDeps } from './remove-project.js';
import {
  knownProject,
  listWorkspaces,
  rememberProject,
  renameWorkspace,
  resetWorkspaceCache,
  setProjectArchived,
  type ProjectRecord,
} from './store.js';

setDefaultTimeout(60_000);

const enteringStateRoot = process.env['STUDIO_STATE_ROOT'];
process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'import' });

afterAll(() => {
  if (enteringStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = enteringStateRoot;
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `import-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetSessionsCache();
  return root;
}

async function cut(repo: string, worktree: string, branch: string, startPoint = 'origin/main'): Promise<string> {
  mkdirSync(dirname(worktree), { recursive: true });
  await addWorktree({ root: repo, worktreePath: worktree, branch, startPoint });
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

function plantQuarantine(
  root: string,
  records: Record<string, unknown>,
  workspaceNames: Record<string, string> = {},
): void {
  writeFileSync(
    join(root, 'workspaces.json.corrupt-2026-10-01T12-00-00-000Z'),
    `${JSON.stringify({
      version: 4,
      data: { workspaces: records, archivedRepos: {}, workspaceNames, workspaceOrder: [] },
    })}\n`,
  );
}

function storedKeys(root: string): string[] {
  const file = JSON.parse(readFileSync(join(root, 'workspaces.json'), 'utf8')) as {
    data: { workspaces: Record<string, unknown> };
  };
  return Object.keys(file.data.workspaces);
}

interface Recorder extends ProjectImportDeps {
  captured: { event: string; properties: Record<string, unknown> }[];
  broadcasts: number;
}

function recorder(): Recorder {
  const captured: { event: string; properties: Record<string, unknown> }[] = [];
  const self = {
    captured,
    broadcasts: 0,
    capture: (event: string, properties: Record<string, unknown>) => {
      captured.push({ event, properties });
    },
    changed: () => {
      self.broadcasts += 1;
    },
  } as unknown as Recorder;
  return self;
}

function record(workspacePath: string, extra: Partial<WorkspaceCreated> = {}): WorkspaceCreated {
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
    ...extra,
  };
  rememberProject(workspace);
  return workspace;
}

describe('importing a worktree as a Project (ONL-2522)', () => {
  it('writes one record at the canonical key, and the Project is listed', async () => {
    const root = useOwnWorkspaceRoot('one-write');
    const { path: repo } = makeGitRepo({ name: 'import-one-write' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    const deps = recorder();

    const imported = await importWorktreeAt(worktree, 'discovered', deps);

    expect(imported.ok).toBe(true);
    expect(storedKeys(root)).toEqual([canonicalPath(worktree)]);
    const listed = listWorkspaces();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.projects.map((project) => project.workspacePath)).toEqual([canonicalPath(worktree)]);
    expect(listed[0]?.projects[0]?.archived).toBe(false);
    expect(deps.broadcasts).toBe(1);
  });

  it('refuses the second of two imports racing on one path, and broadcasts once', async () => {
    const root = useOwnWorkspaceRoot('two-clicks');
    const { path: repo } = makeGitRepo({ name: 'import-two-clicks' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    const deps = recorder();

    const outcomes = await Promise.all([
      importWorktreeAt(worktree, 'discovered', deps),
      importWorktreeAt(worktree, 'discovered', deps),
    ]);

    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(outcomes.find((outcome) => !outcome.ok)).toEqual({ ok: false, reason: 'already-a-project' });
    expect(deps.broadcasts).toBe(1);
    expect(storedKeys(root)).toEqual([canonicalPath(worktree)]);
  });

  it('keeps a recovered record’s own timestamps rather than stamping the import', async () => {
    const root = useOwnWorkspaceRoot('timestamps');
    const { path: repo } = makeGitRepo({ name: 'import-timestamps' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    plantQuarantine(root, {
      [canonicalPath(worktree)]: {
        workspacePath: worktree,
        repoIdentity: 'github.com/fixture/alpha',
        createdAt: '2026-09-01T10:00:00.000Z',
        lastOpenedAt: '2026-09-02T10:00:00.000Z',
      },
    });

    await importWorktreeAt(worktree, 'discovered', recorder());

    const stored = knownProject(worktree);
    expect(stored?.createdAt).toBe('2026-09-01T10:00:00.000Z');
    expect(stored?.lastOpenedAt).toBe('2026-09-02T10:00:00.000Z');
  });

  it('refuses a path the registry already holds under the other spelling, and changes nothing it stored', async () => {
    const holder = makeWorkspaceRoot({ name: 'import-spelling' });
    const real = join(holder, 'real');
    mkdirSync(real, { recursive: true });
    const link = join(holder, 'through-a-link');
    symlinkSync(real, link);
    process.env['STUDIO_WORKSPACE_ROOT'] = link;
    resetWorkspaceCache();

    const { path: repo } = makeGitRepo({ name: 'import-spelling-src' });
    const worktree = await cut(repo, join(real, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    const throughLink = join(link, 'github-com-fixture-alpha', 'teal-skylark');
    // Without this the fixture cannot fail: the two spellings have to actually differ.
    expect(canonicalPath(throughLink)).not.toBe(resolve(throughLink));
    record(throughLink, { origin: 'copied', displayName: 'Checkout flow' });
    setProjectArchived(throughLink, true);
    const before = knownProject(throughLink) as ProjectRecord;

    const deps = recorder();
    const imported = await importWorktreeAt(worktree, 'picked', deps);

    expect(imported).toEqual({ ok: false, reason: 'already-a-project' });
    const after = knownProject(throughLink) as ProjectRecord;
    expect(after.origin).toBe('copied');
    expect(after.displayName).toBe('Checkout flow');
    expect(after.archivedAt).toBe(before.archivedAt);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.lastOpenedAt).toBe(before.lastOpenedAt);
    expect(storedKeys(link)).toHaveLength(1);
    expect(deps.broadcasts).toBe(0);
  });

  it('stores the held origin a bucket encodes, so removal offers the held confirmation', async () => {
    const root = useOwnWorkspaceRoot('held-origin');
    const bucket = join(root, 'blank-0000');
    const source = seedLocalRepo(join(bucket, BLANK_SOURCE_DIR));
    const worktree = await cut(source, join(bucket, 'teal-skylark'), 'onlook/teal-skylark', 'main');

    const imported = await importWorktreeAt(worktree, 'discovered', recorder());

    expect(imported.ok).toBe(true);
    expect(knownProject(worktree)?.origin).toBe('blank');
    expect(knownProject(worktree)?.repoIdentity).toBe('blank/0000');
  });

  it('restores a Workspace name the group has lost, and leaves one the group already has', async () => {
    const root = useOwnWorkspaceRoot('group-name');
    const { path: repo } = makeGitRepo({ name: 'import-group-name' });
    const first = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    const second = await cut(repo, join(root, 'github-com-fixture-alpha', 'amber-kestrel'), 'fixture/amber-kestrel');
    plantQuarantine(
      root,
      {
        [canonicalPath(first)]: { workspacePath: first, repoIdentity: 'github.com/fixture/alpha' },
        [canonicalPath(second)]: { workspacePath: second, repoIdentity: 'github.com/fixture/alpha' },
      },
      { 'github.com/fixture/alpha': 'Checkout rewrite' },
    );

    await importWorktreeAt(first, 'discovered', recorder());
    expect(listWorkspaces()[0]?.name).toBe('Checkout rewrite');

    renameWorkspace('github.com/fixture/alpha', 'Named by hand');
    await importWorktreeAt(second, 'discovered', recorder());

    expect(listWorkspaces()[0]?.name).toBe('Named by hand');
  });

  it('never carries an archived flag across, however the record was stored', async () => {
    const root = useOwnWorkspaceRoot('archived');
    const { path: repo } = makeGitRepo({ name: 'import-archived' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    plantQuarantine(root, {
      [canonicalPath(worktree)]: {
        workspacePath: worktree,
        repoIdentity: 'github.com/fixture/alpha',
        archivedAt: '2026-09-30T10:00:00.000Z',
      },
    });

    await importWorktreeAt(worktree, 'discovered', recorder());

    expect(knownProject(worktree)).not.toHaveProperty('archivedAt');
    expect(listWorkspaces()[0]?.projects[0]?.archived).toBe(false);
    expect(listWorkspaces()[0]?.archived).toBe(false);
  });

  it('lists the Project without opening it: no session and no canvas', async () => {
    const root = useOwnWorkspaceRoot('not-opened');
    const { path: repo } = makeGitRepo({ name: 'import-not-opened' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');

    await importWorktreeAt(worktree, 'discovered', recorder());

    expect(listWorkspaces()[0]?.projects).toHaveLength(1);
    expect(storedClaudeSession(worktree)).toBeUndefined();
    expect(knownCanvasDocId(worktree)).toBeUndefined();
  });

  it('refuses a pick that is a repository checkout, not a worktree, and writes nothing', async () => {
    const root = useOwnWorkspaceRoot('checkout');
    const { path: repo } = makeGitRepo({ name: 'import-checkout' });

    const deps = recorder();
    const imported = await importWorktreeAt(repo, 'picked', deps);

    expect(imported).toEqual({ ok: false, reason: 'is-the-repository' });
    expect(listWorkspaces()).toEqual([]);
    expect(deps.broadcasts).toBe(0);
    expect(existsSync(join(root, 'workspaces.json'))).toBe(false);
  });

  // A worktree the user cut by hand is in scope and its repository's checkout is not (ONL-2522).
  it('admits a linked worktree the user cut by hand outside the workspace root, and still refuses its checkout', async () => {
    useOwnWorkspaceRoot('hand-cut');
    const { path: repo, root: outside } = makeGitRepo({ name: 'import-hand-cut' });
    const byHand = join(outside, 'the-branch-i-was-working-on');
    mkdirSync(dirname(byHand), { recursive: true });
    // Tracking, unlike every Studio cut: `addWorktree` passes `--no-track`, so this is the shape only a person makes.
    sh(repo, ['worktree', 'add', '--quiet', '--track', '-b', 'mine/feature', byHand, 'origin/main']);

    const admitted = await importWorktreeAt(byHand, 'picked', recorder());

    expect(admitted.ok).toBe(true);
    if (!admitted.ok) return;
    expect(admitted.workspace.origin).toBe('imported');
    expect(canonicalPath(admitted.workspace.workspacePath)).toBe(canonicalPath(byHand));
    expect(listWorkspaces().flatMap((workspace) => workspace.projects)).toHaveLength(1);

    expect(await importWorktreeAt(repo, 'picked', recorder())).toEqual({
      ok: false,
      reason: 'is-the-repository',
    });
  });

  it('refuses a worktree whose base branch neither a record nor git can answer, and names that refusal', async () => {
    const root = useOwnWorkspaceRoot('fields-incomplete');
    const { path: repo } = makeGitRepo({ name: 'import-fields-incomplete', remote: false });
    const worktree = await cut(repo, join(root, 'local-only', 'teal-skylark'), 'fixture/teal-skylark', 'main');
    sh(repo, ['branch', '-m', 'main', 'trunk']);

    const deps = recorder();
    const imported = await importWorktreeAt(worktree, 'picked', deps);

    expect(imported).toEqual({ ok: false, reason: 'fields-incomplete' });
    expect(deps.captured).toEqual([
      { event: 'project_imported', properties: { entry_point: 'picked', refusal: 'fields-incomplete' } },
    ]);
    expect(listWorkspaces()).toEqual([]);
    expect(deps.broadcasts).toBe(0);
  });

  it('refuses a pick inside a marked held bucket, which the next boot removes whole', async () => {
    const root = useOwnWorkspaceRoot('being-cleaned-up');
    const bucket = join(root, 'blank-0000');
    const source = seedLocalRepo(join(bucket, BLANK_SOURCE_DIR));
    const worktree = await cut(source, join(bucket, 'teal-skylark'), 'onlook/teal-skylark', 'main');
    writeFileSync(join(bucket, BLANK_MARKER_FILE), '{}\n');

    const deps = recorder();
    const imported = await importWorktreeAt(worktree, 'picked', deps);

    expect(imported).toEqual({ ok: false, reason: 'being-cleaned-up' });
    expect(listWorkspaces()).toEqual([]);
    expect(deps.broadcasts).toBe(0);
  });

  it('refuses a path whose creation is still running, as busy', async () => {
    const root = useOwnWorkspaceRoot('busy-creating');
    const { path: repo } = makeGitRepo({ name: 'import-busy-creating' });
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

    const done = projectCreations.start('import-busy-creating', { sourcePath: repo, entryPoint: 'projects' }, deps);
    await atFabricate;

    const importDeps = recorder();
    expect(await importWorktreeAt(worktree, 'discovered', importDeps)).toEqual({ ok: false, reason: 'busy' });
    expect(importDeps.broadcasts).toBe(0);
    expect(listWorkspaces()).toEqual([]);

    release({ ok: false, reason: 'create-failed', detail: 'held by the test' });
    await done;
    projectCreations.forget('import-busy-creating');
  });

  it('refuses a path whose removal is still running, and writes nothing', async () => {
    const root = useOwnWorkspaceRoot('busy-removing');
    const { path: repo } = makeGitRepo({ name: 'import-busy-removing' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    record(worktree, { origin: 'imported', sourceRepoRoot: repo, sourcePath: repo });
    const before = knownProject(worktree) as ProjectRecord;

    let midRemoval: Awaited<ReturnType<typeof importWorktreeAt>> | undefined;
    const importDeps = recorder();
    const deps: RemoveFlowDeps = {
      confirm: async () => {
        midRemoval = await importWorktreeAt(worktree, 'picked', importDeps);
        return false;
      },
      reportFailure: () => Promise.resolve(),
      closeTabs: () => Promise.resolve(true),
      remove: () => {
        throw new Error('the removal was cancelled and must not tear anything down');
      },
      changed: () => undefined,
      hide: () => () => {},
      capture: () => undefined,
    };

    expect(await removeProjectByUser(worktree, deps)).toEqual({ ok: false, reason: 'cancelled' });

    expect(midRemoval?.ok).toBe(false);
    expect(importDeps.broadcasts).toBe(0);
    expect(knownProject(worktree)?.createdAt).toBe(before.createdAt);
    expect(storedKeys(root)).toHaveLength(1);
  });
});

describe('what an import tells telemetry (ONL-2522)', () => {
  it('sends hashed identity, enumerated values and nothing of the codebase', async () => {
    const root = useOwnWorkspaceRoot('telemetry');
    const { path: repo } = makeGitRepo({ name: 'import-telemetry' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    const deps = recorder();

    await importWorktreeAt(worktree, 'discovered', deps);
    await importWorktreeAt(repo, 'picked', deps);

    expect(deps.captured.map((event) => event.event)).toEqual(['project_imported', 'project_imported']);
    const [landed, refused] = deps.captured;
    expect(landed?.properties).toEqual({
      project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      origin: 'imported',
      entry_point: 'discovered',
      completed_by: 'git',
    });
    expect(refused?.properties).toEqual({ entry_point: 'picked', refusal: 'is-the-repository' });

    const sent = JSON.stringify(deps.captured);
    for (const secret of [root, repo, worktree, 'teal-skylark', 'fixture/teal-skylark', 'checkout', 'github.com/fixture/alpha']) {
      expect(sent).not.toContain(secret);
    }
  });

  it('reports a stored record as the source that completed the import', async () => {
    const root = useOwnWorkspaceRoot('telemetry-record');
    const { path: repo } = makeGitRepo({ name: 'import-telemetry-record' });
    const worktree = await cut(repo, join(root, 'github-com-fixture-alpha', 'teal-skylark'), 'fixture/teal-skylark');
    plantQuarantine(root, {
      [canonicalPath(worktree)]: {
        workspacePath: worktree,
        repoIdentity: 'github.com/fixture/alpha',
        origin: 'copied',
      },
    });
    const deps = recorder();

    await importWorktreeAt(worktree, 'picked', deps);

    expect(deps.captured[0]?.properties).toEqual({
      project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      origin: 'imported',
      entry_point: 'picked',
      completed_by: 'record',
    });
  });
});
