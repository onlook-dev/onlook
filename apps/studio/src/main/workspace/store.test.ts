import { mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, setSystemTime } from 'bun:test';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import type { WorkspaceCreated } from '@studio/events';

const {
  appChoiceFor,
  forgetAppChoice,
  forgetProject,
  knownProject,
  registeredProjectKey,
  listWorkspaces,
  moveProjectBranch,
  newProjectSource,
  rememberAppChoice,
  projectAt,
  rememberProject,
  renameProject,
  renameWorkspace,
  resetWorkspaceCache,
  resolveProject,
  setProjectThumbnailProvider,
  setProjectArchived,
  setWorkspaceArchived,
  reorderWorkspaces,
  touchProject,
  workspaceOrigin,
  workspaceHeldOrigin,
  workspacePathFor,
  heldWorkspaceAt,
} = await import('./store.js');

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

// `root` is not canonicalised: the un-collapsed spelling is the input under test.
function useOwnWorkspaceRoot(name: string): { root: string; realRoot: string } {
  const root = makeWorkspaceRoot({ name });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  return { root, realRoot: realpathSync.native(root) };
}

function record(workspacePath: string): WorkspaceCreated {
  return {
    workspacePath,
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'react-project-v1',
    sourcePath: '/Users/fixture/react-project-v1',
    sourceRepoRoot: '/Users/fixture/react-project-v1',
    repoIdentity: 'github.com/fixture/react-project-v1',
    copiedEnvFiles: [],
  };
}

const tmpIsSymlinked = realpathSync.native(tmpdir()) !== tmpdir();
if (!tmpIsSymlinked) {
  console.warn('[workspace store] tmpdir() is already canonical here — skipping the two-spellings cases; their premise only exists on macOS');
}

describe('held repository ownership survives the founding Project', () => {
  for (const heldOrigin of ['blank', 'copied'] as const) {
    it(`resolves a surviving ${heldOrigin} duplicate without changing its creation origin`, () => {
      const { root } = useOwnWorkspaceRoot(`store-held-${heldOrigin}`);
      const sourceRepoRoot = join(root, `${heldOrigin}-ownership`, 'source');
      mkdirSync(sourceRepoRoot, { recursive: true });
      const workspacePath = workspacePathFor(`${heldOrigin}/ownership`, 'copy-one');
      mkdirSync(workspacePath, { recursive: true });
      const duplicate: WorkspaceCreated = {
        ...record(workspacePath), workspaceName: 'copy-one', repoIdentity: `${heldOrigin}/ownership`,
        origin: 'duplicate', heldOrigin, sourceRepoRoot,
      };
      rememberProject(duplicate);
      expect(workspaceHeldOrigin(duplicate)).toBe(heldOrigin);
      expect(heldWorkspaceAt(sourceRepoRoot)).toMatchObject({
        repoIdentity: duplicate.repoIdentity, origin: 'duplicate', heldOrigin,
      });
      rmSync(workspacePath, { recursive: true });
      expect(workspaceHeldOrigin(duplicate)).toBe(heldOrigin);
      const legacy = { ...duplicate };
      delete legacy.heldOrigin;
      expect(workspaceHeldOrigin(legacy)).toBe(heldOrigin);
      expect(workspaceHeldOrigin({ ...duplicate, origin: 'imported' })).toBeUndefined();
      expect(workspaceHeldOrigin({ ...duplicate, heldOrigin: heldOrigin === 'blank' ? 'copied' : 'blank' })).toBeUndefined();
    });
  }

  it('rejects nested source claims and symlinked repositories outside the canonical held bucket', () => {
    const { root } = useOwnWorkspaceRoot('store-held-source-guards');
    const sourceRepoRoot = join(root, 'blank-ownership', 'source');
    mkdirSync(join(sourceRepoRoot, 'nested'), { recursive: true });
    const workspacePath = workspacePathFor('blank/ownership', 'copy-one');
    mkdirSync(workspacePath, { recursive: true });
    const duplicate: WorkspaceCreated = {
      ...record(workspacePath), workspaceName: 'copy-one', repoIdentity: 'blank/ownership',
      origin: 'duplicate', heldOrigin: 'blank', sourceRepoRoot,
    };
    expect(workspaceHeldOrigin({ ...duplicate, sourceRepoRoot: join(sourceRepoRoot, 'nested') })).toBeUndefined();
    const external = makeWorkspaceRoot({ name: 'store-external-repo' });
    rmSync(sourceRepoRoot, { recursive: true });
    symlinkSync(external, sourceRepoRoot);
    expect(workspaceHeldOrigin(duplicate)).toBeUndefined();
    rememberProject(duplicate);
    expect(heldWorkspaceAt(external)).toBeUndefined();
  });
});

