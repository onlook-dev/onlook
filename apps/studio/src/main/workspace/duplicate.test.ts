import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';
import { cleanupTempFixtures, gitOutput as sh, makeGitRepo, makeStateRoot, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import type { CanvasDoc, HeldOrigin, ProjectCreateState, WorkspaceCreated } from '@studio/events';
import { workspaceHash } from '../lib/canonical-path.js';
import { stateRoot } from '../state/root.js';
import { readTranscript, resetTranscriptCache } from '../agent-host/transcript.js';
import { readCanvasCamera, readStoredCurrentPage, resetCanvasCameraCache, writeCanvasCamera, writeCurrentPage } from '../canvas/camera.js';
import { emptyCanvasDoc } from '../canvas/document.js';
import { canvasDocPath } from '../canvas/dir.js';
import { createFsDocumentStore, readExistingCanvasDoc } from '../canvas/fs-backend.js';
import { createCanvasHost } from '../canvas/index.js';
import { knownCanvasDocId, rebindCanvasDoc, resetCanvasRegistryCache } from '../canvas/registry.js';
import { readImage, registerImage, resetImagesStore } from '../images/store.js';
import { createServerEntry, entryForFolder, moveServerEntryPort, removeServerEntry, serverBookEntries } from '../server/book.js';
import { createCancelToken } from './cancel.js';
import { createProject, placeFirstFrame, type ProjectCreateDeps, type ProjectCreateResume } from './create-project.js';
import { completeDuplicateRegistration, fabricateDuplicate, planDuplicate, rollbackDuplicate } from './duplicate.js';
import { awaitStartOutcome, noteSetupReport, resetSetupSignals } from './setup-signals.js';
import { knownProject, listWorkspaces, rememberProject, resetWorkspaceCache, setProjectArchived, setWorkspaceArchived, workspacePathFor } from './store.js';
import { addWorktree, captureDiskSnapshot, materializeDiskSnapshot, removeWorktree } from './git.js';
import { nextCopyName } from './naming.js';
import { blankBucketPaths } from './blank.js';
import { fabricateFromPlan, planWorkspace, rollbackFromPlan } from './index.js';
import { teardownProject, type RemoveProjectDeps } from './remove.js';
import { workspaceHeldOrigin } from './store.js';
import { removeConfirmFor, workspaceRemoveConfirmFor } from './remove-confirm.js';

setDefaultTimeout(30_000);
const previousStateRoot = process.env['STUDIO_STATE_ROOT'];

afterEach(() => {
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetCanvasCameraCache();
  resetTranscriptCache();
  resetImagesStore();
  resetSetupSignals();
  if (previousStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = previousStateRoot;
  restoreWorkspaceRoot();
});

afterAll(() => cleanupTempFixtures());

describe('Make a copy disk snapshot (ONL-2515)', () => {
  it('freezes staged, unstaged, untracked, deleted, binary and executable disk state without changing the source', async () => {
    const { path: source, root } = makeGitRepo({ name: 'duplicate-disk', seedFile: 'app.ts', seedContent: 'original\n' });
    writeFileSync(join(source, 'deleted.txt'), 'delete me\n');
    writeFileSync(join(source, 'binary.dat'), Buffer.from([0, 1, 2, 255]));
    writeFileSync(join(source, 'script.sh'), 'echo original\n');
    writeFileSync(join(source, '.gitignore'), 'node_modules/\n.env.local\n');
    sh(source, ['add', '.']);
    sh(source, ['commit', '--quiet', '-m', 'snapshot fixture']);
    writeFileSync(join(source, 'app.ts'), 'staged\n');
    writeFileSync(join(source, 'added.txt'), 'staged addition\n');
    writeFileSync(join(source, 'newly-ignored.txt'), 'staged but newly ignored\n');
    sh(source, ['add', 'app.ts', 'added.txt', 'newly-ignored.txt']);
    sh(source, ['config', 'core.trustctime', 'false']);
    sh(source, ['config', 'core.checkStat', 'minimal']);
    const stagedAddedStat = statSync(join(source, 'added.txt'));
    writeFileSync(join(source, '.gitignore'), 'node_modules/\n.env.local\nnewly-ignored.txt\n');
    writeFileSync(join(source, 'app.ts'), 'disk wins\n');
    writeFileSync(join(source, 'added.txt'), 'added disk wins\n');
    utimesSync(join(source, 'added.txt'), stagedAddedStat.atime, stagedAddedStat.mtime);
    writeFileSync(join(source, 'new file.txt'), 'untracked\n');
    writeFileSync(join(source, 'binary.dat'), Buffer.from([0, 255, 17, 0]));
    chmodSync(join(source, 'script.sh'), 0o755);
    rmSync(join(source, 'deleted.txt'));
    writeFileSync(join(source, '.env.local'), 'FIXTURE_SECRET=local\n');
    const head = sh(source, ['rev-parse', 'HEAD']);
    const branch = sh(source, ['branch', '--show-current']);
    const indexPath = sh(source, ['rev-parse', '--git-path', 'index']);
    const indexBefore = readFileSync(join(source, indexPath));
    const statusBefore = sh(source, ['--no-optional-locks', 'status', '--porcelain=v1']);
    const stashBefore = sh(source, ['stash', 'list']);

    const snapshot = await captureDiskSnapshot(source);

    expect(snapshot.head).toBe(head);
    expect(sh(source, ['rev-parse', 'HEAD'])).toBe(head);
    expect(sh(source, ['branch', '--show-current'])).toBe(branch);
    expect(readFileSync(join(source, indexPath))).toEqual(indexBefore);
    expect(sh(source, ['--no-optional-locks', 'status', '--porcelain=v1'])).toBe(statusBefore);
    expect(sh(source, ['stash', 'list'])).toBe(stashBefore);
    expect(readFileSync(join(source, 'app.ts'), 'utf8')).toBe('disk wins\n');

    writeFileSync(join(source, 'app.ts'), 'later agent edit\n');
    writeFileSync(join(source, 'new file.txt'), 'later edit\n');
    const destination = join(root, 'copy');
    expect((await addWorktree({ root: source, worktreePath: destination, branch: 'fixture/copy', startPoint: snapshot.head })).ok).toBe(true);
    await materializeDiskSnapshot(destination, snapshot);

    expect(readFileSync(join(destination, 'app.ts'), 'utf8')).toBe('disk wins\n');
    expect(readFileSync(join(destination, 'added.txt'), 'utf8')).toBe('added disk wins\n');
    expect(readFileSync(join(destination, 'newly-ignored.txt'), 'utf8')).toBe('staged but newly ignored\n');
    expect(readFileSync(join(destination, 'new file.txt'), 'utf8')).toBe('untracked\n');
    expect(readFileSync(join(destination, 'binary.dat'))).toEqual(Buffer.from([0, 255, 17, 0]));
    expect(statSync(join(destination, 'script.sh')).mode & 0o111).not.toBe(0);
    expect(existsSync(join(destination, 'deleted.txt'))).toBe(false);
    expect(existsSync(join(destination, '.env.local'))).toBe(false);
    expect(sh(destination, ['rev-parse', 'HEAD'])).toBe(head);
    expect(sh(destination, ['branch', '--show-current'])).toBe('fixture/copy');
    expect(sh(destination, ['diff', '--cached', '--name-only'])).toBe('');
    expect(sh(destination, ['--no-optional-locks', 'status', '--porcelain=v1'])).toContain('?? added.txt');
    expect(sh(source, ['rev-parse', 'HEAD'])).toBe(head);
    expect(readFileSync(join(source, indexPath))).toEqual(indexBefore);
    expect(readFileSync(join(source, 'app.ts'), 'utf8')).toBe('later agent edit\n');
  });
});

describe('Finder copy names (ONL-2515)', () => {
  it('allocates successive copies and copies of copies without stacking suffixes', () => {
    expect(nextCopyName('Landing', [])).toBe('Landing copy');
    expect(nextCopyName('Landing', ['Landing copy'])).toBe('Landing copy 2');
    expect(nextCopyName('Landing copy', ['Landing copy', 'Landing copy 2'])).toBe('Landing copy 3');
    expect(nextCopyName('Landing copy 2', ['Landing copy', 'Landing copy 2', 'Landing copy 3'])).toBe('Landing copy 4');
  });
});

async function sourceProject(name: string, comfort: 'design' | 'experiment' = 'experiment', heldOrigin?: HeldOrigin): Promise<WorkspaceCreated> {
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: `duplicate-${name}` });
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: `duplicate-${name}` });
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetCanvasCameraCache();
  const repoOptions = { name: `duplicate-${name}`, seedFile: 'app.ts', seedContent: 'original\n' };
  const repo = heldOrigin === undefined
    ? makeGitRepo({ ...repoOptions, remote: true })
    : makeGitRepo({ ...repoOptions, remote: false });
  const repoIdentity = heldOrigin === undefined ? 'fixture/duplicate' : `${heldOrigin}/duplicate`;
  const workspaceName = heldOrigin === undefined ? 'source' : 'original';
  if (heldOrigin !== undefined) {
    const bucket = blankBucketPaths(repoIdentity, workspaceName);
    mkdirSync(bucket.identityDir, { recursive: true });
    renameSync(repo.path, bucket.source);
    repo.path = bucket.source;
  }
  writeFileSync(join(repo.path, '.gitignore'), '.env.local\nnode_modules/\n');
  sh(repo.path, ['add', '.gitignore']);
  sh(repo.path, ['commit', '--quiet', '-m', 'fixture environment ignore']);
  const workspacePath = workspacePathFor(repoIdentity, workspaceName);
  mkdirSync(join(workspacePath, '..'), { recursive: true });
  expect((await addWorktree({ root: repo.path, worktreePath: workspacePath, branch: 'fixture/source', startPoint: 'HEAD' })).ok).toBe(true);
  writeFileSync(join(workspacePath, 'app.ts'), 'current design\n');
  writeFileSync(join(workspacePath, '.env.local'), 'FIXTURE_ONLY=copy-me\n');
  mkdirSync(join(workspacePath, 'node_modules'), { recursive: true });
  writeFileSync(join(workspacePath, 'node_modules', 'do-not-copy.txt'), 'dependency\n');
  const source: WorkspaceCreated = {
    workspacePath, workspaceName, branchName: 'fixture/source', baseBranch: 'main',
    sourceRepoName: 'Fixture App', sourcePath: repo.path, sourceRepoRoot: repo.path,
    repoIdentity, ...(heldOrigin === undefined ? {} : { origin: heldOrigin }), displayName: 'Landing', displayNameSource: 'user',
    copiedEnvFiles: [], comfort,
  };
  rememberProject(source);
  createServerEntry(workspacePath, { folder: workspacePath, port: 4317, ownership: 'agent-started' });
  const doc = emptyCanvasDoc('source-doc');
  doc.revision = 7;
  doc.pages = { home: { id: 'home', name: 'Home', order: 0 }, details: { id: 'details', name: 'Details', order: 1 } };
  doc.nodes = {
    home: { id: 'home', pageId: 'home', kind: 'browser', name: 'Home', x: 0, y: 0, width: 1280, height: 800, order: 0, content: { homeUrl: 'http://localhost:4317/' } },
    details: { id: 'details', pageId: 'details', kind: 'browser', name: 'Details', x: 40, y: 80, width: 640, height: 480, order: 0, content: { homeUrl: 'http://localhost:4317/products?sort=new#details' } },
  };
  await createFsDocumentStore().persist(doc);
  rebindCanvasDoc(workspacePath, doc.docId);
  writeCanvasCamera(doc.docId, 'details', { x: 12, y: 34, zoom: 0.7 });
  writeCurrentPage(doc.docId, 'details');
  return source;
}

