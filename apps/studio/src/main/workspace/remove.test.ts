import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it, setDefaultTimeout } from 'bun:test';
import {
  bucketsIn,
  cleanupTempFixtures,
  gitOutput as sh,
  makeGitRepo,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import type { WorkspaceCreated } from '@studio/events';
import { MEASUREMENT_FIXTURES, row as fixtureRow } from '@studio/git-ui/measurement-fixtures';
import { readComposerDraft, resetComposerDraftsCache, writeComposerDraft } from '../drafts/state.js';
import { defaultPreference, preferenceFor, rememberDefault, rememberModelChoice, resetPreferencesCache } from '../agent-host/preferences.js';
import { archiveChat, readArchivedChats, resetChatHistoryCache } from '../agent-host/chat-history.js';
import { capturePath, openCapture } from '../agent-host/appserver/capture.js';
import { gitStatusRowFor, resetGitStatusCache, writeGitStatusRow } from '../git-status/store.js';
import { flushAllDomains } from '../state/store.js';
import { flushLocation, readWindows, resetLocationCache, setLocation, writeWindows } from '../location/state.js';
import { workspaceHash } from '../lib/canonical-path.js';
import { readCanvasCamera, writeCanvasCamera } from '../canvas/camera.js';
import { canvasDir, canvasDocPath, canvasLogPath } from '../canvas/dir.js';
import { canvasDocIdFor, knownCanvasDocId, resetCanvasRegistryCache } from '../canvas/registry.js';
import { thumbnailPath } from '../canvas/thumbnail/store.js';
import { createServerEntry, resetServerBookCache, serverBookEntries } from '../server/book.js';
import { rememberAppServerThread, rememberSession, resetSessionsCache, storedAppServerThread, storedClaudeSession } from '../agent-host/sessions.js';
import { flushTranscripts, readTranscript, resetTranscriptCache, writeTranscript } from '../agent-host/transcript.js';
import { transcriptFilePath } from '../agent-host/transcript-storage.js';
import {
  readSidebarLayout,
  resetSidebarLayoutCache,
  writeSidebarLayout,
} from '../sidebar-layout/state.js';
import { stateRoot } from '../state/root.js';
import { createSetupState, versionDefinition } from '../project-setup/state.js';
import { readImage, registerImage, resetImagesStore } from '../images/store.js';
import { type BlankBucket, blankBucketPaths, rollbackBlank } from './blank.js';
import { addWorktree, branchExists, git, type GitResult, removeWorktree } from './git.js';
import { importWorktreeAt } from './import.js';
import { type RemoveProjectDeps, teardownProject } from './remove.js';
import { forgetProjectState } from './project-state.js';
import {
  listWorkspaces,
  forgetProject,
  rememberProject,
  renameWorkspace,
  resetWorkspaceCache,
  setWorkspaceArchived,
  workspacePathFor,
  workspaceHeldOrigin,
} from './store.js';

setDefaultTimeout(30_000);

const enteringStateRoot = process.env['STUDIO_STATE_ROOT'];
process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'remove' });