describe('the workspace registry — two spellings of one directory', () => {
  it('retains the authoritative key after a project symlink and its entire ancestor disappear', () => {
    const { root } = useOwnWorkspaceRoot('store-gone-alias-ancestor');
    const external = makeWorkspaceRoot({ name: 'store-alias-target' });
    const target = join(external, 'target', 'project');
    const ancestor = join(root, 'aliases', 'ancestor');
    mkdirSync(target, { recursive: true });
    mkdirSync(ancestor, { recursive: true });
    symlinkSync(join(external, 'target'), join(ancestor, 'linked'));
    const aliased = join(ancestor, 'linked', 'project');
    const expectedKey = realpathSync.native(aliased);
    rememberProject(record(aliased));
    expect(registeredProjectKey(aliased)).toBe(expectedKey);
    rmSync(join(root, 'aliases'), { recursive: true, force: true });
    rmSync(join(external, 'target'), { recursive: true, force: true });
    resetWorkspaceCache();
    expect(registeredProjectKey(aliased)).toBe(expectedKey);
    expect(registeredProjectKey(expectedKey)).toBe(expectedKey);
    expect(registeredProjectKey(join(root, 'unknown'))).toBeUndefined();
  });

  it.skipIf(!tmpIsSymlinked)('collapses /var and /private/var onto a single key', () => {
    const { root, realRoot } = useOwnWorkspaceRoot('store-collapse');

    expect(realRoot).not.toBe(root);
    expect(realRoot.endsWith(root)).toBe(true);

    const relative = join('github-com-fixture-react-project-v1', 'teal-skylark');
    const asBuilt = join(root, relative);
    const asCanonical = join(realRoot, relative);

    // On a missing path `normalizePath` falls back to `resolve()` and keys the un-collapsed spelling.
    mkdirSync(asBuilt, { recursive: true });

    rememberProject(record(asBuilt));

    const file = JSON.parse(readFileSync(join(root, 'workspaces.json'), 'utf8')) as {
      data: { workspaces: Record<string, unknown> };
    };
    expect(Object.keys(file.data.workspaces)).toEqual([asCanonical]);

    expect(knownProject(asCanonical)?.workspaceName).toBe('teal-skylark');
    expect(knownProject(asBuilt)?.workspaceName).toBe('teal-skylark');

    expect(knownProject(join(realRoot, 'not-a-workspace'))).toBeUndefined();
  });

  it.skipIf(!tmpIsSymlinked)('opens a gone directory addressed by the spelling it was registered under', () => {
    const { root, realRoot } = useOwnWorkspaceRoot('store-gone-spelling');

    const relative = join('github-com-fixture-react-project-v1', 'teal-skylark');
    const asBuilt = join(root, relative);
    const asCanonical = join(realRoot, relative);
    mkdirSync(asBuilt, { recursive: true });

    rememberProject(record(asBuilt));

    // Read while the directory exists: the key is the collapsed spelling, the record holds the built one.
    expect(realpathSync.native(asBuilt)).toBe(asCanonical);
    expect(knownProject(asCanonical)?.workspacePath).toBe(asBuilt);

    rmSync(asBuilt, { recursive: true, force: true });

    expect(projectAt(asBuilt)).toEqual({ ok: false, reason: 'workspace-missing' });
    expect(projectAt(join(root, 'never', 'registered'))).toEqual({ ok: false, reason: 'unknown-project' });
  });
});