function creationRecorder() {
  const calls: string[] = [];
  const states: ProjectCreateState[] = [];
  const canvas = createCanvasHost({ store: createFsDocumentStore(), emitUpdate: () => {}, emitRejection: () => {}, markDirty: () => {} });
  const deps: ProjectCreateDeps = {
    plan: async (sourcePath) => { calls.push('snapshot'); return planDuplicate(sourcePath); },
    fabricate: async (plan) => { calls.push('fabricate'); return fabricateDuplicate(plan); },
    rollback: rollbackDuplicate,
    register: (workspace) => {
      calls.push('register');
      const docId = knownCanvasDocId(workspace.workspacePath);
      if (docId === undefined) throw new Error('Canvas must be bound before registration');
      expect(Object.values(readExistingCanvasDoc(docId).nodes).every((node) => node.kind !== 'browser' || node.content.homeUrl === 'about:blank')).toBe(true);
      rememberProject(workspace);
      completeDuplicateRegistration(workspace.workspacePath);
    },
    capture: () => {},
    startSession: async (cwd) => {
      calls.push('session');
      expect(readTranscript(cwd, 'claude')).toEqual([]);
      await canvas.open(cwd);
    },
    install: async (cwd) => { calls.push(`install:${cwd}`); return { outcome: 'installed', manager: 'bun' }; },
    awaitIdle: async () => 'idle',
    detect: async () => ({ asks: [] }),
    awaitOpen: async () => 'open',
    awaitStart: awaitStartOutcome,
    sendStartIntent: async (cwd) => { calls.push(`start:${cwd}`); await noteSetupReport(cwd, 5182); return true; },
    authorFrame: (cwd, port) => placeFirstFrame((resolve) => canvas.apply('system', resolve, cwd), port),
    awaitRunning: async () => 'running',
    emit: (state) => { if (state !== null) states.push(state); },
  };
  return { calls, states, canvas, deps, dispose: async () => { await canvas.flushAll(); canvas.discard(); } };
}