afterAll(() => {
  if (enteringStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = enteringStateRoot;
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `remove-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetServerBookCache();
  resetSidebarLayoutCache();
  resetSessionsCache();
  resetTranscriptCache();
  resetComposerDraftsCache();
  resetPreferencesCache();
  resetChatHistoryCache();
  resetGitStatusCache();
  resetLocationCache();
  return root;
}

function remember(overrides: Partial<WorkspaceCreated> & { workspacePath: string }): WorkspaceCreated {
  const workspace: WorkspaceCreated = {
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'app',
    sourcePath: '/somewhere/app',
    sourceRepoRoot: '/somewhere/app',
    repoIdentity: 'fixture/app',
    copiedEnvFiles: [],
    ...overrides,
  };
  rememberProject(workspace);
  return workspace;
}

function answered(ok: boolean): GitResult {
  return { ok, out: '', err: ok ? '' : 'fixture refused', timedOut: false, missing: false, exitCode: ok ? 0 : 1 };
}

interface Recorder {
  deps: RemoveProjectDeps;
  /** Every step the module reaches for, in the order it reached. */
  order: string[];
  /** Every argv handed to git, `worktree remove` included. */
  argv: string[][];
  erased: string[];
  canvasBindingWhenClosed: string | undefined;
  projectsListedWhenErasing: number;
  /** What the path-keyed stores still held at the moment the folder went. */
  storesWhenErasing: { book: number; session: boolean; transcript: number };
}

function recorder(
  options: { git?: 'real'; rm?: 'throws'; worktreeRemoval?: 'fails' } = {},
  observed = '',
): Recorder {
  const order: string[] = [];
  const argv: string[][] = [];
  const erased: string[] = [];
  const state = {
    canvasBindingWhenClosed: undefined as string | undefined,
    projectsListedWhenErasing: -1,
    storesWhenErasing: { book: -1, session: true, transcript: -1 },
  };
  const deps: RemoveProjectDeps = {
    closeServer: async () => {
      order.push('close-server');
    },
    stopStarter: async () => {
      order.push('stop-starter');
    },
    releaseSession: async () => {
      order.push('release-session');
    },
    closeCanvas: async (worktreePath) => {
      order.push('close-canvas');
      state.canvasBindingWhenClosed = knownCanvasDocId(worktreePath);
    },
    sweep: async () => {
      order.push('sweep');
    },
    removeWorktree: async (root, worktreePath) => {
      order.push('remove-worktree');
      argv.push(['worktree', 'remove', '--force', worktreePath]);
      if (options.worktreeRemoval === 'fails') return answered(false);
      return options.git === 'real' ? removeWorktree(root, worktreePath) : answered(true);
    },
    git: async (cwd, args) => {
      order.push(`git ${args[0] ?? ''}`);
      argv.push(args);
      return options.git === 'real' ? git(cwd, args) : answered(true);
    },
    rm: async (path) => {
      order.push('rm');
      erased.push(path);
      state.projectsListedWhenErasing = listWorkspaces().flatMap((w) => w.projects).length;
      state.storesWhenErasing = {
        book: serverBookEntries(observed).length,
        session: storedClaudeSession(observed) !== undefined,
        transcript: readTranscript(observed, 'claude').length,
      };
      if (options.rm === 'throws') throw new Error('EPERM: the fixture refuses');
      rmSync(path, { recursive: true, force: true });
    },
  };
  return {
    deps,
    order,
    argv,
    erased,
    get canvasBindingWhenClosed() {
      return state.canvasBindingWhenClosed;
    },
    get projectsListedWhenErasing() {
      return state.projectsListedWhenErasing;
    },
    get storesWhenErasing() {
      return state.storesWhenErasing;
    },
  };
}

function heldBucket(repoIdentity: string, workspaceName: string): BlankBucket {
  const bucket = blankBucketPaths(repoIdentity, workspaceName);
  mkdirSync(bucket.source, { recursive: true });
  sh(bucket.source, ['init', '--quiet', '-b', 'main']);
  sh(bucket.source, ['config', 'user.email', 'fixture@example.com']);
  sh(bucket.source, ['config', 'user.name', 'Fixture User']);
  writeFileSync(join(bucket.source, 'app.ts'), '// held\n');
  sh(bucket.source, ['add', '-A']);
  sh(bucket.source, ['commit', '--quiet', '-m', 'init']);
  return bucket;
}

async function heldProject(bucket: BlankBucket, workspaceName: string): Promise<string> {
  const worktree = join(bucket.identityDir, workspaceName);
  const added = await addWorktree({
    root: bucket.source,
    worktreePath: worktree,
    branch: `onlook/${workspaceName}`,
    startPoint: 'main',
  });
  expect(added.ok).toBe(true);
  return worktree;
}

describe('removing an imported project', () => {
  it('removes a picked nested worktree from its own repository without touching a matching held bucket', async () => {
    const root = useOwnWorkspaceRoot('nested-import');
    const bucket = heldBucket('blank-0000', 'foreign-work');
    const held = await heldProject(bucket, 'foreign-work');
    const repo = makeGitRepo({ name: 'remove-nested-import', seedFile: 'app.ts' }).path;
    const worktree = join(root, 'nested', 'blank-0000', 'foreign-work');
    mkdirSync(join(root, 'nested', 'blank-0000'), { recursive: true });
    const added = await addWorktree({
      root: repo,
      worktreePath: worktree,
      branch: 'fixture/foreign-work',
      startPoint: 'origin/main',
    });
    expect(added.ok).toBe(true);
    const canonicalWorktree = realpathSync(worktree);
    const imported = await importWorktreeAt(worktree, 'picked', {
      capture: () => {},
      changed: () => {},
    });
    expect(imported.ok).toBe(true);
    const deps = recorder({ git: 'real' });

    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });

    expect(existsSync(worktree)).toBe(false);
    expect(sh(repo, ['worktree', 'list', '--porcelain'])).not.toContain(canonicalWorktree);
    expect(await branchExists(repo, 'fixture/foreign-work')).toBe(true);
    expect(existsSync(bucket.source)).toBe(true);
    expect(existsSync(held)).toBe(true);
    expect(sh(bucket.source, ['worktree', 'list', '--porcelain'])).toContain(realpathSync(held));
    expect(listWorkspaces()).toEqual([]);
  });

  it("takes the folder and the record, and leaves the branch and its commits in the user's repository", async () => {
    useOwnWorkspaceRoot('imported');
    const repo = makeGitRepo({ name: 'remove-imported', seedFile: 'app.ts' }).path;
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    const added = await addWorktree({
      root: repo,
      worktreePath: worktree,
      branch: 'fixture/teal-skylark',
      startPoint: 'origin/main',
    });
    expect(added.ok).toBe(true);
    remember({ workspacePath: worktree, sourcePath: repo, sourceRepoRoot: repo });
    const deps = recorder({ git: 'real' });

    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });

    expect(existsSync(worktree)).toBe(false);
    expect(listWorkspaces()).toEqual([]);
    expect(await branchExists(repo, 'fixture/teal-skylark')).toBe(true);
    expect(sh(repo, ['worktree', 'list'])).not.toContain('teal-skylark');
    expect(deps.argv.some((args) => args[0] === 'branch')).toBe(false);
  });

  it('prunes a worktree git can no longer remove, and still asks for no branch deletion', async () => {
    useOwnWorkspaceRoot('imported-prune');
    const repo = makeGitRepo({ name: 'remove-prune', seedFile: 'app.ts' }).path;
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree, sourcePath: repo, sourceRepoRoot: repo });
    const deps = recorder({ worktreeRemoval: 'fails' });

    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });

    expect(deps.argv).toContainEqual(['worktree', 'prune']);
    expect(deps.argv.some((args) => args[0] === 'branch')).toBe(false);
    expect(existsSync(worktree)).toBe(false);
    expect(listWorkspaces()).toEqual([]);
  });

  it('leaves no registration behind when the whole folder goes at once', async () => {
    useOwnWorkspaceRoot('imported-batch-prune');
    const repo = makeGitRepo({ name: 'remove-batch-prune', seedFile: 'app.ts' }).path;
    const names = ['teal-skylark', 'amber-oriole', 'slate-dunlin'];
    const worktrees: string[] = [];
    for (const name of names) {
      const worktree = workspacePathFor('fixture/app', name);
      const added = await addWorktree({
        root: repo,
        worktreePath: worktree,
        branch: `fixture/${name}`,
        startPoint: 'origin/main',
      });
      expect(added.ok).toBe(true);
      remember({
        workspacePath: worktree,
        workspaceName: name,
        branchName: `fixture/${name}`,
        sourcePath: repo,
        sourceRepoRoot: repo,
      });
      // Gone from under Studio, which is what makes every sibling prunable at once.
      rmSync(worktree, { recursive: true, force: true });
      worktrees.push(worktree);
    }

    for (const worktree of worktrees) {
      const deps = recorder({ git: 'real' });

      expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });
    }

    const listed = sh(repo, ['worktree', 'list']);
    for (const name of names) expect(listed).not.toContain(name);
    expect(listWorkspaces()).toEqual([]);
  });

  it("still refuses to prune a worktree of the user's own that Studio does not know", async () => {
    useOwnWorkspaceRoot('imported-foreign-prune');
    const repo = makeGitRepo({ name: 'remove-foreign-prune', seedFile: 'app.ts' }).path;
    const theirs = join(repo, '..', 'remove-foreign-prune-theirs');
    const added = await addWorktree({
      root: repo,
      worktreePath: theirs,
      branch: 'theirs/work',
      startPoint: 'origin/main',
    });
    expect(added.ok).toBe(true);
    rmSync(theirs, { recursive: true, force: true });

    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree, sourcePath: repo, sourceRepoRoot: repo });
    // Real git reads the registrations; only the removal is forced to fail, which is what reaches the prune.
    const deps = recorder({ git: 'real', worktreeRemoval: 'fails' });

    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });

    expect(deps.argv).not.toContainEqual(['worktree', 'prune']);
    expect(sh(repo, ['worktree', 'list'])).toContain('remove-foreign-prune-theirs');
  });
});

describe('removing a project whose repository Studio holds', () => {
  it('does not trust held metadata when the recorded repository is outside the exact source path', async () => {
    useOwnWorkspaceRoot('duplicate-external-source');
    const bucket = heldBucket('blank/fixture', 'teal-skylark');
    const worktree = await heldProject(bucket, 'teal-skylark');
    const external = makeGitRepo({ name: 'remove-duplicate-external' }).path;
    const record = remember({
      workspacePath: worktree, workspaceName: 'teal-skylark', repoIdentity: 'blank/fixture',
      origin: 'duplicate', heldOrigin: 'blank', sourcePath: external, sourceRepoRoot: external,
    });
    expect(workspaceHeldOrigin(record)).toBeUndefined();
    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });
    expect(existsSync(join(external, '.git'))).toBe(true);
    expect(existsSync(bucket.source)).toBe(true);
    expect(existsSync(bucket.identityDir)).toBe(true);
  });

  for (const siblingState of ['registered-missing', 'unregistered-present'] as const) {
    it(`keeps a duplicate's held repository for a ${siblingState} sibling`, async () => {
      useOwnWorkspaceRoot(`duplicate-${siblingState}`);
      const bucket = heldBucket('copied/fixture', 'teal-skylark');
      const worktree = await heldProject(bucket, 'teal-skylark');
      const sibling = await heldProject(bucket, 'rose-finch');
      remember({
        workspacePath: worktree, workspaceName: 'teal-skylark', repoIdentity: 'copied/fixture',
        origin: 'duplicate', heldOrigin: 'copied', sourcePath: bucket.source, sourceRepoRoot: bucket.source,
      });
      if (siblingState === 'registered-missing') {
        remember({
          workspacePath: sibling, workspaceName: 'rose-finch', repoIdentity: 'copied/fixture',
          origin: 'duplicate', heldOrigin: 'copied', sourcePath: bucket.source, sourceRepoRoot: bucket.source,
        });
        rmSync(sibling, { recursive: true, force: true });
      }
      expect(await teardownProject(worktree, recorder({ git: 'real' }).deps)).toMatchObject({ ok: true });
      expect(existsSync(join(bucket.source, '.git'))).toBe(true);
      expect(existsSync(bucket.identityDir)).toBe(true);
    });
  }

  it('leaves a sibling project and the shared repository standing', async () => {
    const root = useOwnWorkspaceRoot('held-sibling');
    const bucket = heldBucket('blank/fixture', 'teal-skylark');
    const worktree = await heldProject(bucket, 'teal-skylark');
    const sibling = await heldProject(bucket, 'rose-finch');
    remember({
      workspacePath: worktree,
      workspaceName: 'teal-skylark',
      branchName: 'onlook/teal-skylark',
      origin: 'blank',
      repoIdentity: 'blank/fixture',
      sourcePath: bucket.source,
      sourceRepoRoot: bucket.source,
    });
    remember({
      workspacePath: sibling,
      workspaceName: 'rose-finch',
      branchName: 'onlook/rose-finch',
      origin: 'blank',
      repoIdentity: 'blank/fixture',
      sourcePath: bucket.source,
      sourceRepoRoot: bucket.source,
    });
    const deps = recorder({ git: 'real' });

    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });

    expect(existsSync(worktree)).toBe(false);
    expect(existsSync(sibling)).toBe(true);
    expect(existsSync(join(bucket.source, '.git'))).toBe(true);
    expect(deps.erased).toEqual([worktree]);
    expect(bucketsIn(root)).toHaveLength(1);
    expect(listWorkspaces().flatMap((w) => w.projects).map((p) => p.workspacePath)).toEqual([sibling]);
  });

  it('takes the whole bucket when it is the last project of its group', async () => {
    const root = useOwnWorkspaceRoot('held-last');
    const bucket = heldBucket('blank/fixture', 'teal-skylark');
    const worktree = await heldProject(bucket, 'teal-skylark');
    remember({
      workspacePath: worktree,
      workspaceName: 'teal-skylark',
      branchName: 'onlook/teal-skylark',
      origin: 'blank',
      repoIdentity: 'blank/fixture',
      sourcePath: bucket.source,
      sourceRepoRoot: bucket.source,
    });
    const deps = recorder({ git: 'real' });

    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });

    expect(existsSync(bucket.identityDir)).toBe(false);
    expect(bucketsIn(root)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
  });

  it('keeps the shared repository for a sibling that is registered but whose folder has gone', async () => {
    // The inverse window: the bucket reads empty on disk, yet a card still points into it.
    useOwnWorkspaceRoot('held-missing-sibling');
    const bucket = heldBucket('blank/fixture', 'teal-skylark');
    const worktree = await heldProject(bucket, 'teal-skylark');
    const sibling = await heldProject(bucket, 'rose-finch');
    for (const [path, name] of [[worktree, 'teal-skylark'], [sibling, 'rose-finch']] as const) {
      remember({
        workspacePath: path,
        workspaceName: name,
        branchName: `onlook/${name}`,
        origin: 'blank',
        repoIdentity: 'blank/fixture',
        sourcePath: bucket.source,
        sourceRepoRoot: bucket.source,
      });
    }
    // The sibling's card is still listed; only its folder is gone.
    rmSync(sibling, { recursive: true, force: true });

    expect(await teardownProject(worktree, recorder({ git: 'real' }).deps)).toMatchObject({ ok: true });

    expect(existsSync(worktree)).toBe(false);
    expect(existsSync(join(bucket.source, '.git'))).toBe(true);
    expect(listWorkspaces().flatMap((w) => w.projects).map((p) => p.workspacePath)).toEqual([sibling]);
  });

  it('keeps the shared repository when a sibling is cut but not yet remembered', async () => {
    // A second project's worktree lands in the bucket before `rememberProject`, so the
    // registry alone would call this project the group's last one (ONL-2315).
    useOwnWorkspaceRoot('held-mid-create');
    const bucket = heldBucket('blank/fixture', 'teal-skylark');
    const worktree = await heldProject(bucket, 'teal-skylark');
    remember({
      workspacePath: worktree,
      workspaceName: 'teal-skylark',
      branchName: 'onlook/teal-skylark',
      origin: 'blank',
      repoIdentity: 'blank/fixture',
      sourcePath: bucket.source,
      sourceRepoRoot: bucket.source,
    });
    const unregistered = await heldProject(bucket, 'rose-finch');
    expect(listWorkspaces().flatMap((w) => w.projects)).toHaveLength(1);

    expect(await teardownProject(worktree, recorder({ git: 'real' }).deps)).toMatchObject({ ok: true });

    expect(existsSync(worktree)).toBe(false);
    expect(existsSync(unregistered)).toBe(true);
    expect(existsSync(join(bucket.source, '.git'))).toBe(true);
  });
});