describe('the projects record', () => {
  function add(
    options: { repo: string; name: string; onDisk: boolean },
    root: string,
  ): string {
    const workspacePath = join(root, options.repo.replace(/[/.]/g, '-'), options.name);
    if (options.onDisk) mkdirSync(workspacePath, { recursive: true });
    const folder = options.repo.split('/').pop() ?? 'repo';
    rememberProject({
      ...record(workspacePath),
      workspaceName: options.name,
      repoIdentity: options.repo,
      sourceRepoName: folder,
      sourcePath: `/Users/fixture/${folder}`,
      sourceRepoRoot: `/Users/fixture/${folder}`,
    });
    return workspacePath;
  }

  const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

  it('turns one remembered worktree into one workspace holding one project', () => {
    const { root } = useOwnWorkspaceRoot('projects-one');
    add({ repo: 'github.com/fixture/alpha', name: 'teal-skylark', onDisk: true }, root);

    const workspaces = listWorkspaces();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]?.repoIdentity).toBe('github.com/fixture/alpha');
    expect(workspaces[0]?.name).toBe('alpha');
    expect(workspaces[0]?.projects).toHaveLength(1);
    expect(workspaces[0]?.projects[0]?.name).toBe('alpha · teal-skylark');
  });

  it('names an imported card `<repo> · <generated>`, a blank card by its draw alone', () => {
    const { root } = useOwnWorkspaceRoot('projects-card-names');
    const imported = add({ repo: 'github.com/fixture/lemonade', name: 'teal-skylark', onDisk: true }, root);
    const blankPath = join(root, 'blank', 'amber-kestrel');
    mkdirSync(blankPath, { recursive: true });
    rememberProject({
      ...record(blankPath),
      workspaceName: 'amber-kestrel',
      repoIdentity: 'blank/fixture-1',
      sourceRepoName: 'Amber Kestrel',
      sourceRepoRoot: join(root, 'blank', 'source'),
      origin: 'blank',
    });

    const names = new Map(
      listWorkspaces().flatMap((w) => w.projects.map((p) => [p.workspacePath, p.name] as const)),
    );
    expect(names.get(imported)).toBe('lemonade · teal-skylark');
    expect(names.get(blankPath)).toBe('amber-kestrel');
    const editable = new Map(
      listWorkspaces().flatMap((w) =>
        w.projects.map((p) => [p.workspacePath, p.editableName] as const),
      ),
    );
    expect(editable.get(imported)).toBe('teal-skylark');
    renameProject(imported, 'Checkout redesign', 'user');
    expect(
      listWorkspaces()
        .flatMap((w) => w.projects)
        .find((p) => p.workspacePath === imported)?.editableName,
    ).toBe('Checkout redesign');
    for (const name of names.values()) expect(name).not.toContain('fixture');
  });

  it('lists two worktrees of one repo as two projects in one workspace', () => {
    const { root } = useOwnWorkspaceRoot('projects-two-level');
    add({ repo: 'github.com/fixture/alpha', name: 'teal-skylark', onDisk: true }, root);
    add({ repo: 'github.com/fixture/alpha', name: 'amber-kestrel', onDisk: true }, root);

    const workspaces = listWorkspaces();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]?.projects).toHaveLength(2);
  });

  it('names a workspace from its source folder, not the stored repo name', () => {
    const { root } = useOwnWorkspaceRoot('projects-local-origin');
    const workspacePath = join(root, 'local', 'jade-heron');
    mkdirSync(workspacePath, { recursive: true });
    rememberProject({
      ...record(workspacePath),
      workspaceName: 'jade-heron',
      repoIdentity: '/users/fixture/lemonade/.git/local-origin',
      sourceRepoName: 'local-origin',
      sourceRepoRoot: '/Users/fixture/lemonade',
    });

    expect(listWorkspaces()[0]?.name).toBe('lemonade');
    expect(listWorkspaces()[0]?.projects[0]?.name).toBe('lemonade · jade-heron');
  });

  it('orders workspaces by when they were added, and a touch does not move them', async () => {
    const { root } = useOwnWorkspaceRoot('projects-order');
    const alpha = add({ repo: 'github.com/fixture/alpha', name: 'a', onDisk: true }, root);
    // Two adds in one millisecond tie.
    await pause();
    add({ repo: 'github.com/fixture/beta', name: 'b', onDisk: true }, root);
    expect(listWorkspaces().map((w) => w.repoIdentity)).toEqual([
      'github.com/fixture/alpha',
      'github.com/fixture/beta',
    ]);

    await pause();
    touchProject(alpha);
    expect(listWorkspaces()[0]?.repoIdentity).toBe('github.com/fixture/alpha');

    reorderWorkspaces(['github.com/fixture/beta', 'github.com/fixture/alpha']);
    expect(listWorkspaces().map((w) => w.repoIdentity)).toEqual([
      'github.com/fixture/beta',
      'github.com/fixture/alpha',
    ]);
  });

  it('ignores a touch for a path it does not know, rather than inserting one', () => {
    const { root } = useOwnWorkspaceRoot('projects-touch-unknown');
    add({ repo: 'github.com/fixture/alpha', name: 'a', onDisk: true }, root);

    touchProject(join(root, 'never', 'registered'));
    expect(listWorkspaces()[0]?.projects).toHaveLength(1);
  });

  it('still lists a project whose directory is gone, marked missing', () => {
    const { root } = useOwnWorkspaceRoot('projects-missing');
    add({ repo: 'github.com/fixture/ghost', name: 'gone', onDisk: false }, root);

    const workspaces = listWorkspaces();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]?.projects[0]?.missing).toBe(true);
  });

  it('projectAt opens the addressed worktree, or says exactly why it cannot', () => {
    const { root } = useOwnWorkspaceRoot('projects-at');
    expect(projectAt(join(root, 'never', 'registered'))).toEqual({
      ok: false,
      reason: 'unknown-project',
    });

    const gone = add({ repo: 'github.com/fixture/alpha', name: 'gone', onDisk: false }, root);
    expect(projectAt(gone)).toEqual({ ok: false, reason: 'workspace-missing' });

    const live = add({ repo: 'github.com/fixture/alpha', name: 'here', onDisk: true }, root);
    const resolved = projectAt(live);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error('unreachable');
    expect(resolved.workspace.workspaceName).toBe('here');
  });

  it('retires an old artifact home without deleting or migrating its registry and user files', () => {
    const { root } = useOwnWorkspaceRoot('retired-artifact-home');
    const path = add({ repo: 'studio-artifact-agent', name: 'artifact-home', onDisk: true }, root);
    const held = knownProject(path)!;
    rememberProject({ ...held, internal: 'artifacts' });
    const canvas = join(path, 'legacy-canvas.json');
    const transcript = join(path, 'legacy-transcript.json');
    writeFileSync(canvas, '{"artifactId":"retained"}');
    writeFileSync(transcript, '{"text":"retained"}');
    resetWorkspaceCache();
    expect(projectAt(path)).toEqual({ ok: false, reason: 'unknown-project' });
    expect(resolveProject('studio-artifact-agent')).toEqual({ ok: false, reason: 'unknown-project' });
    expect(listWorkspaces()).toEqual([]);
    expect(knownProject(path)?.internal).toBe('artifacts');
    expect(readFileSync(canvas, 'utf8')).toBe('{"artifactId":"retained"}');
    expect(readFileSync(transcript, 'utf8')).toBe('{"text":"retained"}');
  });

  it('resolveProject answers the newest live project, or why it cannot', () => {
    const { root } = useOwnWorkspaceRoot('projects-resolve');
    expect(resolveProject('github.com/fixture/never')).toEqual({
      ok: false,
      reason: 'unknown-project',
    });

    add({ repo: 'github.com/fixture/ghost', name: 'gone', onDisk: false }, root);
    expect(resolveProject('github.com/fixture/ghost')).toEqual({
      ok: false,
      reason: 'workspace-missing',
    });

    const live = add({ repo: 'github.com/fixture/alpha', name: 'here', onDisk: true }, root);
    const resolved = resolveProject('github.com/fixture/alpha');
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error('unreachable');
    expect(resolved.workspace.workspacePath).toBe(live);
  });

  it('archives and restores a project without touching the record', () => {
    const { root } = useOwnWorkspaceRoot('projects-archive');
    const path = add({ repo: 'github.com/fixture/alpha', name: 'a', onDisk: true }, root);

    setProjectArchived(path, true);
    expect(listWorkspaces()[0]?.projects[0]?.archived).toBe(true);
    expect(projectAt(path).ok).toBe(true);

    setProjectArchived(path, false);
    expect(listWorkspaces()[0]?.projects[0]?.archived).toBe(false);
  });

  it('archives and restores a whole workspace as a label of its own', () => {
    const { root } = useOwnWorkspaceRoot('projects-archive-ws');
    add({ repo: 'github.com/fixture/alpha', name: 'a', onDisk: true }, root);

    setWorkspaceArchived('github.com/fixture/alpha', true);
    const archived = listWorkspaces()[0];
    expect(archived?.archived).toBe(true);
    expect(archived?.projects[0]?.archived).toBe(false);

    setWorkspaceArchived('github.com/fixture/alpha', false);
    expect(listWorkspaces()[0]?.archived).toBe(false);
  });
});