function createdWorkspace(state: ProjectCreateState): WorkspaceCreated {
  if (state.kind !== 'ready' && state.kind !== 'live') throw new Error(`expected created copy, got ${JSON.stringify(state)}`);
  return state.workspace;
}

describe('Make a copy creation lifecycle (ONL-2515)', () => {
  it('copies a project whose saved branch name is missing', async () => {
    const source = await sourceProject('missing-branch', 'design');
    const { branchName: _branchName, ...withoutBranch } = source;
    rememberProject(withoutBranch as WorkspaceCreated);
    const plan = await planDuplicate(source.workspacePath);
    expect(plan.kind).toBe('ready');
    if (plan.kind !== 'ready') throw new Error('expected a copy plan');
    expect(plan.branchName).toBe(`onlook/${plan.workspaceName}`);
    await rollbackDuplicate(plan);
  });

  it.each(['nested-app', 'unknown-app', 'ambiguous-app'] as const)('uses authoritative claims rather than inferring the %s port from Frames', async (kind) => {
    const source = await sourceProject(kind, 'design');
    const claim = entryForFolder(source.workspacePath, source.workspacePath);
    if (claim === undefined) throw new Error('expected fixture claim');
    removeServerEntry(source.workspacePath, claim.id);
    if (kind === 'nested-app') createServerEntry(source.workspacePath, { folder: join(source.workspacePath, 'apps', 'web'), port: 4317, ownership: 'agent-started' });
    if (kind === 'ambiguous-app') {
      createServerEntry(source.workspacePath, { folder: join(source.workspacePath, 'apps', 'web'), port: 4317, ownership: 'agent-started' });
      createServerEntry(source.workspacePath, { folder: join(source.workspacePath, 'apps', 'docs'), port: 6006, ownership: 'users-own' });
    }
    const plan = await planDuplicate(source.workspacePath);
    if (plan.kind !== 'ready') throw new Error('expected copy plan');
    const result = await fabricateDuplicate(plan);
    if (!result.ok) throw new Error(result.reason);
    const docId = knownCanvasDocId(plan.workspacePath);
    if (docId === undefined) throw new Error('expected copied Canvas');
    const frames = Object.values(readExistingCanvasDoc(docId).nodes).filter((node) => node.kind === 'browser');
    expect(frames.map((node) => node.content.homeUrl).sort()).toEqual(kind === 'nested-app' ? ['about:blank', 'about:blank'] : ['http://localhost:4317/', 'http://localhost:4317/products?sort=new#details']);
    expect(frames.every((node) => node.content.pendingHomeUrl !== undefined)).toBe(kind === 'nested-app');
    await rollbackDuplicate(plan);
  });

  it('freezes the claimed app port at planning and leaves another local service unchanged', async () => {
    const source = await sourceProject('mixed-ports', 'design');
    const sourceDoc = readExistingCanvasDoc('source-doc');
    sourceDoc.nodes.storybook = {
      id: 'storybook', pageId: 'home', kind: 'browser', name: 'Storybook', x: 1400, y: 0, width: 640, height: 480, order: 2,
      content: { homeUrl: 'http://localhost:6006/?path=/story/button#preview' },
    };
    await createFsDocumentStore().persist(sourceDoc);
    createServerEntry(source.workspacePath, { folder: join(source.workspacePath, 'storybook'), port: 6006, ownership: 'users-own' });
    const plan = await planDuplicate(source.workspacePath);
    if (plan.kind !== 'ready') throw new Error('expected copy plan');
    const claim = entryForFolder(source.workspacePath, source.workspacePath);
    if (claim === undefined) throw new Error('expected source app claim');
    moveServerEntryPort(source.workspacePath, claim.id, { from: 4317, to: 4999 });

    const result = await fabricateDuplicate(plan);

    if (!result.ok) throw new Error(result.reason);
    const docId = knownCanvasDocId(plan.workspacePath);
    if (docId === undefined) throw new Error('expected copied Canvas');
    const frames = Object.values(readExistingCanvasDoc(docId).nodes).filter((node) => node.kind === 'browser');
    expect(frames.filter((node) => node.content.pendingHomeUrl?.includes(':4317')).map((node) => node.content.homeUrl)).toEqual(['about:blank', 'about:blank']);
    expect(frames.find((node) => node.name === 'Storybook')?.content).toEqual({ homeUrl: 'http://localhost:6006/?path=/story/button#preview' });
    expect(readExistingCanvasDoc('source-doc').nodes).toEqual(sourceDoc.nodes);
    await rollbackDuplicate(plan);
  });

  it('leaves an unreadable archived source document untouched instead of minting a replacement', async () => {
    const source = await sourceProject('unreadable-canvas', 'design');
    setProjectArchived(source.workspacePath, true);
    const path = canvasDocPath('source-doc');
    const originalBytes = '{unreadable archived canvas';
    writeFileSync(path, originalBytes);

    await expect(planDuplicate(source.workspacePath)).rejects.toThrow();

    expect(readFileSync(path, 'utf8')).toBe(originalBytes);
    expect(knownCanvasDocId(source.workspacePath)).toBe('source-doc');
    expect(knownProject(source.workspacePath)?.archivedAt).toBeDefined();
    expect(listWorkspaces()[0]?.projects).toHaveLength(1);
    expect(readFileSync(join(source.workspacePath, 'app.ts'), 'utf8')).toBe('current design\n');
  });

  it('activates a copy of an archived Design Project and Workspace without restoring or starting the original', async () => {
    const source = await sourceProject('archived-design', 'design');
    setProjectArchived(source.workspacePath, true);
    setWorkspaceArchived(source.repoIdentity, true);
    const recorder = creationRecorder();
    const state = await createProject({ sourcePath: source.workspacePath, duplicateSourceName: 'Landing', comfort: 'design', entryPoint: 'projects' }, recorder.deps);
    const copy = createdWorkspace(state);
    expect(state.kind).toBe('ready');
    expect(copy.origin).toBe('duplicate');
    expect(copy.repoIdentity).toBe(source.repoIdentity);
    expect(copy.displayName).toBe('Landing copy');
    expect(copy.displayNameSource).toBe('provisional');
    expect(copy.comfort).toBe('design');
    expect(copy.workspacePath).not.toBe(source.workspacePath);
    expect(copy.branchName).not.toBe(source.branchName);
    expect(knownProject(source.workspacePath)?.archivedAt).toBeDefined();
    expect(knownProject(copy.workspacePath)?.archivedAt).toBeUndefined();
    expect(listWorkspaces()[0]?.archived).toBe(false);
    expect(recorder.calls).toEqual(['snapshot', 'fabricate', 'register', 'session']);
    expect(copy.copiedEnvFiles).toEqual(['.env.local']);
    expect(readFileSync(join(copy.workspacePath, '.env.local'), 'utf8')).toBe('FIXTURE_ONLY=copy-me\n');
    expect(existsSync(join(copy.workspacePath, 'node_modules'))).toBe(false);
    const docId = knownCanvasDocId(copy.workspacePath);
    if (docId === undefined) throw new Error('expected copy document');
    const doc = readExistingCanvasDoc(docId);
    expect(Object.values(doc.nodes).every((node) => node.kind !== 'browser' || node.content.homeUrl === 'about:blank')).toBe(true);
    const details = Object.values(doc.pages).find((page) => page.name === 'Details');
    if (details === undefined) throw new Error('expected copied Details page');
    expect(readStoredCurrentPage(docId)).toBe(details.id);
    expect(readCanvasCamera(docId, details.id)).toEqual({ x: 12, y: 34, zoom: 0.7 });
    expect(await createFsDocumentStore().readHistory(docId)).toEqual([]);
    resetCanvasRegistryCache();
    expect(knownCanvasDocId(copy.workspacePath)).toBe(docId);
    expect(readExistingCanvasDoc(docId).nodes).toEqual(doc.nodes);
    expect(serverBookEntries(copy.workspacePath)).toEqual([]);
    await recorder.dispose();
  });

  it('uses New Project install/start and rebinds all copied routes without adding a replacement Frame', async () => {
    const source = await sourceProject('interact');
    const recorder = creationRecorder();
    const state = await createProject({ sourcePath: source.workspacePath, duplicateSourceName: 'Landing', comfort: 'experiment', entryPoint: 'projects' }, recorder.deps);
    const copy = createdWorkspace(state);
    expect(state.kind).toBe('live');
    expect(recorder.calls).toContain(`install:${copy.workspacePath}`);
    expect(recorder.calls).toContain(`start:${copy.workspacePath}`);
    expect(recorder.calls).not.toContain(`install:${source.workspacePath}`);
    const doc = (await recorder.canvas.snapshotFor(copy.workspacePath)).doc;
    if (doc === null) throw new Error('expected open copy document');
    const frames = Object.values(doc.nodes).filter((node) => node.kind === 'browser');
    expect(frames).toHaveLength(2);
    expect(frames.map((node) => node.content.homeUrl).sort()).toEqual(['http://localhost:5182/', 'http://localhost:5182/products?sort=new#details']);
    expect(frames.every((node) => node.content.pendingHomeUrl === undefined)).toBe(true);
    expect(readExistingCanvasDoc('source-doc').nodes.details?.kind).toBe('browser');
    expect(sh(source.workspacePath, ['branch', '--show-current'])).toBe('fixture/source');
    await recorder.dispose();
  });

  it('resumes a failed installation without taking another snapshot or fabricating another Project', async () => {
    const source = await sourceProject('retry');
    const recorder = creationRecorder();
    const request = { sourcePath: source.workspacePath, duplicateSourceName: 'Landing', comfort: 'experiment' as const, entryPoint: 'projects' as const };
    const failed = await createProject(request, { ...recorder.deps, install: async () => ({ outcome: 'failed', manager: 'bun', detail: 'fixture install failure' }) });
    if (failed.kind !== 'failed' || failed.workspace === undefined) throw new Error('expected registered install failure');
    writeFileSync(join(source.workspacePath, 'app.ts'), 'later source edit\n');
    const resume: ProjectCreateResume = { phase: 'installing', workspace: failed.workspace };
    const state = await createProject(request, recorder.deps, createCancelToken(), resume);
    expect(createdWorkspace(state).workspacePath).toBe(failed.workspace.workspacePath);
    expect(recorder.calls.filter((call) => call === 'snapshot')).toHaveLength(1);
    expect(recorder.calls.filter((call) => call === 'fabricate')).toHaveLength(1);
    expect(readFileSync(join(failed.workspace.workspacePath, 'app.ts'), 'utf8')).toBe('current design\n');
    await recorder.dispose();
  });

  it('allocates concurrent copies and a copy of a copy to distinct branches, folders and Finder names', async () => {
    const source = await sourceProject('concurrent', 'design');
    const plans = await Promise.all([planDuplicate(source.workspacePath), planDuplicate(source.workspacePath)]);
    const copies: WorkspaceCreated[] = [];
    for (const plan of plans) {
      if (plan.kind !== 'ready') throw new Error('expected copy plan');
      const result = await fabricateDuplicate(plan);
      if (!result.ok) throw new Error('expected fabricated copy');
      rememberProject(result.workspace);
      completeDuplicateRegistration(result.workspace.workspacePath);
      copies.push(result.workspace);
    }
    expect(copies.map((copy) => copy.displayName)).toEqual(['Landing copy', 'Landing copy 2']);
    expect(new Set(copies.map((copy) => copy.workspacePath)).size).toBe(2);
    expect(new Set(copies.map((copy) => copy.branchName)).size).toBe(2);
    const plan = await planDuplicate(copies[0]?.workspacePath ?? '');
    if (plan.kind !== 'ready') throw new Error('expected copy-of-copy plan');
    const result = await fabricateDuplicate(plan);
    if (!result.ok) throw new Error('expected copy of copy');
    expect(result.workspace.displayName).toBe('Landing copy 3');
    await rollbackDuplicate(plan);
  });

  it('cancels after fabrication with destination-only cleanup and no leaked registration', async () => {
    const source = await sourceProject('cancel', 'design');
    const recorder = creationRecorder();
    const token = createCancelToken();
    let destination = '';
    const state = await createProject({ sourcePath: source.workspacePath, duplicateSourceName: 'Landing', comfort: 'design', entryPoint: 'projects' }, {
      ...recorder.deps,
      fabricate: async (plan) => {
        destination = plan.workspacePath;
        const result = await fabricateDuplicate(plan);
        token.cancel();
        return result;
      },
    }, token);
    expect(state.kind).toBe('canceled');
    expect(existsSync(destination)).toBe(false);
    expect(knownProject(destination)).toBeUndefined();
    expect(knownCanvasDocId(destination)).toBeUndefined();
    expect(existsSync(source.sourceRepoRoot)).toBe(true);
    expect(existsSync(source.workspacePath)).toBe(true);
    expect(readFileSync(join(source.workspacePath, 'app.ts'), 'utf8')).toBe('current design\n');
    expect(listWorkspaces()[0]?.projects).toHaveLength(1);
    await recorder.dispose();
  });

  it('rejects unregistered and missing sources and rolls back a failed image clone without deleting siblings', async () => {
    const source = await sourceProject('image-failure', 'design');
    await expect(planDuplicate(source.sourceRepoRoot)).rejects.toThrow('Choose a Project');
    const image = registerImage(source.workspacePath, new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), { allowSvg: true });
    if (!image.ok) throw new Error('expected fixture image');
    const doc: CanvasDoc = readExistingCanvasDoc('source-doc');
    doc.nodes.firstImage = { id: 'firstImage', pageId: 'details', kind: 'image', name: '', x: 0, y: 0, width: 40, height: 40, order: 1, content: { imageId: image.image.id, name: 'Valid first', originalWidth: 40, originalHeight: 40 } };
    doc.nodes.secondImage = { id: 'secondImage', pageId: 'details', kind: 'image', name: '', x: 50, y: 0, width: 40, height: 40, order: 2, content: { imageId: 'missing-image', name: 'Missing second', originalWidth: 40, originalHeight: 40 } };
    await createFsDocumentStore().persist(doc);
    const plan = await planDuplicate(source.workspacePath);
    if (plan.kind !== 'ready') throw new Error('expected copy plan');
    const imagesBefore = readdirSync(join(stateRoot(), 'image-blobs')).sort();
    expect((await fabricateDuplicate(plan)).ok).toBe(false);
    expect(existsSync(plan.workspacePath)).toBe(false);
    expect(knownCanvasDocId(plan.workspacePath)).toBeUndefined();
    expect(existsSync(join(stateRoot(), 'image-blobs', workspaceHash(plan.workspacePath)))).toBe(false);
    expect(readdirSync(join(stateRoot(), 'image-blobs')).sort()).toEqual(imagesBefore);
    expect(readImage(image.image.id)?.bytes).toEqual(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
    expect(readExistingCanvasDoc('source-doc')).toEqual(doc);
    expect(sh(source.sourceRepoRoot, ['branch', '--list', plan.branchName])).toBe('');
    expect(readFileSync(join(source.workspacePath, 'app.ts'), 'utf8')).toBe('current design\n');
    expect(existsSync(source.sourceRepoRoot)).toBe(true);
    expect(existsSync(source.workspacePath)).toBe(true);
    expect(knownProject(source.workspacePath)).toBeDefined();
    await expect(planDuplicate(join(source.workspacePath, 'missing'))).rejects.toThrow('Choose a Project');
  });

  it('fabricates and rolls back through the common repository when the original worktree disappears after planning', async () => {
    const source = await sourceProject('source-gone-after-plan');
    const plan = await planDuplicate(source.workspacePath);
    if (plan.kind !== 'ready') throw new Error('expected snapshot before source removal');
    writeFileSync(join(source.sourceRepoRoot, '.env.local'), 'DO_NOT_COPY=repository-environment\n');
    expect((await removeWorktree(source.sourceRepoRoot, source.workspacePath)).ok).toBe(true);
    const result = await fabricateDuplicate(plan);
    if (!result.ok) throw new Error(`expected frozen copy after source removal: ${result.detail ?? ''}`);
    expect(readFileSync(join(plan.workspacePath, 'app.ts'), 'utf8')).toBe('current design\n');
    expect(result.workspace.copiedEnvFiles).toEqual([]);
    expect(existsSync(join(plan.workspacePath, '.env.local'))).toBe(false);
    await rollbackDuplicate(plan);
    expect(existsSync(plan.workspacePath)).toBe(false);
    expect(sh(source.sourceRepoRoot, ['branch', '--list', plan.branchName])).toBe('');
    expect(sh(source.sourceRepoRoot, ['worktree', 'list', '--porcelain'])).not.toContain(plan.workspacePath);
    expect(knownCanvasDocId(plan.workspacePath)).toBeUndefined();
    expect(existsSync(join(source.sourceRepoRoot, '.git'))).toBe(true);
    expect(readFileSync(join(source.sourceRepoRoot, '.env.local'), 'utf8')).toBe('DO_NOT_COPY=repository-environment\n');
  });

  for (const heldOrigin of ['blank', 'copied'] as const) {
    it(`aborts without recreating an empty ${heldOrigin} bucket when its sole source is explicitly removed after planning`, async () => {
      const source = await sourceProject(`removed-held-${heldOrigin}`, 'design', heldOrigin);
      const plan = await planDuplicate(source.workspacePath);
      if (plan.kind !== 'ready') throw new Error('expected held snapshot before source removal');
      const bucket = blankBucketPaths(source.repoIdentity, source.workspaceName);
      const removal: RemoveProjectDeps = {
        closeServer: async () => {}, stopStarter: async () => {}, releaseSession: async () => {},
        closeCanvas: async () => {}, sweep: async () => {},
      };
      expect(await teardownProject(source.workspacePath, removal)).toMatchObject({ ok: true, lastInGroup: true });
      expect(existsSync(bucket.identityDir)).toBe(false);
      const root = join(bucket.identityDir, '..');
      const remaining = readdirSync(root).sort();
      expect(await fabricateDuplicate(plan)).toMatchObject({
        ok: false, reason: 'create-failed', detail: expect.stringContaining('repository is no longer available'),
      });
      expect(existsSync(bucket.identityDir)).toBe(false);
      expect(existsSync(plan.workspacePath)).toBe(false);
      expect(readdirSync(root).sort()).toEqual(remaining);
      expect(knownCanvasDocId(plan.workspacePath)).toBeUndefined();
      expect(knownProject(plan.workspacePath)).toBeUndefined();
      expect(listWorkspaces()).toEqual([]);
    });

    it(`retains ${heldOrigin} ownership through copies of copies after the original is removed`, async () => {
      const source = await sourceProject(`held-${heldOrigin}`, 'design', heldOrigin);
      const removal: RemoveProjectDeps = {
        closeServer: async () => {}, stopStarter: async () => {}, releaseSession: async () => {},
        closeCanvas: async () => {}, sweep: async () => {},
      };
      const copies: WorkspaceCreated[] = [];
      for (const sourcePath of [source.workspacePath, undefined]) {
        const plan = await planDuplicate(sourcePath ?? copies[0]?.workspacePath ?? '');
        if (plan.kind !== 'ready') throw new Error('expected held copy plan');
        const result = await fabricateDuplicate(plan);
        if (!result.ok) throw new Error('expected held copy');
        expect(result.workspace.origin).toBe('duplicate');
        expect(result.workspace.heldOrigin).toBe(heldOrigin);
        rememberProject(result.workspace);
        completeDuplicateRegistration(result.workspace.workspacePath);
        copies.push(result.workspace);
      }
      expect(await teardownProject(source.workspacePath, removal)).toMatchObject({ ok: true });
      expect(await teardownProject(copies[0]?.workspacePath ?? '', removal)).toMatchObject({ ok: true });
      const survivor = copies[1];
      if (survivor === undefined) throw new Error('expected surviving copy');
      const plan = await planWorkspace(survivor.sourceRepoRoot);
      if (plan.kind !== 'ready') throw new Error('expected plan beside surviving copy');
      expect(plan.repoIdentity).toBe(source.repoIdentity);
      expect(plan.sourceRepoName).toBe(source.sourceRepoName);
      expect(plan.held?.origin).toBe(heldOrigin);
      expect((await fabricateFromPlan(plan)).ok).toBe(true);
      await rollbackFromPlan(plan);
      expect(existsSync(survivor.workspacePath)).toBe(true);
      expect(existsSync(survivor.sourceRepoRoot)).toBe(true);
      const origin = workspaceHeldOrigin(survivor) ?? 'imported';
      expect(removeConfirmFor({ origin, missing: false, lastInGroup: true }).variant).toBe('held-last');
      expect(workspaceRemoveConfirmFor({ origins: [origin], present: 1, count: 1 }).variant).toBe('held');
      expect(await teardownProject(survivor.workspacePath, removal)).toMatchObject({ ok: true, lastInGroup: true });
      expect(existsSync(blankBucketPaths(source.repoIdentity, source.workspaceName).identityDir)).toBe(false);
      expect(listWorkspaces()).toEqual([]);
    });
  }

  it('never inherits held ownership from an imported repository and never removes its history', async () => {
    const source = await sourceProject('imported-ownership');
    const plan = await planDuplicate(source.workspacePath);
    if (plan.kind !== 'ready') throw new Error('expected imported copy plan');
    const result = await fabricateDuplicate(plan);
    if (!result.ok) throw new Error('expected imported copy');
    expect(result.workspace.heldOrigin).toBeUndefined();
    rememberProject(result.workspace);
    completeDuplicateRegistration(result.workspace.workspacePath);
    const removal: RemoveProjectDeps = {
      closeServer: async () => {}, stopStarter: async () => {}, releaseSession: async () => {},
      closeCanvas: async () => {}, sweep: async () => {},
    };
    await teardownProject(source.workspacePath, removal);
    expect(workspaceHeldOrigin(result.workspace)).toBeUndefined();
    await teardownProject(result.workspace.workspacePath, removal);
    expect(existsSync(join(source.sourceRepoRoot, '.git'))).toBe(true);
    expect(sh(source.sourceRepoRoot, ['branch', '--list', source.branchName])).not.toBe('');
  });
});