describe('what a Remove clears', () => {
  it('keeps legacy canvas image bytes readable and another project intact', async () => {
    const root = useOwnWorkspaceRoot('image-namespace-upgrade');
    const sourceRepoRoot = join(root, 'source');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    const sibling = workspacePathFor('fixture/app', 'rose-finch');
    for (const path of [sourceRepoRoot, worktree, sibling]) mkdirSync(path, { recursive: true });
    remember({ workspacePath: worktree, sourceRepoRoot });
    remember({ workspacePath: sibling, workspaceName: 'rose-finch', sourceRepoRoot });
    const bytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4]);
    const legacy = registerImage(sourceRepoRoot, bytes);
    const owned = registerImage(worktree, bytes);
    const independent = registerImage(sibling, bytes);
    if (!legacy.ok || !owned.ok || !independent.ok) throw new Error('image fixture registration refused');
    const storedRef = { id: legacy.image.id };
    expect(Array.from(readImage(storedRef.id)?.bytes ?? [])).toEqual(Array.from(bytes));

    resetImagesStore();
    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });

    expect(readImage(owned.image.id)).toBeNull();
    expect(Array.from(readImage(independent.image.id)?.bytes ?? [])).toEqual(Array.from(bytes));
    expect(existsSync(sibling)).toBe(true);
    expect(Array.from(readImage(storedRef.id)?.bytes ?? [])).toEqual(Array.from(bytes));
  });

  it('takes the canvas document, its log, the thumbnail, the camera and the image blobs', async () => {
    useOwnWorkspaceRoot('residue');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    const docId = canvasDocIdFor(worktree);
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath(docId), '{}');
    writeFileSync(canvasLogPath(docId), '[]');
    writeFileSync(thumbnailPath(docId), 'not really a png');
    writeCanvasCamera(docId, 'page_1', { x: 1, y: 2, zoom: 1 });
    writeCanvasCamera(docId, 'page_2', { x: 3, y: 4, zoom: 2 });
    const blobs = join(stateRoot(), 'image-blobs', workspaceHash(worktree));
    mkdirSync(blobs, { recursive: true });
    writeFileSync(join(blobs, 'blob'), 'bytes');
    // An artifact outlives the project it was drawn in, so it is not on this inventory (ONL-2568).
    const artifact = join(stateRoot(), 'artifacts', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
    mkdirSync(join(artifact, 'pages'), { recursive: true });
    writeFileSync(join(artifact, 'pages', 'index.html'), '<h1>the sketch</h1>');
    writeFileSync(join(artifact, 'manifest.json'), '{"id":"aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"}');
    // Resolved while the folder is still there: a deleted path canonicalises to a second key, and a read on that one finds nothing however the forget went.
    const settled = realpathSync(worktree);
    writeSidebarLayout(settled, { pagesHeight: 240 });

    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });

    // Same test as the deletions below: an artifact left standing cannot be read as a broken teardown.
    expect(readFileSync(join(artifact, 'pages', 'index.html'), 'utf8')).toBe('<h1>the sketch</h1>');
    expect(existsSync(join(artifact, 'manifest.json'))).toBe(true);

    expect(existsSync(canvasDocPath(docId))).toBe(false);
    expect(existsSync(canvasLogPath(docId))).toBe(false);
    expect(existsSync(thumbnailPath(docId))).toBe(false);
    // Every page's camera, not the one that was current (ONL-2488).
    expect(readCanvasCamera(docId, 'page_1')).toBeUndefined();
    expect(readCanvasCamera(docId, 'page_2')).toBeUndefined();
    expect(existsSync(blobs)).toBe(false);
    // Through the path resolved while the folder was there: a lookup on the post-delete form finds nothing either way.
    expect(knownCanvasDocId(settled)).toBeUndefined();
    // A new project can draw the same name twice, and would otherwise open on the removed one's split.
    expect(readSidebarLayout(settled)).toEqual({});
  });

  it('closes the hosts and stops the processes before it deletes, and forgets the record last', async () => {
    useOwnWorkspaceRoot('order');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    canvasDocIdFor(worktree);
    const deps = recorder();

    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });

    const at = (step: string): number => deps.order.indexOf(step);
    expect(at('close-server')).toBeGreaterThanOrEqual(0);
    expect(at('rm')).toBeGreaterThan(at('close-server'));
    expect(at('rm')).toBeGreaterThan(at('stop-starter'));
    expect(at('rm')).toBeGreaterThan(at('release-session'));
    expect(at('rm')).toBeGreaterThan(at('close-canvas'));
    expect(at('rm')).toBeGreaterThan(at('sweep'));
    expect(at('rm')).toBeGreaterThan(at('remove-worktree'));
    // The binding outlives the hosts: until the folder is gone the canvas is still the project's (ONL-2315).
    expect(deps.canvasBindingWhenClosed).toBeDefined();
    expect(deps.projectsListedWhenErasing).toBe(1);
    expect(listWorkspaces()).toEqual([]);
  });
});