describe('display names — rename at both levels', () => {
  function add(options: { repo: string; name: string }, root: string): string {
    const workspacePath = join(root, options.repo.replace(/[/.]/g, '-'), options.name);
    mkdirSync(workspacePath, { recursive: true });
    const folder = options.repo.split('/').pop() ?? 'repo';
    rememberProject({
      ...record(workspacePath),
      workspaceName: options.name,
      repoIdentity: options.repo,
      sourceRepoName: folder,
      sourceRepoRoot: `/Users/fixture/${folder}`,
    });
    return workspacePath;
  }

  it('renames a project in the summary and leaves every identity field alone', () => {
    const { root } = useOwnWorkspaceRoot('rename-project');
    const path = add({ repo: 'github.com/fixture/alpha', name: 'teal-skylark' }, root);

    renameProject(path, '  My Landing Page  ', 'user');

    const project = listWorkspaces()[0]?.projects[0];
    expect(project?.name).toBe('My Landing Page');
    const stored = knownProject(path);
    expect(stored?.workspaceName).toBe('teal-skylark');
    expect(stored?.workspacePath).toBe(path);
    expect(stored?.branchName).toBe('fixture/teal-skylark');
  });

  it('renames a workspace, while an unrenamed one still derives from its folder', () => {
    const { root } = useOwnWorkspaceRoot('rename-workspace');
    add({ repo: 'github.com/fixture/alpha', name: 'a' }, root);
    add({ repo: 'github.com/fixture/beta', name: 'b' }, root);

    renameWorkspace('github.com/fixture/alpha', 'Client Work');

    const byRepo = new Map(listWorkspaces().map((w) => [w.repoIdentity, w.name]));
    expect(byRepo.get('github.com/fixture/alpha')).toBe('Client Work');
    expect(byRepo.get('github.com/fixture/beta')).toBe('beta');
  });

  it('refuses a whitespace-only name at both levels — nothing changes', () => {
    const { root } = useOwnWorkspaceRoot('rename-whitespace');
    const path = add({ repo: 'github.com/fixture/alpha', name: 'teal-skylark' }, root);

    renameProject(path, '   ', 'user');
    renameWorkspace('github.com/fixture/alpha', '\t\n');

    expect(listWorkspaces()[0]?.name).toBe('alpha');
    expect(listWorkspaces()[0]?.projects[0]?.name).toBe('alpha · teal-skylark');
    expect(knownProject(path)?.displayName).toBeUndefined();
  });

  it('ignores a rename for an unknown project path, and an unknown workspace identity stays invisible', () => {
    const { root } = useOwnWorkspaceRoot('rename-unknown');
    add({ repo: 'github.com/fixture/alpha', name: 'a' }, root);

    renameProject(join(root, 'never', 'registered'), 'Ghost', 'user');
    renameWorkspace('github.com/fixture/never', 'Ghost Workspace');

    const workspaces = listWorkspaces();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]?.name).toBe('alpha');
    expect(workspaces[0]?.projects[0]?.name).toBe('alpha · a');
    expect(knownProject(join(root, 'never', 'registered'))).toBeUndefined();
  });

  it('migrates a v2 file, keeping its projects under their derived names', () => {
    const { root } = useOwnWorkspaceRoot('rename-migrate');
    const workspacePath = join(root, 'github-com-fixture-alpha', 'teal-skylark');
    mkdirSync(workspacePath, { recursive: true });

    const now = new Date().toISOString();
    writeFileSync(
      join(root, 'workspaces.json'),
      JSON.stringify({
        version: 2,
        data: {
          workspaces: {
            [workspacePath]: { ...record(workspacePath), createdAt: now, lastOpenedAt: now },
          },
          archivedRepos: {},
        },
      }),
      'utf8',
    );
    resetWorkspaceCache();

    expect(listWorkspaces()[0]?.projects[0]?.name).toBe('react-project-v1 · teal-skylark');
  });

  it('migrates a malformed v2 envelope to a complete empty state, not a broken one', () => {
    const { root } = useOwnWorkspaceRoot('rename-migrate-malformed');

    writeFileSync(join(root, 'workspaces.json'), JSON.stringify({ version: 2, data: null }), 'utf8');
    resetWorkspaceCache();

    expect(listWorkspaces()).toEqual([]);

    const file = JSON.parse(readFileSync(join(root, 'workspaces.json'), 'utf8')) as {
      data: {
        workspaces: Record<string, unknown>;
        archivedRepos: Record<string, string>;
        workspaceNames: Record<string, string>;
      };
    };
    expect(file.data.workspaces).toEqual({});
    expect(file.data.archivedRepos).toEqual({});
    expect(file.data.workspaceNames).toEqual({});
  });

  it('reads a record without `origin` as imported, and a blank one as blank (ONL-2152)', () => {
    const { root } = useOwnWorkspaceRoot('origin');
    const legacy = add({ repo: 'github.com/fixture/alpha', name: 'teal-skylark' }, root);
    const blankPath = join(root, 'blank-0000', 'amber-wren');
    mkdirSync(blankPath, { recursive: true });
    rememberProject({ ...record(blankPath), repoIdentity: 'blank/0000', origin: 'blank' });

    expect(workspaceOrigin(knownProject(legacy) ?? {})).toBe('imported');
    expect(workspaceOrigin(knownProject(blankPath) ?? {})).toBe('blank');
    expect(listWorkspaces().find((w) => w.repoIdentity === 'github.com/fixture/alpha')?.projects[0]?.name).toBe(
      'alpha · teal-skylark',
    );
  });

  it('keeps renamed summaries across a cache drop — the persisted record is the truth', () => {
    const { root } = useOwnWorkspaceRoot('rename-persist');
    const path = add({ repo: 'github.com/fixture/alpha', name: 'teal-skylark' }, root);

    renameProject(path, 'My Landing Page', 'user');
    renameWorkspace('github.com/fixture/alpha', 'Client Work');

    resetWorkspaceCache();
    const workspace = listWorkspaces()[0];
    expect(workspace?.name).toBe('Client Work');
    expect(workspace?.projects[0]?.name).toBe('My Landing Page');
  });
});

