import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { afterAll, describe, expect, it, setDefaultTimeout, spyOn } from 'bun:test';
import type { ProjectCreateState, WorkspaceCreated } from '@studio/events';
import {
  bucketsIn,
  cleanupTempFixtures,
  COPY_SOURCE_SYMLINK,
  FIXTURE_SECRET_LINE,
  gitOutput as sh,
  hashTree,
  makeCopySourceDir,
  makeGitRepo,
  makeDirWithFiles,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { resetCanvasRegistryCache } from '../canvas/registry.js';
import { withGlobalGitConfig } from '../env/hostile-git-config.js';
import { resetServerBookCache } from '../server/book.js';
import { STUDIO_SYSTEM_AUTHOR } from '../starter/retire.js';
import { BLANK_MARKER_FILE, BLANK_SOURCE_DIR, sweepBlankBuckets } from './blank.js';
import { createCancelToken } from './cancel.js';
import {
  completeCopiedRegistration,
  COPY_INIT_COMMIT_MESSAGE,
  copiedBucket,
  initCopiedSource,
  isKeptByCopy,
  rollbackCopied,
} from './copy.js';
import { createProject, type ProjectCreateDeps, type ProjectCreateRequest } from './create-project.js';
import { STUDIO_EXCLUDE_RULES, studioExcludePathspecs } from './env-files.js';
import * as workspaceGit from './git.js';
import { fabricateFromPlan, planWorkspace, rollbackFromPlan, type ReadyWorkspacePlan } from './index.js';
import { COPIED_DIR_PREFIX, repoIdentityDirName } from './naming.js';
import { knownProject, listWorkspaces, rememberProject, resetWorkspaceCache } from './store.js';

setDefaultTimeout(30_000);

async function registerThrough(
  request: ProjectCreateRequest,
  capture: ProjectCreateDeps['capture'] = () => undefined,
): Promise<WorkspaceCreated> {
  const state = await createProject(request, {
    plan: planWorkspace,
    fabricate: fabricateFromPlan,
    rollback: rollbackFromPlan,
    register: (workspace) => {
      rememberProject(workspace);
      if (workspace.origin === 'copied') completeCopiedRegistration(workspace);
    },
    capture,
    startSession: async () => undefined,
    install: async () => ({ outcome: 'skipped' }),
    awaitIdle: async () => 'idle',
    detect: async () => ({ asks: [] }),
    awaitOpen: async () => 'open',
    awaitStart: async () => ({ kind: 'reported', port: 3000, frame: { kind: 'no-setup' } }),
    sendStartIntent: async () => true,
    authorFrame: async () => ({ kind: 'no-setup' }),
    awaitRunning: async () => 'running',
    emit: () => undefined,
  });
  if (state.kind !== 'ready' && state.kind !== 'live') throw new Error(`expected a landing, got ${JSON.stringify(state)}`);
  return state.workspace;
}

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `copy-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetServerBookCache();
  return root;
}

async function planCopy(folder: string): Promise<ReadyWorkspacePlan & { origin: 'copied' }> {
  const plan = await planWorkspace(folder);
  if (plan.kind !== 'ready') throw new Error(`expected a ready plan, got ${JSON.stringify(plan)}`);
  if (plan.origin !== 'copied') throw new Error('expected the copy path');
  return { ...plan, origin: 'copied' };
}

function committed(source: string): string[] {
  return sh(source, ['ls-tree', '-r', '--name-only', 'main']).split('\n').filter(Boolean);
}

const SECRET_SHAPED = ['.env', 'credentials.json', 'certs/dev.pem', '.DS_Store', 'dist/bundle.js'];

describe('the plan — a folder with no git history', () => {
  it('answers ready with origin copied and the bucket paths, and creates nothing', async () => {
    const root = useOwnWorkspaceRoot('plan');
    const folder = makeCopySourceDir({ name: 'plan' });

    const plan = await planCopy(folder.path);

    expect(plan.repoIdentity).toMatch(/^copied\/[0-9a-f]{64}$/);
    expect(plan.repoIdentity.startsWith('/')).toBe(false);
    const dirName = repoIdentityDirName(plan.repoIdentity);
    expect(dirName.startsWith(COPIED_DIR_PREFIX)).toBe(true);
    expect(plan.sourceRepoRoot).toBe(join(root, dirName, BLANK_SOURCE_DIR));
    expect(plan.workspacePath).toBe(join(root, dirName, plan.workspaceName));
    expect(plan.sourcePath).toBe(folder.path);
    expect(plan.sourceRepoName).toBe(basename(folder.path));
    expect(plan.baseRef).toBe('main');
    expect(plan.baseBranch).toBe('main');
    expect(plan.baseRefSource).toBe('local-main');
    expect(plan.branchName.endsWith(`/${plan.workspaceName}`)).toBe(true);
    expect(existsSync(plan.sourceRepoRoot)).toBe(false);
    expect(bucketsIn(root)).toEqual([]);
  });

  it('mints one identity for every spelling of the folder — trailing slash, symlink', async () => {
    useOwnWorkspaceRoot('spellings');
    const folder = makeCopySourceDir({ name: 'spellings' });
    const alias = join(makeDirWithFiles({ name: 'alias-holder' }), 'alias');
    symlinkSync(folder.path, alias);

    const plain = await planCopy(folder.path);
    const slashed = await planCopy(`${folder.path}/`);
    const linked = await planCopy(alias);

    expect(slashed.repoIdentity).toBe(plain.repoIdentity);
    expect(linked.repoIdentity).toBe(plain.repoIdentity);
    const other = await planCopy(makeCopySourceDir({ name: 'other' }).path);
    expect(other.repoIdentity).not.toBe(plain.repoIdentity);
  });

  it('a folder inside a git repo keeps resolving to that repo — never the copy path', async () => {
    useOwnWorkspaceRoot('inside-repo');
    const repo = makeGitRepo({ name: 'inside', remote: false });
    const inside = join(repo.path, 'packages', 'web');
    mkdirSync(inside, { recursive: true });

    const plan = await planWorkspace(inside);

    expect(plan.kind).toBe('ready');
    if (plan.kind !== 'ready') return;
    expect(plan.origin).toBeUndefined();
    expect(plan.sourceRepoRoot).toBe(repo.path);
  });
});

describe('the plan — a folder with nothing the copy would keep (ONL-2895)', () => {
  const NOTHING_TO_KEEP: Record<string, Record<string, string>> = {
    'an empty folder': {},
    'only a Finder file': { '.DS_Store': '' },
    'only build output': { 'dist/bundle.js': 'x', '.next/cache/a': 'x' },
    'only a secret': { '.env': FIXTURE_SECRET_LINE },
    'only dependencies': { 'node_modules/left-pad/index.js': 'x' },
  };
  for (const [what, files] of Object.entries(NOTHING_TO_KEEP)) {
    it(`refuses ${what} before anything is made`, async () => {
      const root = useOwnWorkspaceRoot(`nothing-${what.replaceAll(' ', '-')}`);
      const folder = makeDirWithFiles({ name: 'nothing', files });

      const plan = await planWorkspace(folder);

      expect(plan).toStrictEqual({ kind: 'refused', reason: 'nothing-to-copy' });
      expect(bucketsIn(root)).toEqual([]);
    });
  }

  it('refuses a folder holding only empty folders', async () => {
    useOwnWorkspaceRoot('nothing-empty-dirs');
    const folder = makeDirWithFiles({ name: 'empty-dirs' });
    mkdirSync(join(folder, 'src', 'components'), { recursive: true });

    expect(await planWorkspace(folder)).toStrictEqual({ kind: 'refused', reason: 'nothing-to-copy' });
  });

  const SOMETHING_TO_KEEP: Record<string, Record<string, string>> = {
    'one empty file': { 'notes.txt': '' },
    'only a .gitignore': { '.gitignore': 'dist/\n' },
    'a file under a folder whose name only resembles build output': { 'src/build-tools/x.ts': 'x' },
  };
  for (const [what, files] of Object.entries(SOMETHING_TO_KEEP)) {
    it(`plans ${what} as a copy`, async () => {
      useOwnWorkspaceRoot(`something-${what.replaceAll(' ', '-')}`);
      const folder = makeDirWithFiles({ name: 'something', files });

      expect((await planWorkspace(folder)).kind).toBe('ready');
    });
  }

  it('plans a folder holding only a symlink as a copy', async () => {
    useOwnWorkspaceRoot('something-symlink');
    const folder = makeDirWithFiles({ name: 'only-link' });
    symlinkSync('../elsewhere', join(folder, 'link'));

    expect((await planWorkspace(folder)).kind).toBe('ready');
  });
});

describe('what the plan counts as kept is what the first commit keeps', () => {
  it('agrees with git on every exclude rule, at the root and nested', () => {
    const files: Record<string, string> = { 'keep.js': 'x', 'sub/keep.ts': 'x', 'distx/keep.js': 'x', 'sub2/dist': 'x' };
    for (const rule of STUDIO_EXCLUDE_RULES) {
      const name = rule.endsWith('/') ? `${rule}f.js` : rule.replaceAll('*', 'x');
      files[name] = 'x';
      files[`sub/${name}`] = 'x';
    }
    const folder = makeDirWithFiles({ name: 'drift', files });
    sh(folder, ['init', '--quiet']);

    const added = sh(folder, ['-c', 'core.excludesFile=/dev/null', 'add', '-A', '--dry-run', '--', '.', ...studioExcludePathspecs()])
      .split('\n')
      .filter(Boolean)
      .map((line) => line.replace(/^add '(.*)'$/, '$1'))
      .sort();

    expect(Object.keys(files).filter((path) => isKeptByCopy(path)).sort()).toEqual(added);
    expect(added).toContain('keep.js');
  });
});

describe('the copy — the user folder untouched, the secrets out of history', () => {
  it('leaves the folder byte-identical, commits the files once under the system author, and keeps every secret-shaped file out', async () => {
    useOwnWorkspaceRoot('copy');
    const folder = makeCopySourceDir({ name: 'copy' });
    const before = hashTree(folder.path);
    const plan = await planCopy(folder.path);

    const created = await fabricateFromPlan(plan);

    if (!created.ok) throw new Error(created.detail ?? created.reason);
    const { source, worktree, marker } = copiedBucket(plan);
    expect(hashTree(folder.path)).toBe(before);
    expect(existsSync(join(folder.path, '.git'))).toBe(false);

    expect(sh(source, ['rev-list', '--count', 'main'])).toBe('1');
    expect(sh(source, ['log', '-1', '--format=%an <%ae>'])).toBe(
      `${STUDIO_SYSTEM_AUTHOR.name} <${STUDIO_SYSTEM_AUTHOR.email}>`,
    );
    expect(sh(source, ['log', '-1', '--format=%s'])).toBe(COPY_INIT_COMMIT_MESSAGE);
    const tracked = committed(source);
    expect(tracked).toEqual(
      expect.arrayContaining(['package.json', 'src/index.js', 'src/components/Hero.jsx', '.editorconfig', COPY_SOURCE_SYMLINK.path]),
    );
    for (const secret of SECRET_SHAPED) expect(tracked).not.toContain(secret);
    expect(tracked.some((path) => path.startsWith('node_modules/'))).toBe(false);
    expect(existsSync(join(source, 'node_modules'))).toBe(false);
    expect(readFileSync(join(source, '.git', 'info', 'exclude'), 'utf8')).toContain(STUDIO_EXCLUDE_RULES.join('\n'));
    expect(tracked).not.toContain('.gitignore');
    expect(existsSync(join(source, '.gitignore'))).toBe(false);

    expect(readFileSync(join(source, '.env'), 'utf8')).toBe(FIXTURE_SECRET_LINE);
    expect(sh(source, ['status', '--porcelain'])).toBe('');
    expect(sh(source, ['status', '--porcelain', '--ignored']).split('\n')).toContain('!! .env');
    expect(readFileSync(join(worktree, '.env'), 'utf8')).toBe(FIXTURE_SECRET_LINE);
    expect(created.workspace.copiedEnvFiles).toEqual(['.env']);
    expect(existsSync(join(worktree, 'credentials.json'))).toBe(false);
    expect(existsSync(join(worktree, 'node_modules'))).toBe(false);
    expect(sh(worktree, ['status', '--porcelain'])).toBe('');

    expect(sh(worktree, ['rev-parse', 'HEAD'])).toBe(sh(source, ['rev-parse', 'refs/heads/main']));
    expect(sh(worktree, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe(plan.branchName);
    expect(() => sh(worktree, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();
    expect(sh(worktree, ['remote'])).toBe('');

    expect(created.workspace.origin).toBe('copied');
    expect(knownProject(worktree)).toBeUndefined();
    expect(existsSync(marker)).toBe(true);
  });

  it("a user .gitignore that never mentions .env copies byte-identical, and the first commit still has no .env", async () => {
    useOwnWorkspaceRoot('gitignore');
    const gitignore = '# the user’s own rules\ndist\n*.log\n';
    const folder = makeCopySourceDir({ name: 'gitignore', gitignore });
    const plan = await planCopy(folder.path);

    const created = await fabricateFromPlan(plan);

    if (!created.ok) throw new Error(created.detail ?? created.reason);
    const { source, worktree } = copiedBucket(plan);
    expect(readFileSync(join(source, '.gitignore'), 'utf8')).toBe(gitignore);
    expect(readFileSync(join(worktree, '.gitignore'), 'utf8')).toBe(gitignore);
    const tracked = committed(source);
    expect(tracked).toContain('.gitignore');
    for (const secret of SECRET_SHAPED) expect(tracked).not.toContain(secret);
    expect(readFileSync(join(worktree, '.env'), 'utf8')).toBe(FIXTURE_SECRET_LINE);
    expect(sh(worktree, ['status', '--porcelain'])).toBe('');
  });

  it('a user .gitignore that un-ignores .env still keeps it out of the first commit, and it still crosses into the worktree', async () => {
    useOwnWorkspaceRoot('gitignore-negation');
    const gitignore = 'dist\n!.env\n';
    const folder = makeCopySourceDir({ name: 'gitignore-negation', gitignore });
    const plan = await planCopy(folder.path);

    const created = await fabricateFromPlan(plan);

    if (!created.ok) throw new Error(created.detail ?? created.reason);
    const { source, worktree } = copiedBucket(plan);
    const tracked = committed(source);
    expect(tracked).toContain('.gitignore');
    expect(tracked).toContain('src/index.js');
    for (const secret of SECRET_SHAPED) expect(tracked).not.toContain(secret);
    expect(sh(source, ['status', '--porcelain']).split('\n')).toContain('?? .env');
    expect(readFileSync(join(source, '.env'), 'utf8')).toBe(FIXTURE_SECRET_LINE);
    expect(readFileSync(join(worktree, '.env'), 'utf8')).toBe(FIXTURE_SECRET_LINE);
    expect(created.workspace.copiedEnvFiles).toEqual(['.env']);
    expect(readFileSync(join(worktree, '.gitignore'), 'utf8')).toBe(gitignore);
  });

  it('a whitelist .gitignore that re-admits a certificate still keeps it out of the first commit', async () => {
    useOwnWorkspaceRoot('gitignore-whitelist');
    const gitignore = '/*\n!/.gitignore\n!/package.json\n!/src\n!/certs/\n!/certs/dev.pem\n';
    const folder = makeCopySourceDir({ name: 'gitignore-whitelist', gitignore });
    const plan = await planCopy(folder.path);

    const created = await fabricateFromPlan(plan);

    if (!created.ok) throw new Error(created.detail ?? created.reason);
    const { source, worktree } = copiedBucket(plan);
    const tracked = committed(source);
    expect(tracked).toEqual(expect.arrayContaining(['.gitignore', 'package.json', 'src/index.js']));
    expect(tracked).not.toContain('certs/dev.pem');
    expect(sh(source, ['status', '--porcelain']).split('\n')).toContain('?? certs/');
    expect(existsSync(join(source, 'certs', 'dev.pem'))).toBe(true);
    expect(existsSync(join(worktree, 'certs', 'dev.pem'))).toBe(false);
    expect(readFileSync(join(worktree, '.gitignore'), 'utf8')).toBe(gitignore);
  });

  it('stores a symlink as a link with the same target string, and keeps an executable executable', async () => {
    useOwnWorkspaceRoot('symlink');
    const folder = makeCopySourceDir({ name: 'symlink' });
    chmodSync(join(folder.path, 'src/index.js'), 0o755);
    const plan = await planCopy(folder.path);

    const created = await fabricateFromPlan(plan);

    if (!created.ok) throw new Error(created.detail ?? created.reason);
    const { source, worktree } = copiedBucket(plan);
    for (const tree of [source, worktree]) {
      const link = join(tree, folder.symlink.path);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(readlinkSync(link)).toBe(folder.symlink.target);
    }
    expect(sh(source, ['ls-files', '-s', folder.symlink.path]).startsWith('120000')).toBe(true);
    expect(sh(source, ['ls-files', '-s', 'src/index.js']).startsWith('100755')).toBe(true);
  });

  it('keeps a private directory private even when its ignored secret file is readable by everyone', async () => {
    const root = useOwnWorkspaceRoot('private-directory');
    const folder = makeDirWithFiles({
      name: 'private-directory',
      files: {
        'src/index.js': 'export const ready = true;\n',
        'private/notes.txt': 'project notes\n',
        'private/credentials.json': FIXTURE_SECRET_LINE,
      },
    });
    const privateDir = join(folder, 'private');
    chmodSync(privateDir, 0o700);
    chmodSync(join(privateDir, 'credentials.json'), 0o644);
    const before = hashTree(folder);
    const plan = await planCopy(folder);
    const bucket = copiedBucket(plan);

    try {
      expect(await initCopiedSource(plan)).toEqual({ ok: true });

      const copiedPrivateDir = join(bucket.source, 'private');
      const mode = lstatSync(copiedPrivateDir).mode;
      expect(mode & 0o077).toBe(0);
      expect(mode & 0o700).toBe(0o700);
      expect(lstatSync(join(copiedPrivateDir, 'credentials.json')).mode & 0o777).toBe(0o644);
      expect(readFileSync(join(copiedPrivateDir, 'credentials.json'), 'utf8')).toBe(FIXTURE_SECRET_LINE);
      expect(committed(bucket.source)).toEqual(['private/notes.txt', 'src/index.js']);
      expect(sh(bucket.source, ['status', '--porcelain', '--ignored']).split('\n')).toContain('!! private/credentials.json');
      expect(hashTree(folder)).toBe(before);
    } finally {
      await rollbackCopied(plan);
    }

    expect(existsSync(bucket.identityDir)).toBe(false);
    expect(bucketsIn(root)).toEqual([]);
    expect(hashTree(folder)).toBe(before);
    expect(existsSync(join(folder, '.git'))).toBe(false);
  });
});

describe('registration — the card, the group name and the re-pick', () => {
  it('registers with origin copied, titles the group by the folder, captures hashed ids, and refuses the same folder afterwards', async () => {
    useOwnWorkspaceRoot('register');
    const folder = makeCopySourceDir({ name: 'register' });
    const captured: { event: string; properties: Record<string, unknown> }[] = [];

    const first = await planCopy(folder.path);
    const again = await planCopy(folder.path);
    expect(again.repoIdentity).toBe(first.repoIdentity);

    const workspace = await registerThrough(
      { sourcePath: folder.path, comfort: 'experiment', entryPoint: 'switcher' },
      (event, properties) => captured.push({ event, properties: properties as Record<string, unknown> }),
    );
    expect(workspace.origin).toBe('copied');
    expect(knownProject(workspace.workspacePath)?.origin).toBe('copied');
    expect(existsSync(copiedBucket(workspace).marker)).toBe(false);

    const [group] = listWorkspaces();
    if (!group) throw new Error('no workspace listed');
    expect(group.name).toBe(basename(folder.path));
    expect(group.projects.map((p) => p.name)).toEqual([`${basename(folder.path)} · ${workspace.workspaceName}`]);

    expect(captured.map((c) => c.event)).toEqual(['project_created', 'project_mode_chosen']);
    expect(captured[0]?.properties).toEqual({
      project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      source: 'copied',
      entry_point: 'switcher',
    });
    expect(captured[1]?.properties['source']).toBe('copied');
    const sent = JSON.stringify(captured);
    expect(sent).not.toContain(folder.path);
    expect(sent).not.toContain(basename(folder.path));
    expect(sent).not.toContain(workspace.workspaceName);

    const repick = await planWorkspace(folder.path);
    expect(repick).toEqual({ kind: 'refused', reason: 'already-copied', projectName: basename(folder.path) });
    expect(bucketsIn(process.env['STUDIO_WORKSPACE_ROOT'] ?? '')).toHaveLength(1);
  });
});

describe('the tab machine — the copied plan through createProject', () => {
  interface Recorder {
    deps: ProjectCreateDeps;
    calls: string[];
    registered: WorkspaceCreated[];
    captured: string[];
  }

  function makeRecorder(overrides: Partial<ProjectCreateDeps> = {}): Recorder {
    const calls: string[] = [];
    const registered: WorkspaceCreated[] = [];
    const captured: string[] = [];
    const deps: ProjectCreateDeps = {
      plan: planWorkspace,
      fabricate: (plan) => {
        calls.push('fabricate');
        return fabricateFromPlan(plan);
      },
      rollback: (plan) => {
        calls.push('rollback');
        return rollbackFromPlan(plan);
      },
      register: (workspace) => {
        calls.push('register');
        registered.push(workspace);
        rememberProject(workspace);
        if (workspace.origin === 'copied') completeCopiedRegistration(workspace);
      },
      capture: (event) => {
        captured.push(event);
      },
      startSession: async () => {
        calls.push('startSession');
      },
      install: async () => {
        calls.push('install');
        return { outcome: 'skipped' };
      },
      awaitIdle: async () => 'idle',
      detect: async () => ({ asks: [] }),
      awaitOpen: async () => 'open',
      awaitStart: async () => ({ kind: 'reported', port: 3000, frame: { kind: 'no-setup' } }),
      sendStartIntent: async () => {
        calls.push('sendStartIntent');
        return true;
      },
      authorFrame: async () => ({ kind: 'no-setup' }),
      awaitRunning: async () => 'running',
      emit: (state: ProjectCreateState) => {
        calls.push(`emit:${state.kind}`);
      },
      ...overrides,
    };
    return { deps, calls, registered, captured };
  }

  it('plans, copies and cuts in the copying phase, registers the copied record, and fires project_created once', async () => {
    useOwnWorkspaceRoot('machine');
    const folder = makeCopySourceDir({ name: 'machine' });
    const recorder = makeRecorder();

    const state = await createProject({ sourcePath: folder.path, comfort: 'ship', entryPoint: 'projects' }, recorder.deps);

    expect(recorder.calls.slice(0, 5)).toEqual(['emit:planning', 'emit:copying', 'fabricate', 'register', 'startSession']);
    if (state.kind !== 'live') throw new Error(`expected live, got ${JSON.stringify(state)}`);
    expect(state.workspace.origin).toBe('copied');
    expect(recorder.registered).toEqual([state.workspace]);
    expect(recorder.captured).toEqual(['project_created', 'project_mode_chosen']);
    expect(existsSync(copiedBucket(state.workspace).marker)).toBe(false);
    expect(listWorkspaces()[0]?.name).toBe(basename(folder.path));
    expect(sh(state.workspace.workspacePath, ['status', '--porcelain'])).toBe('');
  });

  it('cancelled once the copy is cut: the whole bucket goes, and no card is left', async () => {
    const root = useOwnWorkspaceRoot('machine-cancel');
    const folder = makeCopySourceDir({ name: 'machine-cancel' });
    const token = createCancelToken();
    let cut: ReadyWorkspacePlan | undefined;
    const recorder = makeRecorder({
      fabricate: async (plan) => {
        cut = plan;
        const result = await fabricateFromPlan(plan);
        expect(existsSync(plan.workspacePath)).toBe(true);
        token.cancel();
        return result;
      },
    });

    const state = await createProject({ sourcePath: folder.path, entryPoint: 'projects' }, recorder.deps, token);

    expect(state).toEqual({ kind: 'canceled' });
    if (!cut) throw new Error('the cut never ran');
    expect(existsSync(copiedBucket(cut).identityDir)).toBe(false);
    expect(bucketsIn(root)).toEqual([]);
    expect(recorder.registered).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
  });
});

describe('rollback and the boot sweep', () => {
  it('removes a failed copy containing a read-only directory so the folder can be chosen again', async () => {
    const root = useOwnWorkspaceRoot('read-only-rollback');
    const folder = makeDirWithFiles({ name: 'read-only-source', files: { '.gitignore': '*\n', 'assets/icon.txt': 'icon' } });
    const readOnly = join(folder, 'assets');
    chmodSync(readOnly, 0o555);
    try {
      const first = await fabricateFromPlan(await planCopy(folder));
      expect(first).toMatchObject({ ok: false, copyFailure: { cause: 'ignored_files' } });
      expect(bucketsIn(root)).toEqual([]);
      const second = await fabricateFromPlan(await planCopy(folder));
      expect(second).toMatchObject({ ok: false, copyFailure: { cause: 'ignored_files' } });
      expect(bucketsIn(root)).toEqual([]);
      expect(lstatSync(readOnly).mode & 0o777).toBe(0o555);
    } finally {
      chmodSync(readOnly, 0o755);
    }
  });

  it('a failure after the marker rolls the bucket back — nothing under the root, nothing in the registry', async () => {
    const root = useOwnWorkspaceRoot('rollback');
    const folder = makeCopySourceDir({ name: 'rollback' });
    const plan = await planCopy(folder.path);
    const inited = await initCopiedSource(plan);
    expect(inited).toEqual({ ok: true });
    expect(existsSync(copiedBucket(plan).marker)).toBe(true);

    await rollbackCopied(plan);

    expect(existsSync(copiedBucket(plan).identityDir)).toBe(false);
    expect(bucketsIn(root)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
    expect(existsSync(join(folder.path, '.git'))).toBe(false);
  });

  it('a copy that cannot be read answers create-failed and leaves no bucket', async () => {
    const root = useOwnWorkspaceRoot('unreadable');
    const gone = join(makeDirWithFiles({ name: 'gone-holder' }), 'never-existed');
    const plan = await planCopy(gone);

    const created = await fabricateFromPlan(plan);

    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.reason).toBe('create-failed');
    expect(created).toMatchObject({ copyFailure: { step: 'copy_files', cause: 'folder_unavailable' } });
    expect(bucketsIn(root)).toEqual([]);
  });

  it('a folder whose own .gitignore hides every file fails with what git said, not the command it ran', async () => {
    const root = useOwnWorkspaceRoot('nothing-to-commit');
    const folder = makeDirWithFiles({ name: 'self-ignored', files: { '.gitignore': '*\n', 'index.html': 'x' } });
    const plan = await planCopy(folder);

    const created = await fabricateFromPlan(plan);

    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.reason).toBe('create-failed');
    expect(created.detail).toStartWith('git commit exited with code 1: nothing to commit');
    expect(created.detail).not.toContain(COPY_INIT_COMMIT_MESSAGE);
    expect(created).toMatchObject({ copyFailure: { step: 'git_commit', cause: 'ignored_files' } });
    expect(bucketsIn(root)).toEqual([]);
  });

  it('a global ignore that hides every file reports ignored files and removes only the copy', async () => {
    const root = useOwnWorkspaceRoot('globally-ignored');
    const folder = makeDirWithFiles({ name: 'globally-ignored', files: { 'index.html': 'x' } });
    const ignoreFolder = makeDirWithFiles({ name: 'global-ignore', files: { ignore: '*\n' } });
    const before = hashTree(folder);
    const ignoreBefore = hashTree(ignoreFolder);

    await withGlobalGitConfig(`[core]\n\texcludesFile = ${JSON.stringify(join(ignoreFolder, 'ignore'))}\n`, async () => {
      const plan = await planCopy(folder);

      const created = await fabricateFromPlan(plan);

      expect(created.ok).toBe(false);
      if (created.ok) return;
      expect(created.reason).toBe('create-failed');
      expect(created).toMatchObject({ copyFailure: { step: 'git_commit', cause: 'ignored_files' } });
      expect(existsSync(copiedBucket(plan).identityDir)).toBe(false);
      expect(bucketsIn(root)).toEqual([]);
      expect(hashTree(folder)).toBe(before);
      expect(existsSync(join(folder, '.git'))).toBe(false);
      expect(hashTree(ignoreFolder)).toBe(ignoreBefore);
    });
  });

  it('a commit failure with files to commit keeps the git error instead of reporting ignored files', async () => {
    const root = useOwnWorkspaceRoot('commit-failure');
    const folder = makeDirWithFiles({ name: 'commit-failure', files: { 'index.html': 'x' } });
    const before = hashTree(folder);

    await withGlobalGitConfig('[commit]\n\tcleanup = invalid-mode\n', async () => {
      const plan = await planCopy(folder);

      const created = await fabricateFromPlan(plan);

      expect(created.ok).toBe(false);
      if (created.ok) return;
      expect(created.reason).toBe('create-failed');
      expect(created).toMatchObject({ copyFailure: { step: 'git_commit', cause: 'git_failed' } });
      expect(created.detail).toContain('Invalid cleanup mode');
      expect(created.detail).toContain('invalid-mode');
      expect(created.detail).not.toContain(COPY_INIT_COMMIT_MESSAGE);
      expect(existsSync(copiedBucket(plan).identityDir)).toBe(false);
      expect(bucketsIn(root)).toEqual([]);
      expect(hashTree(folder)).toBe(before);
      expect(existsSync(join(folder, '.git'))).toBe(false);
    });
  });

  it('a missing Git executable keeps its cause and leaves the source untouched', async () => {
    const root = useOwnWorkspaceRoot('git-missing');
    const folder = makeDirWithFiles({ name: 'git-missing', files: { 'index.html': 'Hello' } });
    const before = hashTree(folder);
    const plan = await planCopy(folder);
    const run = spyOn(workspaceGit, 'git').mockResolvedValue({
      ok: false, out: '', err: 'Host executable not found in trusted PATH', timedOut: false, missing: true, exitCode: null,
    });
    try {
      const result = await fabricateFromPlan(plan);
      expect(result).toMatchObject({ ok: false, reason: 'create-failed', copyFailure: { step: 'git_init', cause: 'git_not_found' } });
      expect(bucketsIn(root)).toEqual([]);
      expect(hashTree(folder)).toBe(before);
      expect(existsSync(join(folder, '.git'))).toBe(false);
    } finally {
      run.mockRestore();
    }
  });

  it('a timed-out commit stays timed out without probing whether the index is empty', async () => {
    const root = useOwnWorkspaceRoot('commit-timeout');
    const folder = makeDirWithFiles({ name: 'commit-timeout', files: { 'index.html': 'x' } });
    const before = hashTree(folder);
    const plan = await planCopy(folder);
    const bucket = copiedBucket(plan);
    const commitFailure: workspaceGit.GitResult = {
      ok: false, out: '', err: 'nothing to commit, working tree clean', timedOut: true, missing: false, exitCode: null,
    };
    const originalGit = workspaceGit.git;
    const run = spyOn(workspaceGit, 'git').mockImplementation((cwd, args, options) => {
      if (args.includes('commit')) return Promise.resolve(commitFailure);
      return originalGit(cwd, args, options);
    });

    try {
      const initialized = await initCopiedSource(plan);

      expect(initialized).toMatchObject({
        ok: false, claimed: true, copyFailure: { step: 'git_commit', cause: 'git_timed_out' },
      });
      expect(sh(bucket.source, ['diff', '--cached', '--name-only'])).toBe('index.html');
      expect(run.mock.calls.some(([, args]) => args[0] === 'diff' && args.includes('--cached'))).toBe(false);
    } finally {
      run.mockRestore();
      await rollbackCopied(plan);
    }

    expect(bucketsIn(root)).toEqual([]);
    expect(hashTree(folder)).toBe(before);
  });

  it('a failed cached-index probe preserves the commit permission failure', async () => {
    const root = useOwnWorkspaceRoot('commit-permission');
    const folder = makeDirWithFiles({ name: 'commit-permission', files: { 'index.html': 'x' } });
    const before = hashTree(folder);
    const plan = await planCopy(folder);
    const bucket = copiedBucket(plan);
    const commitFailure: workspaceGit.GitResult = {
      ok: false, out: '', err: 'fatal: Unable to write index: Permission denied', timedOut: false, missing: false, exitCode: 128,
    };
    const probeFailure: workspaceGit.GitResult = {
      ok: false, out: '', err: 'fatal: unable to read index', timedOut: false, missing: false, exitCode: 128,
    };
    const originalGit = workspaceGit.git;
    const run = spyOn(workspaceGit, 'git').mockImplementation((cwd, args, options) => {
      if (args.includes('commit')) return Promise.resolve(commitFailure);
      if (args[0] === 'diff' && args.includes('--cached')) return Promise.resolve(probeFailure);
      return originalGit(cwd, args, options);
    });

    try {
      const initialized = await initCopiedSource(plan);

      expect(initialized).toMatchObject({
        ok: false, claimed: true, detail: commitFailure.err, copyFailure: { step: 'git_commit', cause: 'permission_denied' },
      });
      expect(sh(bucket.source, ['diff', '--cached', '--name-only'])).toBe('index.html');
      expect(run).toHaveBeenCalledWith(bucket.source, [
        'diff', '--cached', '--quiet', '--no-ext-diff', '--no-textconv', '--ignore-submodules=none',
      ]);
    } finally {
      run.mockRestore();
      await rollbackCopied(plan);
    }

    expect(bucketsIn(root)).toEqual([]);
    expect(hashTree(folder)).toBe(before);
  });

  it('a claim that loses to a bucket already there removes nothing of it', async () => {
    const root = useOwnWorkspaceRoot('claim-lost');
    const folder = makeCopySourceDir({ name: 'claim-lost' });
    const plan = await planCopy(folder.path);
    expect(await initCopiedSource(plan)).toEqual({ ok: true });

    const second = await fabricateFromPlan(plan);

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('create-failed');
    expect(second).toMatchObject({ copyFailure: { step: 'claim', cause: 'copy_in_progress' } });
    const bucket = copiedBucket(plan);
    expect(existsSync(bucket.marker)).toBe(true);
    expect(sh(bucket.source, ['rev-list', '--count', 'main'])).toBe('1');
    expect(bucketsIn(root)).toHaveLength(1);
  });

  it('a marker left by a crash is swept at boot; a registered copied project beside it is not', async () => {
    const root = useOwnWorkspaceRoot('sweep');
    const finished = makeCopySourceDir({ name: 'sweep-finished' });
    const registered = { workspace: await registerThrough({ sourcePath: finished.path, comfort: 'design', entryPoint: 'projects' }) };

    const crashed = await planCopy(makeCopySourceDir({ name: 'sweep-crashed' }).path);
    const cut = await fabricateFromPlan(crashed);
    if (!cut.ok) throw new Error(cut.detail ?? cut.reason);
    const bucket = copiedBucket(crashed);
    expect(existsSync(join(bucket.identityDir, BLANK_MARKER_FILE))).toBe(true);
    expect(basename(bucket.identityDir).startsWith(COPIED_DIR_PREFIX)).toBe(true);
    expect(bucketsIn(root)).toHaveLength(2);

    const swept = sweepBlankBuckets();

    expect(swept).toEqual([bucket.identityDir]);
    expect(existsSync(bucket.identityDir)).toBe(false);
    expect(existsSync(registered.workspace.workspacePath)).toBe(true);
    expect(knownProject(registered.workspace.workspacePath)).toBeDefined();
    expect(bucketsIn(root)).toHaveLength(1);
    expect(sweepBlankBuckets()).toEqual([]);
  });
});