describe('what outlives a project', () => {
  function plantArtifact(id: string): string {
    const dir = join(stateRoot(), 'artifacts', id);
    mkdirSync(join(dir, 'pages'), { recursive: true });
    writeFileSync(join(dir, 'pages', 'index.html'), `<h1>${id}</h1>`);
    return dir;
  }

  it('survives removing every project of a workspace, one card at a time', async () => {
    useOwnWorkspaceRoot('whole-workspace');
    const artifact = plantArtifact('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');

    const worktrees = ['teal-skylark', 'amber-finch'].map((name) => {
      const worktree = workspacePathFor('fixture/app', name);
      mkdirSync(worktree, { recursive: true });
      remember({ workspacePath: worktree, workspaceName: name });
      canvasDocIdFor(worktree);
      return worktree;
    });

    // There is no bulk remove: a whole workspace goes one `teardownProject` per project.
    for (const worktree of worktrees) {
      expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });
    }

    expect(listWorkspaces()).toEqual([]);
    expect(readFileSync(join(artifact, 'pages', 'index.html'), 'utf8')).toContain('aaaaaaaa');
  });

  it('survives the boot sweep, which walks the workspace root and never the state root', async () => {
    const root = useOwnWorkspaceRoot('boot-sweep');
    const artifact = plantArtifact('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb');
    const { BLANK_DIR_PREFIX } = await import('./naming.js');
    const { BLANK_MARKER_FILE } = await import('./blank.js');
    const identityDir = join(root, `${BLANK_DIR_PREFIX}unfinished`);
    const worktree = join(identityDir, 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    writeFileSync(
      join(identityDir, BLANK_MARKER_FILE),
      JSON.stringify({ repoIdentity: 'blank/x', workspacePath: worktree, branchName: 'main' }),
    );

    const { sweepBlankBuckets } = await import('./blank.js');
    // The sweep really ran, so the artifact standing is a scope result and not a no-op.
    expect(sweepBlankBuckets()).toEqual([identityDir]);

    expect(existsSync(identityDir)).toBe(false);
    expect(readFileSync(join(artifact, 'pages', 'index.html'), 'utf8')).toContain('bbbbbbbb');
    expect(bucketsIn(root)).toEqual([]);
  });
});