describe('the copied origin on the record (ONL-2177)', () => {
  it('composes a copied card from the folder name, like an import and unlike a blank', () => {
    const { root } = useOwnWorkspaceRoot('origin-copied');
    const copiedPath = join(root, 'copied-0000', 'teal-skylark');
    mkdirSync(copiedPath, { recursive: true });
    rememberProject({
      ...record(copiedPath),
      repoIdentity: 'copied/0000',
      sourceRepoName: 'lemonade',
      sourceRepoRoot: '/Users/fixture/lemonade',
      origin: 'copied',
    });

    resetWorkspaceCache();
    expect(workspaceOrigin(knownProject(copiedPath) ?? {})).toBe('copied');
    const workspace = listWorkspaces()[0];
    expect(workspace?.name).toBe('lemonade');
    expect(workspace?.projects[0]?.name).toBe('lemonade · teal-skylark');
    expect(workspace?.projects[0]?.editableName).toBe('teal-skylark');
  });
});

describe('the remembered app choice, per repo identity', () => {
  function add(options: { repo: string; name: string }, root: string): string {
    const workspacePath = join(root, options.repo.replace(/[/.]/g, '-'), options.name);
    mkdirSync(workspacePath, { recursive: true });
    rememberProject({ ...record(workspacePath), workspaceName: options.name, repoIdentity: options.repo });
    return workspacePath;
  }

  it('answers for every worktree of the identity, and for no other identity', () => {
    const { root } = useOwnWorkspaceRoot('app-choice');
    const first = add({ repo: 'github.com/fixture/mono', name: 'teal-skylark' }, root);
    const second = add({ repo: 'github.com/fixture/mono', name: 'amber-kestrel' }, root);
    add({ repo: 'github.com/fixture/other', name: 'jade-heron' }, root);

    expect(appChoiceFor('github.com/fixture/mono')).toBeUndefined();

    rememberAppChoice('github.com/fixture/mono', 'apps/web');

    for (const path of [first, second]) {
      const identity = knownProject(path)?.repoIdentity ?? '';
      expect(appChoiceFor(identity)).toBe('apps/web');
    }
    expect(appChoiceFor('github.com/fixture/other')).toBeUndefined();

    resetWorkspaceCache();
    expect(appChoiceFor('github.com/fixture/mono')).toBe('apps/web');
  });

  it('forgets one identity and leaves the rest', () => {
    const { root } = useOwnWorkspaceRoot('app-choice-forget');
    add({ repo: 'github.com/fixture/mono', name: 'a' }, root);
    rememberAppChoice('github.com/fixture/mono', 'apps/web');
    rememberAppChoice('github.com/fixture/other', 'packages/site');

    forgetAppChoice('github.com/fixture/mono');
    expect(appChoiceFor('github.com/fixture/mono')).toBeUndefined();
    expect(appChoiceFor('github.com/fixture/other')).toBe('packages/site');

    rememberAppChoice('github.com/fixture/other', 'apps/docs');
    expect(appChoiceFor('github.com/fixture/other')).toBe('apps/docs');
  });

  it('leaves with the identity’s last project, so a re-import is asked afresh (ONL-2523)', () => {
    const { root } = useOwnWorkspaceRoot('app-choice-last');
    const first = add({ repo: 'github.com/fixture/mono', name: 'teal-skylark' }, root);
    const second = add({ repo: 'github.com/fixture/mono', name: 'amber-kestrel' }, root);
    rememberAppChoice('github.com/fixture/mono', 'apps/web');
    rememberAppChoice('github.com/fixture/other', 'packages/site');

    forgetProject(first);
    expect(appChoiceFor('github.com/fixture/mono')).toBe('apps/web');

    forgetProject(second);
    expect(appChoiceFor('github.com/fixture/mono')).toBeUndefined();
    expect(appChoiceFor('github.com/fixture/other')).toBe('packages/site');
  });
});