describe('a Remove that runs again', () => {
  it('forgets legacy setup by the registry key after the alias ancestor is gone while retaining raw cleanup paths', async () => {
    const root = useOwnWorkspaceRoot('gone-alias-setup');
    const external = makeWorkspaceRoot({ name: 'remove-alias-target' });
    const setupRoot = makeStateRoot({ name: 'remove-legacy-setup' });
    const target = join(external, 'target', 'project');
    const ancestor = join(root, 'aliases', 'ancestor');
    mkdirSync(target, { recursive: true });
    mkdirSync(ancestor, { recursive: true });
    symlinkSync(join(external, 'target'), join(ancestor, 'linked'));
    const aliased = join(ancestor, 'linked', 'project');
    const expectedKey = realpathSync.native(aliased);
    remember({ workspacePath: aliased });
    const saved = versionDefinition({ prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3000 }] });
    writeFileSync(join(setupRoot, 'project-setup.json'), JSON.stringify({ version: 1, data: { [expectedKey]: { saved, verified: null, failure: null, installFingerprint: null } } }));
    const setup = createSetupState(() => setupRoot);
    rmSync(join(root, 'aliases'), { recursive: true, force: true });
    rmSync(join(external, 'target'), { recursive: true, force: true });
    resetWorkspaceCache();
    expect(setup.read(aliased).saved).toBeNull();
    expect(setup.read(expectedKey).saved).toEqual(saved);
    const recorded = recorder();
    const forgotten: string[] = [];
    const legacyPaths: string[] = [];
    recorded.deps.forgetSetup = async (key) => { forgotten.push(key); setup.forget(key); };
    recorded.deps.closeServer = async (path) => { legacyPaths.push(path); };
    recorded.deps.stopStarter = async (path) => { legacyPaths.push(path); };
    recorded.deps.releaseSession = async (path) => { legacyPaths.push(path); };
    recorded.deps.closeCanvas = async (path) => { legacyPaths.push(path); };
    recorded.deps.sweep = async (path) => { legacyPaths.push(path); };
    expect(await teardownProject(aliased, recorded.deps)).toMatchObject({ ok: true });
    expect(forgotten).toEqual([expectedKey]);
    expect(setup.read(expectedKey).saved).toBeNull();
    expect(legacyPaths).toEqual(Array.from({ length: 5 }, () => aliased));
    expect(recorded.erased).toEqual([aliased]);
    expect(listWorkspaces()).toEqual([]);
  });

  it('finishes a project whose folder is already gone', async () => {
    useOwnWorkspaceRoot('already-gone');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    rmSync(worktree, { recursive: true, force: true });

    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });

    expect(listWorkspaces()).toEqual([]);
  });

  it('finds nothing left to do once the project is gone, and damages nothing', async () => {
    useOwnWorkspaceRoot('twice');
    const repo = makeGitRepo({ name: 'remove-twice', seedFile: 'app.ts' }).path;
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    const added = await addWorktree({
      root: repo,
      worktreePath: worktree,
      branch: 'fixture/teal-skylark',
      startPoint: 'origin/main',
    });
    expect(added.ok).toBe(true);
    remember({ workspacePath: worktree, sourcePath: repo, sourceRepoRoot: repo });
    expect(await teardownProject(worktree, recorder({ git: 'real' }).deps)).toMatchObject({ ok: true });

    const second = recorder({ git: 'real' });
    expect(await teardownProject(worktree, second.deps)).toEqual({ ok: false, reason: 'unknown-project' });

    expect(second.order).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
    expect(await branchExists(repo, 'fixture/teal-skylark')).toBe(true);
  });
});

describe('a Remove that cannot finish', () => {
  it('keeps the card when the folder will not go', async () => {
    useOwnWorkspaceRoot('rm-fails');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    const deps = recorder({ rm: 'throws' });

    const outcome = await teardownProject(worktree, deps.deps);

    expect(outcome).toEqual({ ok: false, reason: 'folder-remains', detail: expect.any(String) });
    expect(existsSync(worktree)).toBe(true);
    expect(listWorkspaces().flatMap((w) => w.projects)).toHaveLength(1);
  });
});

describe('the stores a Remove forgets', () => {
  it('does not reopen seals on an existing Project metadata refresh', () => {
    useOwnWorkspaceRoot('registration-metadata-refresh');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    forgetProjectState(worktree);
    remember({ workspacePath: worktree, sourceRepoName: 'refreshed' });
    rememberSession(worktree, 'still-stopped');
    writeComposerDraft(worktree, { text: 'still-stopped', images: [] });
    createServerEntry(worktree, { folder: worktree, port: 4321, ownership: 'agent-started' });
    expect(storedClaudeSession(worktree)).toBeUndefined();
    expect(readComposerDraft(worktree).text).toBe('');
    expect(serverBookEntries(worktree)).toEqual([]);
    forgetProject(worktree);
    remember({ workspacePath: worktree });
    rememberSession(worktree, 'fresh');
    writeComposerDraft(worktree, { text: 'fresh', images: [] });
    expect(storedClaudeSession(worktree)).toBe('fresh');
    expect(readComposerDraft(worktree).text).toBe('fresh');
  });

  it('reopens a deterministic copied bucket after rollback before it was ever registered', async () => {
    useOwnWorkspaceRoot('same-path-copy-rollback');
    const repoIdentity = 'copied/rollback-feedback';
    const bucket = blankBucketPaths(repoIdentity, 'teal-skylark');
    mkdirSync(bucket.source, { recursive: true });
    mkdirSync(bucket.worktree, { recursive: true });
    writeComposerDraft(bucket.worktree, { text: 'failed copy', images: [] });
    await rollbackBlank({ bucket, branchName: 'onlook/teal-skylark' });
    expect(existsSync(bucket.identityDir)).toBe(false);
    mkdirSync(bucket.source, { recursive: true });
    mkdirSync(bucket.worktree, { recursive: true });
    remember({ workspacePath: bucket.worktree, repoIdentity, sourceRepoRoot: bucket.source, origin: 'copied' });
    rememberSession(bucket.worktree, 'copied-session');
    writeComposerDraft(bucket.worktree, { text: 'second copy', images: [] });
    createServerEntry(bucket.worktree, { folder: bucket.worktree, port: 4321, ownership: 'agent-started' });
    expect(storedClaudeSession(bucket.worktree)).toBe('copied-session');
    expect(readComposerDraft(bucket.worktree).text).toBe('second copy');
    expect(serverBookEntries(bucket.worktree)).toHaveLength(1);
  });

  it('does not lift future-file protections when registering a fresh incarnation', async () => {
    const root = useOwnWorkspaceRoot('same-path-future-state');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    const canonical = realpathSync(worktree);
    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });
    const transcriptPath = transcriptFilePath(stateRoot(), canonical);
    const sidebarPath = join(root, 'sidebar-layout.json');
    const transcriptBytes = `{"version":99,"data":{"cwd":${JSON.stringify(canonical)},"byHarness":{}}}\n`;
    const sidebarBytes = '{"version":99,"data":{"futureSidebar":true}}\n';
    const previousSidebar = readFileSync(sidebarPath, 'utf8');
    mkdirSync(join(stateRoot(), 'transcripts'), { recursive: true });
    writeFileSync(transcriptPath, transcriptBytes);
    writeFileSync(sidebarPath, sidebarBytes);
    try {
      mkdirSync(worktree);
      remember({ workspacePath: worktree });
      writeSidebarLayout(worktree, { pagesHeight: 280 });
      writeTranscript(worktree, 'claude', [{ type: 'message.user', seq: 1, text: 'refused' } as never]);
      flushAllDomains();
      await expect(flushTranscripts()).rejects.toThrow();
      expect(readFileSync(transcriptPath, 'utf8')).toBe(transcriptBytes);
      expect(readFileSync(sidebarPath, 'utf8')).toBe(sidebarBytes);
    } finally {
      writeFileSync(sidebarPath, previousSidebar);
      writeFileSync(transcriptPath, JSON.stringify({ version: 1, data: { cwd: canonical, byHarness: {} } }));
      await flushTranscripts();
    }
  });

  it('registers a fresh incarnation through another spelling and reopens every path-owned store without a restart', async () => {
    const root = useOwnWorkspaceRoot('same-path-registration');
    const physicalRoot = join(root, 'physical');
    const aliasRoot = join(root, 'alias');
    mkdirSync(physicalRoot);
    symlinkSync(physicalRoot, aliasRoot);
    const worktree = join(aliasRoot, 'project');
    const sibling = join(physicalRoot, 'sibling');
    mkdirSync(worktree);
    mkdirSync(sibling);
    remember({ workspacePath: worktree });
    remember({ workspacePath: sibling, workspaceName: 'sibling' });
    const canonical = realpathSync(worktree);
    const oldDoc = canvasDocIdFor(worktree);
    const stoppedRows = [{ type: 'message.user', seq: 1, text: 'old producer' } as never];
    writeTranscript(worktree, 'claude', stoppedRows);
    writeTranscript(sibling, 'claude', [{ type: 'message.user', seq: 1, text: 'sibling' } as never]);
    writeComposerDraft(sibling, { text: 'sibling draft', images: [] });
    rememberSession(sibling, 'sibling-session');
    rememberAppServerThread(sibling, 'sibling-thread');
    rememberModelChoice(sibling, 'claude', 'sibling-model');
    writeSidebarLayout(sibling, { pagesHeight: 240 });
    writeGitStatusRow(sibling, fixtureRow(MEASUREMENT_FIXTURES['local-only']));
    createServerEntry(sibling, { folder: sibling, port: 4322, ownership: 'agent-started' });
    const siblingDoc = canvasDocIdFor(sibling);
    writeCanvasCamera(siblingDoc, 'page', { x: 5, y: 6, zoom: 3 });
    const imageBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const siblingImage = registerImage(sibling, imageBytes);
    expect(siblingImage.ok).toBe(true);
    const staleCapture = openCapture({ root: stateRoot(), cwd: worktree, threadId: 'registration-old', codexVersion: 'test' });
    const siblingCapture = openCapture({ root: stateRoot(), cwd: sibling, threadId: 'registration-sibling', codexVersion: 'test' });
    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });
    mkdirSync(worktree);
    remember({ workspacePath: canonical });

    for (const spelling of [worktree, canonical]) {
      rememberSession(spelling, 'new-claude');
      rememberAppServerThread(spelling, 'new-codex');
      writeComposerDraft(spelling, { text: 'new draft', images: [] });
      rememberModelChoice(spelling, 'claude', 'new-model');
      rememberModelChoice(spelling, 'appserver', 'new-codex-model');
      writeSidebarLayout(spelling, { pagesHeight: 280 });
      writeGitStatusRow(spelling, fixtureRow(MEASUREMENT_FIXTURES['local-only']));
      writeTranscript(spelling, 'claude', [{ type: 'message.user', seq: 1, text: 'new conversation' } as never]);
      writeTranscript(spelling, 'appserver', [{ type: 'message.user', seq: 1, text: 'new codex conversation' } as never]);
      const image = registerImage(spelling, imageBytes);
      expect(image.ok).toBe(true);
      if (image.ok) expect(readImage(image.image.id)).not.toBeNull();
    }
    createServerEntry(worktree, { folder: worktree, port: 4321, ownership: 'agent-started' });
    const tab = { workspacePath: worktree, repoIdentity: 'fixture/app' };
    const siblingTab = { workspacePath: sibling, repoIdentity: 'fixture/app' };
    setLocation({ kind: 'project', ...tab });
    writeWindows([{ tabs: [tab, siblingTab], active: { kind: 'tab', workspacePath: worktree } }]);
    const newDoc = canvasDocIdFor(worktree);
    expect(newDoc).not.toBe(oldDoc);
    writeCanvasCamera(newDoc, 'page', { x: 3, y: 4, zoom: 2 });
    writeCanvasCamera(oldDoc, 'page', { x: 99, y: 99, zoom: 9 });
    writeTranscript(worktree, 'claude', stoppedRows);
    const capture = openCapture({ root: stateRoot(), cwd: canonical, threadId: 'registration-old', codexVersion: 'test' });
    capture.write('in', { text: 'new owner' });
    const captureBytes = readFileSync(capture.path!, 'utf8');
    staleCapture.write('in', { text: 'stale owner' });
    expect(readFileSync(capture.path!, 'utf8')).toBe(captureBytes);
    expect(existsSync(siblingCapture.path!)).toBe(true);
    flushAllDomains();
    await flushTranscripts();

    expect(storedClaudeSession(worktree)).toBe('new-claude');
    expect(storedAppServerThread(canonical)).toBe('new-codex');
    expect(readComposerDraft(worktree).text).toBe('new draft');
    expect(readComposerDraft(sibling).text).toBe('sibling draft');
    expect(storedClaudeSession(sibling)).toBe('sibling-session');
    expect(storedAppServerThread(sibling)).toBe('sibling-thread');
    expect(preferenceFor(sibling, 'claude')?.model).toBe('sibling-model');
    expect(readSidebarLayout(sibling)).toEqual({ pagesHeight: 240 });
    expect(gitStatusRowFor(sibling)).toBeDefined();
    expect(serverBookEntries(sibling)).toHaveLength(1);
    expect(readCanvasCamera(siblingDoc, 'page')).toEqual({ x: 5, y: 6, zoom: 3 });
    if (siblingImage.ok) expect(readImage(siblingImage.image.id)?.bytes).toEqual(imageBytes);
    expect(preferenceFor(worktree, 'claude')?.model).toBe('new-model');
    expect(preferenceFor(canonical, 'appserver')?.model).toBe('new-codex-model');
    expect(readSidebarLayout(worktree)).toEqual({ pagesHeight: 280 });
    expect(gitStatusRowFor(worktree)).toBeDefined();
    expect(serverBookEntries(worktree)).toHaveLength(1);
    expect(readWindows()).toEqual([{ tabs: [tab, siblingTab], active: { kind: 'tab', workspacePath: worktree } }]);
    expect(readCanvasCamera(newDoc, 'page')).toEqual({ x: 3, y: 4, zoom: 2 });
    expect(readCanvasCamera(oldDoc, 'page')).toBeUndefined();
    expect(readTranscript(worktree, 'claude')[0]).toMatchObject({ text: 'new conversation' });
    expect(readTranscript(canonical, 'appserver')[0]).toMatchObject({ text: 'new codex conversation' });
    expect(readTranscript(sibling, 'claude')[0]).toMatchObject({ text: 'sibling' });
    expect(readFileSync(transcriptFilePath(stateRoot(), canonical), 'utf8')).toContain('new conversation');
  });

  it('allows removing and re-importing a linked worktree at its original path', async () => {
    const root = useOwnWorkspaceRoot('same-path-linked-import');
    const repo = makeGitRepo({ name: 'same-path-linked-import', seedFile: 'app.ts' }).path;
    const worktree = join(root, 'linked');
    const add = () => addWorktree({ root: repo, worktreePath: worktree, branch: 'fixture/linked', startPoint: 'origin/main' });
    expect((await add()).ok).toBe(true);
    const deps = { capture: () => {}, changed: () => {} };
    expect((await importWorktreeAt(worktree, 'picked', deps)).ok).toBe(true);
    rememberSession(worktree, 'old-session');
    expect(await teardownProject(worktree, recorder({ git: 'real' }).deps)).toMatchObject({ ok: true });
    expect((await addWorktree({ root: repo, worktreePath: worktree, branch: 'fixture/linked-again', startPoint: 'origin/main' })).ok).toBe(true);
    expect((await importWorktreeAt(worktree, 'picked', deps)).ok).toBe(true);
    rememberSession(worktree, 'new-session');
    writeComposerDraft(worktree, { text: 'new linked draft', images: [] });
    writeTranscript(worktree, 'claude', [{ type: 'message.user', seq: 1, text: 'new linked transcript' } as never]);
    await flushTranscripts();
    expect(storedClaudeSession(worktree)).toBe('new-session');
    expect(readComposerDraft(worktree).text).toBe('new linked draft');
    expect(readTranscript(worktree, 'claude')[0]).toMatchObject({ text: 'new linked transcript' });
  });

  it('forgets the saved location immediately while Projects home is active, preserving other tabs', async () => {
    useOwnWorkspaceRoot('location-removal');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    const sibling = workspacePathFor('fixture/app', 'amber-oriole');
    for (const path of [worktree, sibling]) {
      mkdirSync(path, { recursive: true });
      remember({ workspacePath: path });
    }
    const removedTab = { workspacePath: worktree, repoIdentity: 'fixture/app' };
    const keptTab = { workspacePath: sibling, repoIdentity: 'fixture/app' };
    setLocation({ kind: 'project', ...removedTab });
    writeWindows([{ tabs: [removedTab, keptTab], active: { kind: 'home' } }]);
    flushLocation();
    const locationPath = join(stateRoot(), 'location.json');
    expect(readFileSync(locationPath, 'utf8')).toContain(worktree);

    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });

    expect(JSON.parse(readFileSync(locationPath, 'utf8'))).toEqual({
      version: 2,
      data: { current: { kind: 'projects' }, windows: [{ tabs: [keptTab], active: { kind: 'home' } }] },
    });
    setLocation({ kind: 'project', ...removedTab });
    writeWindows([{ tabs: [removedTab, keptTab], active: { kind: 'tab', workspacePath: worktree } }]);
    flushAllDomains();
    expect(readFileSync(locationPath, 'utf8')).not.toContain(worktree);
    expect(readWindows()).toEqual([{ tabs: [keptTab], active: { kind: 'home' } }]);
    expect(existsSync(sibling)).toBe(true);
    expect(listWorkspaces().flatMap((workspace) => workspace.projects).map((project) => project.workspacePath)).toEqual([sibling]);
  });

  it('removes owned Codex captures and seals an already-open writer without removing a sibling', async () => {
    useOwnWorkspaceRoot('capture-removal');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    const sibling = workspacePathFor('fixture/app', 'amber-oriole');
    mkdirSync(worktree, { recursive: true });
    mkdirSync(sibling, { recursive: true });
    remember({ workspacePath: worktree });
    const capture = openCapture({ root: stateRoot(), cwd: worktree, threadId: 'removed-capture', codexVersion: 'test' });
    const kept = openCapture({ root: stateRoot(), cwd: sibling, threadId: 'kept-capture', codexVersion: 'test' });
    capture.write('in', { text: 'a frame' });
    expect(existsSync(capturePath(stateRoot(), 'removed-capture')!)).toBe(true);
    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });
    capture.write('in', { text: 'a late frame' });
    expect(existsSync(capturePath(stateRoot(), 'removed-capture')!)).toBe(false);
    expect(kept.path).toBeDefined();
    expect(existsSync(kept.path!)).toBe(true);
  });

  it('refuses removal before stopping hosts or erasing a newer capture', async () => {
    useOwnWorkspaceRoot('future-capture');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    const capture = openCapture({ root: stateRoot(), cwd: worktree, threadId: 'future-project-capture', codexVersion: 'test' });
    if (capture.path === undefined) throw new Error('expected a capture');
    const header = JSON.parse(readFileSync(capture.path, 'utf8').split('\n')[0]!) as Record<string, unknown>;
    const bytes = `${JSON.stringify({ ...header, mappingVersion: 99 })}\nfuture payload\n`;
    writeFileSync(capture.path, bytes);
    const deps = recorder();
    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: false });
    expect(deps.order).toEqual([]);
    expect(existsSync(worktree)).toBe(true);
    expect(readFileSync(capture.path, 'utf8')).toBe(bytes);
  });

  it('preflights newer sidebar state in the workspace root before removing a Project', async () => {
    const root = useOwnWorkspaceRoot('future-sidebar');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    const path = join(root, 'sidebar-layout.json');
    const bytes = '{"version":99,"data":{"futureLayout":true}}\n';
    writeFileSync(path, bytes);
    const deps = recorder();
    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: false });
    expect(deps.order).toEqual([]);
    expect(existsSync(worktree)).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('preflights newer location bytes before stopping hosts or removing a Project', async () => {
    useOwnWorkspaceRoot('future-location');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    setLocation({ kind: 'project', workspacePath: worktree, repoIdentity: 'fixture/app' });
    flushLocation();
    const path = join(stateRoot(), 'location.json');
    const previousBytes = readFileSync(path, 'utf8');
    const bytes = '{"version":99,"data":{"futureLocation":true}}\n';
    writeFileSync(path, bytes);
    try {
      const deps = recorder();
      expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: false });
      expect(deps.order).toEqual([]);
      expect(existsSync(worktree)).toBe(true);
      expect(readFileSync(path, 'utf8')).toBe(bytes);
    } finally {
      writeFileSync(path, previousBytes);
      resetLocationCache();
    }
  });

  it('preflights newer transcript recovery bytes before removing its Project folder', async () => {
    useOwnWorkspaceRoot('future-transcript-recovery');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    const path = `${transcriptFilePath(stateRoot(), realpathSync(worktree))}.corrupt-00000000-0000-0000-0000-000000000000`;
    mkdirSync(dirname(path), { recursive: true });
    const bytes = '{"version":99,"data":{"futureRecovery":true}}\n';
    writeFileSync(path, bytes);
    const deps = recorder();
    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: false });
    expect(deps.order).toEqual([]);
    expect(existsSync(worktree)).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('clears drafts, both Harness preferences, archived chats and git facts without touching a sibling or defaults', async () => {
    useOwnWorkspaceRoot('all-stores');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    const sibling = workspacePathFor('fixture/app', 'amber-oriole');
    for (const path of [worktree, sibling]) {
      mkdirSync(path, { recursive: true });
      remember({ workspacePath: path, workspaceName: path === worktree ? 'teal-skylark' : 'amber-oriole' });
      writeComposerDraft(path, { text: 'unsent text', images: [] });
      writeGitStatusRow(path, fixtureRow(MEASUREMENT_FIXTURES['local-only']));
      for (const harness of ['claude', 'appserver'] as const) {
        rememberModelChoice(path, harness, 'kept-model');
        archiveChat(path, harness, { sessionId: `archived-${harness}`, events: [{ seq: 1, type: 'message.user', text: 'kept' } as never] });
      }
    }
    rememberDefault('claude', { model: 'global-default' });
    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });
    writeComposerDraft(worktree, { text: 'a late renderer save', images: [] });
    writeGitStatusRow(worktree, fixtureRow(MEASUREMENT_FIXTURES['local-only']));
    writeSidebarLayout(worktree, { pagesHeight: 240 });
    rememberSession(worktree, 'a-late-session');
    createServerEntry(worktree, { folder: worktree, port: 4321, ownership: 'agent-started' });
    flushAllDomains();
    expect(readComposerDraft(worktree).text).toBe('');
    expect(gitStatusRowFor(worktree)).toBeUndefined();
    expect(readSidebarLayout(worktree)).toEqual({});
    expect(storedClaudeSession(worktree)).toBeUndefined();
    expect(serverBookEntries(worktree)).toEqual([]);
    for (const harness of ['claude', 'appserver'] as const) {
      expect(preferenceFor(worktree, harness)).toBeUndefined();
      expect(readArchivedChats(worktree, harness)).toEqual([]);
      expect(preferenceFor(sibling, harness)?.model).toBe('kept-model');
      expect(readArchivedChats(sibling, harness)).toHaveLength(1);
    }
    expect(readComposerDraft(sibling).text).toBe('unsent text');
    expect(gitStatusRowFor(sibling)).toBeDefined();
    expect(defaultPreference('claude').model).toBe('global-default');
  });

  it('keeps the chat and draft if erasing the folder fails', async () => {
    useOwnWorkspaceRoot('failed-folder-keeps-chat');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    writeTranscript(worktree, 'claude', [{ seq: 1, type: 'message.user', text: 'do not lose me' } as never]);
    writeComposerDraft(worktree, { text: 'unsent', images: [] });
    expect(await teardownProject(worktree, recorder({ rm: 'throws' }).deps)).toMatchObject({ ok: false });
    expect(readTranscript(worktree, 'claude')).toHaveLength(1);
    expect(readComposerDraft(worktree).text).toBe('unsent');
  });

  it('stops producers before erasing and clears saved state only after the folder goes', async () => {
    useOwnWorkspaceRoot('stores-order');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    createServerEntry(worktree, { folder: worktree, port: 4321, ownership: 'agent-started' });
    rememberSession(worktree, 'sdk-session-1');
    writeTranscript(worktree, 'claude', [{ seq: 1, type: 'message' } as never]);
    expect(serverBookEntries(worktree)).toHaveLength(1);
    expect(storedClaudeSession(worktree)).toBe('sdk-session-1');
    expect(readTranscript(worktree, 'claude')).toHaveLength(1);
    const deps = recorder({}, worktree);

    expect(await teardownProject(worktree, deps.deps)).toMatchObject({ ok: true });

    expect(deps.storesWhenErasing).toEqual({ book: 1, session: true, transcript: 1 });
    expect(serverBookEntries(worktree)).toHaveLength(0);
    expect(storedClaudeSession(worktree)).toBeUndefined();
    expect(readTranscript(worktree, 'claude')).toHaveLength(0);
  });
});