describe('the timestamps a recovered record brings with it (ONL-2522)', () => {
  it('stamps a record written without them with the current time', () => {
    const { root } = useOwnWorkspaceRoot('times-minted');
    const path = join(root, 'minted');

    setSystemTime(new Date('2026-03-01T12:00:00.000Z'));
    try {
      rememberProject(record(path));
    } finally {
      setSystemTime();
    }

    expect(knownProject(path)?.createdAt).toBe('2026-03-01T12:00:00.000Z');
    expect(knownProject(path)?.lastOpenedAt).toBe('2026-03-01T12:00:00.000Z');
  });

  it('keeps supplied timestamps on the stored record and on the project summary', () => {
    const { root } = useOwnWorkspaceRoot('times-supplied');
    const path = join(root, 'recovered');
    mkdirSync(path, { recursive: true });

    rememberProject({
      ...record(path),
      createdAt: '2026-02-05T09:00:00.000Z',
      lastOpenedAt: '2026-02-20T18:30:00.000Z',
    });

    resetWorkspaceCache();
    expect(knownProject(path)?.createdAt).toBe('2026-02-05T09:00:00.000Z');
    expect(knownProject(path)?.lastOpenedAt).toBe('2026-02-20T18:30:00.000Z');

    const project = listWorkspaces()[0]?.projects[0];
    expect(project?.createdAt).toBe('2026-02-05T09:00:00.000Z');
    expect(project?.lastOpenedAt).toBe('2026-02-20T18:30:00.000Z');
  });

  it('founds the workspace on the supplied date when a newer sibling is already held', () => {
    const { root } = useOwnWorkspaceRoot('times-founding');
    const repo = join(root, 'repo');
    const siblingSource = join(repo, 'apps', 'api');
    const recoveredSource = join(repo, 'apps', 'web');
    mkdirSync(siblingSource, { recursive: true });
    mkdirSync(recoveredSource, { recursive: true });
    const held = (workspacePath: string, sourcePath: string): WorkspaceCreated => ({
      ...record(workspacePath),
      repoIdentity: 'github.com/fixture/monorepo',
      sourcePath,
      sourceRepoRoot: repo,
    });

    rememberProject(held('/w/api', siblingSource));
    rememberProject({
      ...held('/w/web', recoveredSource),
      createdAt: '2026-02-05T09:00:00.000Z',
      lastOpenedAt: '2026-02-05T09:00:00.000Z',
    });

    expect(listWorkspaces()[0]?.sourcePath).toBe(recoveredSource);
  });
});

describe('the comfort answer on the record (ONL-2178)', () => {
  it('survives a cache drop, and a record written before the field reads back without one', () => {
    const { root } = useOwnWorkspaceRoot('comfort');
    const answered = join(root, 'answered');
    const older = join(root, 'older');
    rememberProject({ ...record(answered), comfort: 'experiment' });
    rememberProject(record(older));

    resetWorkspaceCache();
    expect(knownProject(answered)?.comfort).toBe('experiment');
    expect(knownProject(older)?.comfort).toBeUndefined();
  });
});

describe('name provenance on the record (ONL-2181)', () => {
  it('a UI rename stores user, and a record never renamed carries no source', () => {
    const { root } = useOwnWorkspaceRoot('name-source');
    const named = join(root, 'named');
    const untouched = join(root, 'untouched');
    rememberProject(record(named));
    rememberProject(record(untouched));

    renameProject(named, 'Pricing Page', 'user');

    resetWorkspaceCache();
    expect(knownProject(named)?.displayName).toBe('Pricing Page');
    expect(knownProject(named)?.displayNameSource).toBe('user');
    expect(knownProject(untouched)?.displayNameSource).toBeUndefined();
  });

  it("the agent's rename stores agent, and a later user rename overwrites both name and source", () => {
    const { root } = useOwnWorkspaceRoot('name-source-agent');
    const path = join(root, 'p');
    rememberProject(record(path));

    renameProject(path, 'Portfolio Redesign', 'agent');
    expect(knownProject(path)?.displayNameSource).toBe('agent');

    renameProject(path, 'My Portfolio', 'user');
    expect(knownProject(path)?.displayName).toBe('My Portfolio');
    expect(knownProject(path)?.displayNameSource).toBe('user');
  });

  it('moveProjectBranch follows git on the record and touches nothing else', () => {
    const { root } = useOwnWorkspaceRoot('branch-move');
    const path = join(root, 'p');
    rememberProject(record(path));

    moveProjectBranch(path, 'fixture/pricing-page');
    moveProjectBranch(join(root, 'never', 'registered'), 'ghost/branch');

    resetWorkspaceCache();
    const stored = knownProject(path);
    expect(stored?.branchName).toBe('fixture/pricing-page');
    expect(stored?.workspaceName).toBe('teal-skylark');
    expect(stored?.displayName).toBeUndefined();
    expect(knownProject(join(root, 'never', 'registered'))).toBeUndefined();
  });
});

describe('the card’s thumbnail reference on the summary', () => {
  afterEach(() => {
    setProjectThumbnailProvider(undefined);
  });

  const onlyProject = () => (listWorkspaces()[0]?.projects ?? [])[0];

  it('carries a reference for a project the provider answers for, and no field for one it does not', () => {
    const { root } = useOwnWorkspaceRoot('thumb-reference');
    const withImage = join(root, 'has-image');
    const without = join(root, 'no-image');
    rememberProject({ ...record(withImage), workspaceName: 'has-image' });
    rememberProject({ ...record(without), workspaceName: 'no-image' });

    setProjectThumbnailProvider((path) =>
      path === withImage ? 'studio-thumb://canvas/id?v=7' : undefined,
    );

    const projects = listWorkspaces()[0]?.projects ?? [];
    const found = projects.find((project) => project.workspacePath === withImage);
    const missing = projects.find((project) => project.workspacePath === without);
    expect(found?.previewUrl).toBe('studio-thumb://canvas/id?v=7');
    expect(missing).not.toHaveProperty('previewUrl');
  });

  it('renders no field at all when nothing has been injected — the placeholder path', () => {
    const { root } = useOwnWorkspaceRoot('thumb-uninjected');
    rememberProject(record(join(root, 'plain')));

    expect(onlyProject()).not.toHaveProperty('previewUrl');
  });

  it('moves the reference when the provider’s token moves, and holds it when it does not', () => {
    const { root } = useOwnWorkspaceRoot('thumb-token');
    const path = join(root, 'tokened');
    rememberProject(record(path));

    let token = 11;
    setProjectThumbnailProvider(() => `studio-thumb://canvas/id?v=${String(token)}`);
    expect(onlyProject()?.previewUrl).toBe('studio-thumb://canvas/id?v=11');
    expect(onlyProject()?.previewUrl).toBe('studio-thumb://canvas/id?v=11');

    token = 12;
    expect(onlyProject()?.previewUrl).toBe('studio-thumb://canvas/id?v=12');
  });

  it('asks the provider once per project per list, and performs no filesystem call of its own', () => {
    const { root } = useOwnWorkspaceRoot('thumb-syscalls');
    for (let index = 0; index < 50; index += 1) {
      const path = join(root, `p${String(index)}`);
      rememberProject({ ...record(path), workspaceName: `p${String(index)}` });
    }

    const asked: string[] = [];
    setProjectThumbnailProvider((path) => {
      asked.push(path);
      return undefined;
    });

    const listed = listWorkspaces()[0]?.projects ?? [];
    expect(listed).toHaveLength(50);
    expect(asked).toHaveLength(50);
    expect(new Set(asked).size).toBe(50);
  });

  it('keeps the registry file at version 4 — the reference is derived, never stored', () => {
    const { root } = useOwnWorkspaceRoot('thumb-domain-version');
    rememberProject(record(join(root, 'versioned')));
    setProjectThumbnailProvider(() => 'studio-thumb://canvas/id?v=1');
    listWorkspaces();

    const stored = JSON.parse(readFileSync(join(root, 'workspaces.json'), 'utf8')) as {
      version: number;
      data: { workspaces: Record<string, Record<string, unknown>> };
    };
    expect(stored.version).toBe(4);
    for (const held of Object.values(stored.data.workspaces)) {
      expect(held).not.toHaveProperty('previewUrl');
      expect(held).not.toHaveProperty('thumbnail');
    }
  });
});