describe('a teardown step that rejects', () => {
  it('reports a failure, and leaves the card its canvas so the project is whole', async () => {
    useOwnWorkspaceRoot('step-rejects');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree });
    const docId = canvasDocIdFor(worktree);
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(canvasDocPath(docId), '{}');
    writeFileSync(canvasLogPath(docId), '[]');
    const deps = recorder();
    deps.deps.releaseSession = () => Promise.reject(new Error('the session would not let go'));

    const outcome = await teardownProject(worktree, deps.deps);

    expect(outcome).toEqual({
      ok: false,
      reason: 'folder-remains',
      detail: 'Error: the session would not let go',
    });
    // The card stays, so a second Remove can finish the job.
    expect(listWorkspaces().flatMap((w) => w.projects)).toHaveLength(1);
    expect(existsSync(worktree)).toBe(true);
    // Nothing deletes the canvas until the folder has actually gone (ONL-2315).
    expect(existsSync(canvasDocPath(docId))).toBe(true);
    expect(existsSync(canvasLogPath(docId))).toBe(true);
    expect(knownCanvasDocId(worktree)).toBe(docId);
  });
});

describe('the group a last project leaves', () => {
  it('lets the same repository come back unarchived and unnamed', async () => {
    const root = useOwnWorkspaceRoot('group');
    const worktree = workspacePathFor('fixture/app', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    remember({ workspacePath: worktree, sourceRepoRoot: join(root, 'checkout') });
    renameWorkspace('fixture/app', 'My Repo');
    setWorkspaceArchived('fixture/app', true);
    expect(listWorkspaces()[0]).toMatchObject({ archived: true, name: 'My Repo' });

    expect(await teardownProject(worktree, recorder().deps)).toMatchObject({ ok: true });
    const returning = workspacePathFor('fixture/app', 'rose-finch');
    mkdirSync(returning, { recursive: true });
    remember({
      workspacePath: returning,
      workspaceName: 'rose-finch',
      sourceRepoRoot: join(root, 'checkout'),
    });

    const [group] = listWorkspaces();
    expect(group?.archived).toBe(false);
    expect(group?.name).toBe('checkout');
  });
});