describe('where the next project is cut from (ONL-2480)', () => {
  function imported(workspacePath: string, sourcePath: string, sourceRepoRoot: string): WorkspaceCreated {
    return { ...record(workspacePath), sourcePath, sourceRepoRoot, repoIdentity: 'github.com/fixture/monorepo' };
  }

  it('an imported project is cut from the folder the user named, not the repository above it', () => {
    const { root } = useOwnWorkspaceRoot('answerer-imported');
    const web = join(root, 'repo', 'apps', 'web');
    mkdirSync(web, { recursive: true });

    expect(newProjectSource(imported('/w/one', web, join(root, 'repo')))).toBe(web);
  });

  it('an import whose folder the user moved away answers its repository root instead', () => {
    const { root } = useOwnWorkspaceRoot('answerer-moved');
    const repo = join(root, 'repo');
    mkdirSync(repo, { recursive: true });

    expect(newProjectSource(imported('/w/one', join(repo, 'apps', 'gone'), repo))).toBe(repo);
  });

  it('a blank project is cut from its bucket', () => {
    expect(newProjectSource({ ...record('/w/one'), origin: 'blank', sourcePath: '/b/s', sourceRepoRoot: '/b/s' })).toBe('/b/s');
  });

  it('a copied project is cut from its bucket, never the user’s own folder', () => {
    expect(newProjectSource({ ...record('/w/one'), origin: 'copied', sourcePath: '/user/site', sourceRepoRoot: '/b/s' })).toBe('/b/s');
  });

  it('the workspace reports the subfolder its one project was imported from', () => {
    const { root } = useOwnWorkspaceRoot('summary-subfolder');
    const web = join(root, 'repo', 'apps', 'web');
    mkdirSync(web, { recursive: true });
    rememberProject(imported('/w/one', web, join(root, 'repo')));

    expect(listWorkspaces()[0]?.sourcePath).toBe(web);
  });

  it('a blank workspace still reports its bucket', () => {
    const { root } = useOwnWorkspaceRoot('summary-blank');
    const bucket = join(root, 'bucket', 'source');
    mkdirSync(bucket, { recursive: true });
    rememberProject({ ...record('/w/one'), origin: 'blank', sourcePath: bucket, sourceRepoRoot: bucket });

    expect(listWorkspaces()[0]?.sourcePath).toBe(bucket);
  });

  it('a copied workspace still reports its bucket', () => {
    const { root } = useOwnWorkspaceRoot('summary-copied');
    const bucket = join(root, 'bucket', 'source');
    mkdirSync(bucket, { recursive: true });
    rememberProject({ ...record('/w/one'), origin: 'copied', sourcePath: join(root, 'user', 'site'), sourceRepoRoot: bucket });

    expect(listWorkspaces()[0]?.sourcePath).toBe(bucket);
  });

  const step = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

  /* Two subfolder imports of one repository, minted through the product's own write with the
     clock stepped between them — `rememberProject` stamps two calls in the same millisecond. */
  async function twoSubfolderImports(name: string): Promise<{ root: string; web: string; api: string }> {
    const { root } = useOwnWorkspaceRoot(name);
    const repo = join(root, 'repo');
    const web = join(repo, 'apps', 'web');
    const api = join(repo, 'apps', 'api');
    mkdirSync(web, { recursive: true });
    mkdirSync(api, { recursive: true });
    rememberProject(imported('/w/web', web, repo));
    await step();
    rememberProject(imported('/w/api', api, repo));
    return { root, web, api };
  }

  it('the founding project answers, and opening a sibling imported from elsewhere does not move it', async () => {
    const { web } = await twoSubfolderImports('summary-founding');

    expect(listWorkspaces()[0]?.sourcePath).toBe(web);

    touchProject('/w/api');

    expect(listWorkspaces()[0]?.sourcePath).toBe(web);
  });

  it('archiving the founding project does not move the answer either', async () => {
    const { web } = await twoSubfolderImports('summary-archived');

    setProjectArchived('/w/web', true);

    expect(listWorkspaces()[0]?.sourcePath).toBe(web);
  });

  it('a founding folder the user renamed falls back to the repository root, which still exists', () => {
    const { root } = useOwnWorkspaceRoot('summary-renamed');
    const repo = join(root, 'repo');
    mkdirSync(repo, { recursive: true });
    rememberProject(imported('/w/one', join(repo, 'apps', 'web'), repo));

    expect(listWorkspaces()[0]?.sourcePath).toBe(repo);
  });

  /* The clock is frozen so both records carry one `createdAt`, which is the state the v0/v1
     migration leaves behind and the only condition `byFounding`'s path tie-break answers. */
  it('answers the same whichever order a migrated registry lists two records stamped alike', () => {
    const answers = ['api-first', 'web-first'].map((order) => {
      const { root } = useOwnWorkspaceRoot(`summary-tie-${order}`);
      const repo = join(root, 'repo');
      const web = join(repo, 'apps', 'web');
      const api = join(repo, 'apps', 'api');
      mkdirSync(web, { recursive: true });
      mkdirSync(api, { recursive: true });
      setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      try {
        for (const [path, source] of order === 'api-first' ? [['/w/api', api], ['/w/web', web]] : [['/w/web', web], ['/w/api', api]]) {
          rememberProject(imported(path ?? '', source ?? '', repo));
        }
      } finally {
        setSystemTime();
      }
      return listWorkspaces()[0]?.sourcePath?.slice(root.length);
    });

    expect(answers[0]).toBe(answers[1]);
  });

  it('a founding project whose folder and repository are both gone gives way to a live sibling', async () => {
    const { root } = useOwnWorkspaceRoot('summary-moved-repo');
    const gone = join(root, 'gone');
    const live = join(root, 'live');
    mkdirSync(live, { recursive: true });
    rememberProject(imported('/w/gone', gone, gone));
    await step();
    rememberProject(imported('/w/live', live, live));

    expect(listWorkspaces()[0]?.sourcePath).toBe(live);
  });

  /* `addedAt` is the sidebar's sort key and is stripped from the summary, so the order is the
     only way to see it: a gone folder answers the source question, never the added-when one. */
  it('keeps its place in the sidebar when the founding project’s folder goes missing', async () => {
    const { root } = useOwnWorkspaceRoot('summary-order');
    const gone = join(root, 'alpha', 'gone');
    const live = join(root, 'alpha', 'live');
    const beta = join(root, 'beta');
    mkdirSync(live, { recursive: true });
    mkdirSync(beta, { recursive: true });
    // beta lands between alpha's two records, so answering `addedAt` from the live one would reverse them.
    rememberProject({ ...imported('/w/alpha-gone', gone, gone), repoIdentity: 'github.com/fixture/alpha' });
    await step();
    rememberProject({ ...imported('/w/beta', beta, beta), repoIdentity: 'github.com/fixture/beta' });
    await step();
    rememberProject({ ...imported('/w/alpha-live', live, live), repoIdentity: 'github.com/fixture/alpha' });

    expect(listWorkspaces().map((workspace) => workspace.repoIdentity)).toEqual([
      'github.com/fixture/alpha',
      'github.com/fixture/beta',
    ]);
  });

  it('the workspace is still named for the repository while being cut from the subfolder', () => {
    const { root } = useOwnWorkspaceRoot('summary-name');
    const web = join(root, 'alpha', 'apps', 'web');
    mkdirSync(web, { recursive: true });
    rememberProject(imported('/w/one', web, join(root, 'alpha')));

    const [workspace] = listWorkspaces();

    expect(workspace?.name).toBe('alpha');
    expect(workspace?.sourcePath).toBe(web);
  });
});
