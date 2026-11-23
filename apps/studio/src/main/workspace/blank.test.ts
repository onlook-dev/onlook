import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { afterAll, describe, expect, it, spyOn } from 'bun:test';
import type { WorkspaceCreated } from '@studio/events';
import {
  bucketsIn,
  cleanupTempFixtures,
  gitOutput as sh,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { applyAgentCreateFrame, canvasSnapshot, flushCanvas, openCanvasForProject } from '../canvas/index.js';
import { canvasDir, canvasDocPath, canvasLogPath } from '../canvas/fs-backend.js';
import { canvasDocIdFor, knownCanvasDocId, resetCanvasRegistryCache } from '../canvas/registry.js';
import { canonicalPath } from '../lib/canonical-path.js';
import { archiveChat, readArchivedChats, resetChatHistoryCache } from '../agent-host/chat-history.js';
import { resetPreferencesCache } from '../agent-host/preferences.js';
import { resetSessionsCache } from '../agent-host/sessions.js';
import { resetTranscriptCache } from '../agent-host/transcript.js';
import { readComposerDraft, resetComposerDraftsCache, writeComposerDraft } from '../drafts/state.js';
import { resetGitStatusCache } from '../git-status/store.js';
import { resetSidebarLayoutCache } from '../sidebar-layout/state.js';
import { flushAllDomains } from '../state/store.js';
import * as stateFiles from '../state/file.js';
import { createServerEntry, resetServerBookCache, serverBookEntries } from '../server/book.js';
import { STUDIO_SYSTEM_AUTHOR } from '../starter/retire.js';
import { STATIC_ADAPTER, STATIC_FILES } from '../starter/adapters/static.js';
import { withGlobalGitConfig, withHostileGlobalGitConfig } from '../env/hostile-git-config.js';
import {
  BLANK_MARKER_FILE,
  blankBucketPaths,
  claimBucket,
  claimBlankBucket,
  clearBlankMarker,
  constructBlankPlan,
  initBlankSource,
  rollbackBlank,
  sweepBlankBuckets,
  type BlankClaim,
} from './blank.js';
import { createWorkspaceFromPlan } from './index.js';
import type { GitResult } from './git.js';
import { knownProject, listWorkspaces, rememberProject, resetWorkspaceCache, workspacePathFor } from './store.js';
import { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from '../telemetry/index.js';

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  resetTranscriptCache();
  resetComposerDraftsCache();
  resetChatHistoryCache();
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  resetTranscriptCache();
  const root = makeWorkspaceRoot({ name: `blank-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: `blank-state-${name}` });
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetServerBookCache();
  resetSidebarLayoutCache();
  resetSessionsCache();
  resetComposerDraftsCache();
  resetPreferencesCache();
  resetChatHistoryCache();
  resetGitStatusCache();
  return root;
}

async function makeBlank(): Promise<BlankClaim> {
  const claimed = claimBlankBucket();
  if (!claimed.ok) throw new Error(claimed.reason);
  const inited = await initBlankSource(claimed.claim, STATIC_ADAPTER);
  if (!inited.ok) throw new Error(inited.detail);
  const created = await createWorkspaceFromPlan(constructBlankPlan(claimed.claim));
  if (!created.ok) throw new Error(created.reason);
  return claimed.claim;
}

function claimOnDisk(): BlankClaim {
  const claimed = claimBlankBucket();
  if (!claimed.ok) throw new Error(claimed.reason);
  mkdirSync(claimed.claim.bucket.worktree, { recursive: true });
  return claimed.claim;
}

it('preserves future creating markers through clear, rollback, and startup sweep', async () => {
  useOwnWorkspaceRoot('future-marker');
  const claim = claimOnDisk();
  const bytes = JSON.stringify({ version: 99, data: { workspacePath: claim.bucket.worktree } });
  writeFileSync(claim.bucket.marker, bytes);
  clearBlankMarker(claim.bucket);
  expect(sweepBlankBuckets()).toEqual([]);
  await rollbackBlank(claim);
  expect(readFileSync(claim.bucket.marker, 'utf8')).toBe(bytes);
  expect(existsSync(claim.bucket.worktree)).toBe(true);
});

function importedOnDisk(name: string): WorkspaceCreated {
  const repoIdentity = `github.com/fixture/${name}`;
  const workspace: WorkspaceCreated = {
    workspacePath: workspacePathFor(repoIdentity, 'teal-skylark'),
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: name,
    sourcePath: `/somewhere/${name}`,
    sourceRepoRoot: `/somewhere/${name}`,
    repoIdentity,
    copiedEnvFiles: [],
  };
  mkdirSync(workspace.workspacePath, { recursive: true });
  rememberProject(workspace);
  return workspace;
}



describe('claim + init + cut — the happy path up to registration', () => {
  it('reports a cut git refused, with the result git gave', async () => {
    useOwnWorkspaceRoot('cut-refused');
    const claimed = claimBlankBucket();
    if (!claimed.ok) throw new Error(claimed.reason);
    expect((await initBlankSource(claimed.claim, STATIC_ADAPTER)).ok).toBe(true);
    mkdirSync(claimed.claim.bucket.worktree);
    writeFileSync(join(claimed.claim.bucket.worktree, 'occupied'), '');
    const reported: GitResult[] = [];

    const created = await createWorkspaceFromPlan(constructBlankPlan(claimed.claim), (result) => reported.push(result));

    expect(created.ok).toBe(false);
    expect(reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({ ok: false, exitCode: 128, missing: false, timedOut: false });
    // Nothing was copied, so the row must not narrate it as a copy failure and send the person to the folder picker (ONL-3285).
    expect(created).not.toHaveProperty('copyFailure');
  });

  it('reports a blank project commit failure from stdout without recording the command line', async () => {
    useOwnWorkspaceRoot('empty-commit');
    const claimed = claimBlankBucket();
    if (!claimed.ok) throw new Error(claimed.reason);

    const result = await initBlankSource(claimed.claim, { ...STATIC_ADAPTER, files: () => ({}) });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('an empty scaffold unexpectedly committed');
    expect(result.detail).toStartWith('git commit exited with code 1:');
    expect(result.detail).toContain('nothing to commit');
    expect(result.detail).not.toContain('user.name');
    expect(result.detail).not.toContain('--quiet');
  });

  it('makes a source repo with the scaffold in one system-authored commit, and a worktree cut from it', async () => {
    const root = useOwnWorkspaceRoot('happy');
    const claim = await makeBlank();
    const { source, worktree, marker } = claim.bucket;

    expect(claim.repoIdentity.startsWith('/')).toBe(false);
    expect(claim.repoIdentity).toMatch(/^blank\/[0-9a-f-]{36}$/);
    expect(claim.title).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(claim.title.toLowerCase().replace(' ', '-')).toBe(claim.workspaceName);

    for (const file of Object.keys(STATIC_FILES)) {
      expect(existsSync(join(source, file))).toBe(true);
      expect(existsSync(join(worktree, file))).toBe(true);
    }
    expect(sh(source, ['rev-list', '--count', 'main'])).toBe('1');
    expect(sh(source, ['log', '-1', '--format=%an <%ae>'])).toBe(
      `${STUDIO_SYSTEM_AUTHOR.name} <${STUDIO_SYSTEM_AUTHOR.email}>`,
    );
    expect(sh(source, ['status', '--porcelain'])).toBe('');
    expect(sh(worktree, ['rev-parse', 'HEAD'])).toBe(sh(source, ['rev-parse', 'refs/heads/main']));
    expect(sh(worktree, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe(claim.branchName);
    expect(sh(source, ['worktree', 'list']).split('\n')).toHaveLength(2);

    expect(knownProject(worktree)).toBeUndefined();
    expect(listWorkspaces()).toEqual([]);
    expect(existsSync(marker)).toBe(true);
    clearBlankMarker(claim.bucket);
    expect(existsSync(marker)).toBe(false);
    expect(bucketsIn(root)).toHaveLength(1);
  });

  it('refuses a claim whose bucket already exists, having made nothing else', () => {
    const root = useOwnWorkspaceRoot('collide');
    const first = claimBlankBucket();
    if (!first.ok) throw new Error(first.reason);

    const second = claimBlankBucket({ repoIdentity: first.claim.repoIdentity });

    expect(second).toEqual({ ok: false, reason: 'bucket-exists' });
    expect(bucketsIn(root)).toEqual([basename(first.claim.bucket.identityDir)]);
    expect(readdirSync(first.claim.bucket.identityDir).sort()).toEqual([BLANK_MARKER_FILE, 'source']);
  });

  it.each(['marker', 'source'] as const)('removes only its new bucket after a %s failure and allows a retry', (step) => {
    const root = useOwnWorkspaceRoot(`claim-failure-${step}`);
    const existing = claimOnDisk();
    const existingMarker = readFileSync(existing.bucket.marker, 'utf8');
    const sentinel = join(existing.bucket.source, 'keep.txt');
    writeFileSync(sentinel, 'keep');
    const claim = { repoIdentity: `blank-claim-failure-${step}`, workspaceName: 'teal-skylark', branchName: 'onlook/teal-skylark' };
    const bucket = blankBucketPaths(claim.repoIdentity, claim.workspaceName);
    const failure = Object.assign(new Error('marker failed'), { code: 'ENOSPC' });
    const originalWrite = stateFiles.writeStateFile;
    const write = spyOn(stateFiles, 'writeStateFile').mockImplementation((path, ...args) => {
      if (step === 'marker' && path === bucket.marker) throw failure;
      const written = originalWrite(path, ...args);
      if (step === 'source' && path === bucket.marker && written) {
        expect(existsSync(bucket.marker)).toBe(true);
        writeFileSync(bucket.source, 'source directory collision');
      }
      return written;
    });
    try {
      let caught: unknown;
      try {
        claimBucket(claim);
      } catch (error) {
        caught = error;
      }
      if (step === 'marker') expect(caught).toBe(failure);
      else expect(caught).toMatchObject({ code: 'EEXIST', path: bucket.source });
      expect(existsSync(bucket.identityDir)).toBe(false);
      expect(bucketsIn(root)).toEqual([basename(existing.bucket.identityDir)]);
      expect(readFileSync(existing.bucket.marker, 'utf8')).toBe(existingMarker);
      expect(readFileSync(sentinel, 'utf8')).toBe('keep');
    } finally {
      write.mockRestore();
    }
    expect(claimBucket(claim)).toEqual({ ok: true, bucket });
    expect(existsSync(bucket.marker)).toBe(true);
    expect(existsSync(bucket.source)).toBe(true);
  });

  it('leaves a future marker untouched when writing the claim is refused', () => {
    useOwnWorkspaceRoot('claim-future-marker');
    const claim = { repoIdentity: 'blank-claim-future-marker', workspaceName: 'teal-skylark', branchName: 'onlook/teal-skylark' };
    const bucket = blankBucketPaths(claim.repoIdentity, claim.workspaceName);
    const bytes = JSON.stringify({ version: 99, data: { workspacePath: bucket.worktree } });
    const originalWrite = stateFiles.writeStateFile;
    const write = spyOn(stateFiles, 'writeStateFile').mockImplementation((path, ...args) => {
      if (path === bucket.marker) writeFileSync(path, bytes);
      return originalWrite(path, ...args);
    });
    try {
      expect(claimBucket(claim)).toEqual({ ok: false, reason: 'bucket-exists' });
      expect(readFileSync(bucket.marker, 'utf8')).toBe(bytes);
      expect(existsSync(bucket.source)).toBe(false);
    } finally {
      write.mockRestore();
    }
  });

  it('makes the init commit under a global config that demands a signature git cannot produce', async () => {
    useOwnWorkspaceRoot('gpgsign');
    const claimed = claimBlankBucket();
    if (!claimed.ok) throw new Error(claimed.reason);
    await withHostileGlobalGitConfig(async () => {
      const inited = await initBlankSource(claimed.claim, STATIC_ADAPTER);
      expect(inited).toEqual({ ok: true });
    });
    const { source } = claimed.claim.bucket;
    expect(sh(source, ['rev-list', '--count', 'main'])).toBe('1');
    expect(sh(source, ['status', '--porcelain'])).toBe('');
  });

  it('checks the scaffold out byte for byte under a global core.autocrlf, so a relaunch still recognises its server.mjs', async () => {
    useOwnWorkspaceRoot('autocrlf');
    await withGlobalGitConfig('[core]\n\tautocrlf = true\n', async () => {
      const { worktree } = (await makeBlank()).bucket;
      for (const [file, content] of Object.entries(STATIC_FILES)) {
        expect(readFileSync(join(worktree, file), 'utf8')).toBe(content);
      }
    });
  });
});

describe('rollback — every residue, in order', () => {
  it('after the worktree cut, removes source, worktree, canvas entry, doc files and book bucket; the registry is untouched', async () => {
    const root = useOwnWorkspaceRoot('rollback');
    const claim = await makeBlank();
    const { worktree, identityDir } = claim.bucket;
    mkdirSync(canvasDir(), { recursive: true });
    const docId = canvasDocIdFor(worktree);
    writeFileSync(canvasDocPath(docId), '{}');
    createServerEntry(worktree, { folder: worktree, port: 4310, ownership: 'studio-started' });
    const worktreeKey = canonicalPath(worktree);

    let stopped: string | undefined;
    await rollbackBlank(claim, {
      stopStarter: async (path) => {
        stopped = path;
      },
    });

    expect(stopped).toBe(worktree);
    expect(existsSync(identityDir)).toBe(false);
    expect(bucketsIn(root)).toEqual([]);
    expect(knownCanvasDocId(worktreeKey)).toBeUndefined();
    expect(existsSync(canvasDocPath(docId))).toBe(false);
    expect(serverBookEntries(worktreeKey)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
  });

  it('opened and rolled back with no user op, the page its open authored leaves no file behind (ONL-2488)', async () => {
    useOwnWorkspaceRoot('rollback-adopted');
    const claim = await makeBlank();
    const { worktree } = claim.bucket;
    await openCanvasForProject(worktree);
    const docId = canvasDocIdFor(worktree);
    await flushCanvas();
    expect(existsSync(canvasDocPath(docId))).toBe(true);
    expect(existsSync(canvasLogPath(docId))).toBe(true);

    await rollbackBlank(claim, { opened: true });

    expect(existsSync(canvasDocPath(docId))).toBe(false);
    expect(existsSync(canvasLogPath(docId))).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(existsSync(canvasDocPath(docId))).toBe(false);
    expect(existsSync(canvasLogPath(docId))).toBe(false);
  });

  it('after a frame was authored, no document file reappears — the persist-after-delete regression', async () => {
    useOwnWorkspaceRoot('rollback-open');
    const claim = await makeBlank();
    const { worktree } = claim.bucket;
    await openCanvasForProject(worktree);
    const created = await applyAgentCreateFrame(worktree, { url: 'http://localhost:4310' });
    if (!created.ok) throw new Error(created.reason);
    const docId = canvasDocIdFor(worktree);
    const worktreeKey = canonicalPath(worktree);

    await rollbackBlank(claim, { opened: true });

    expect(existsSync(canvasDocPath(docId))).toBe(false);
    expect(existsSync(canvasLogPath(docId))).toBe(false);
    // A persist queued behind the close lands here; rolling back before `closeCanvas` turns this red.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(existsSync(canvasDocPath(docId))).toBe(false);
    expect(knownCanvasDocId(worktreeKey)).toBeUndefined();
  });

  it('with another project opened over it meanwhile, leaves that project\'s hosts open (a card click mid-create)', async () => {
    useOwnWorkspaceRoot('rollback-other-open');
    const claim = await makeBlank();
    const other = await makeBlank();
    clearBlankMarker(other.bucket);
    await openCanvasForProject(claim.bucket.worktree);
    await openCanvasForProject(other.bucket.worktree);

    await rollbackBlank(claim, { opened: true });

    expect((await canvasSnapshot()).doc).not.toBeNull();
    expect(knownCanvasDocId(other.bucket.worktree)).toBeDefined();
    expect(existsSync(claim.bucket.identityDir)).toBe(false);
    await flushCanvas();
  });

  it('does not throw when the bucket cannot be removed — the caller\'s own error is the one to surface', async () => {
    useOwnWorkspaceRoot('rollback-rm-fails');
    const claim = await makeBlank();
    await rollbackBlank(claim, {
      rm: () => {
        throw new Error('EPERM: fixture');
      },
    });
    expect(existsSync(claim.bucket.identityDir)).toBe(true);
  });

  it('is idempotent — a second rollback of a gone bucket is a no-op', async () => {
    useOwnWorkspaceRoot('rollback-twice');
    const claim = await makeBlank();
    await rollbackBlank(claim);
    await rollbackBlank(claim);
    expect(existsSync(claim.bucket.identityDir)).toBe(false);
  });
});

describe('the boot sweep — marked buckets only', () => {
  it('cleans both archived chats and drafts after a successful erase and seals late draft writes', () => {
    useOwnWorkspaceRoot('sweep-chats-drafts');
    const crashed = claimOnDisk();
    const sibling = claimOnDisk();
    clearBlankMarker(sibling.bucket);
    const crashedKey = canonicalPath(crashed.bucket.worktree);
    const siblingKey = canonicalPath(sibling.bucket.worktree);
    for (const cwd of [crashedKey, siblingKey]) {
      writeComposerDraft(cwd, { text: 'unsent', images: [] });
      for (const harness of ['claude', 'appserver'] as const) {
        archiveChat(cwd, harness, { sessionId: `archived-${harness}`, events: [] });
      }
    }
    flushAllDomains();
    expect(sweepBlankBuckets()).toEqual([crashed.bucket.identityDir]);
    writeComposerDraft(crashedKey, { text: 'late write', images: [] });
    flushAllDomains();
    expect(readComposerDraft(crashedKey).text).toBe('');
    expect(readComposerDraft(siblingKey).text).toBe('unsent');
    for (const harness of ['claude', 'appserver'] as const) {
      expect(readArchivedChats(crashedKey, harness)).toEqual([]);
      expect(readArchivedChats(siblingKey, harness)).toHaveLength(1);
    }
    resetComposerDraftsCache();
    resetChatHistoryCache();
    expect(readComposerDraft(crashedKey).text).toBe('');
    expect(readComposerDraft(siblingKey).text).toBe('unsent');
    expect(readArchivedChats(crashedKey, 'claude')).toEqual([]);
    expect(readArchivedChats(siblingKey, 'claude')).toHaveLength(1);
  });

  it('keeps chats and drafts when erase fails, without sealing a project that still exists', () => {
    useOwnWorkspaceRoot('sweep-state-rm-fails');
    const crashed = claimOnDisk();
    const cwd = canonicalPath(crashed.bucket.worktree);
    writeComposerDraft(cwd, { text: 'unsent', images: [] });
    archiveChat(cwd, 'claude', { sessionId: 'kept', events: [] });
    flushAllDomains();
    expect(sweepBlankBuckets({ rm: () => { throw new Error('refused'); } })).toEqual([]);
    expect(existsSync(crashed.bucket.identityDir)).toBe(true);
    expect(readArchivedChats(cwd, 'claude')).toHaveLength(1);
    expect(readComposerDraft(cwd).text).toBe('unsent');
    writeComposerDraft(cwd, { text: 'still editable', images: [] });
    flushAllDomains();
    resetComposerDraftsCache();
    resetChatHistoryCache();
    expect(readComposerDraft(cwd).text).toBe('still editable');
    expect(readArchivedChats(cwd, 'claude')).toHaveLength(1);
  });

  it('refuses sweeping and rollback before any destructive effects when project metadata is future', async () => {
    useOwnWorkspaceRoot('sweep-future-project-state');
    const crashed = claimOnDisk();
    const cwd = canonicalPath(crashed.bucket.worktree);
    writeComposerDraft(cwd, { text: 'unsent', images: [] });
    archiveChat(cwd, 'claude', { sessionId: 'kept', events: [] });
    flushAllDomains();
    const path = join(process.env['STUDIO_STATE_ROOT']!, 'composer-drafts.json');
    const bytes = JSON.stringify({ ...JSON.parse(readFileSync(path, 'utf8')), version: 99 });
    writeFileSync(path, bytes);
    let effects = 0;
    expect(sweepBlankBuckets({ rm: () => { effects += 1; } })).toEqual([]);
    await rollbackBlank(crashed, { stopStarter: async () => { effects += 1; }, rm: () => { effects += 1; } });
    expect(effects).toBe(0);
    expect(existsSync(crashed.bucket.identityDir)).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
    expect(readArchivedChats(cwd, 'claude')).toHaveLength(1);
  });
  it('removes a bucket a crash left marked, with its registry residue, and leaves an imported bucket alone', async () => {
    const root = useOwnWorkspaceRoot('sweep');
    const imported = { workspace: importedOnDisk('sweep-imported') };
    mkdirSync(canvasDir(), { recursive: true });
    const importedDoc = canvasDocIdFor(imported.workspace.workspacePath);
    writeFileSync(canvasDocPath(importedDoc), '{}');

    const crashed = claimOnDisk();
    const crashedDoc = canvasDocIdFor(crashed.bucket.worktree);
    writeFileSync(canvasDocPath(crashedDoc), '{}');
    createServerEntry(crashed.bucket.worktree, {
      folder: crashed.bucket.worktree,
      port: 4310,
      ownership: 'studio-started',
    });
    // Before the sweep: a deleted path no longer resolves `/var` to the `/private/var` the registries keyed.
    const crashedKey = canonicalPath(crashed.bucket.worktree);

    const swept = sweepBlankBuckets();

    expect(swept).toEqual([crashed.bucket.identityDir]);
    expect(existsSync(crashed.bucket.identityDir)).toBe(false);
    expect(knownCanvasDocId(crashedKey)).toBeUndefined();
    expect(existsSync(canvasDocPath(crashedDoc))).toBe(false);
    expect(serverBookEntries(crashedKey)).toEqual([]);

    expect(existsSync(imported.workspace.workspacePath)).toBe(true);
    expect(knownProject(imported.workspace.workspacePath)).toBeDefined();
    expect(knownCanvasDocId(imported.workspace.workspacePath)).toBe(importedDoc);
    expect(existsSync(canvasDocPath(importedDoc))).toBe(true);
    expect(bucketsIn(root)).toHaveLength(1);
    const finished = claimOnDisk();
    clearBlankMarker(finished.bucket);
    expect(sweepBlankBuckets()).toEqual([]);
    expect(existsSync(finished.bucket.worktree)).toBe(true);
    await flushCanvas();
  });

  it('never touches a bucket outside the minted prefix, marker or not — the agent can write `creating` anywhere under the root', async () => {
    const root = useOwnWorkspaceRoot('sweep-foreign-marker');
    const imported = { workspace: importedOnDisk('sweep-marked-imported') };
    const bucket = join(imported.workspace.workspacePath, '..');
    writeFileSync(join(bucket, BLANK_MARKER_FILE), `${JSON.stringify({ workspacePath: imported.workspace.workspacePath })}\n`);

    expect(sweepBlankBuckets()).toEqual([]);
    expect(existsSync(imported.workspace.workspacePath)).toBe(true);
    expect(knownProject(imported.workspace.workspacePath)).toBeDefined();
    expect(bucketsIn(root)).toHaveLength(1);
  });

  it('honours a marker\'s workspacePath only inside its own bucket — a sibling project\'s residue stays', async () => {
    useOwnWorkspaceRoot('sweep-marker-escape');
    const victim = claimOnDisk();
    clearBlankMarker(victim.bucket);
    mkdirSync(canvasDir(), { recursive: true });
    const victimDoc = canvasDocIdFor(victim.bucket.worktree);
    writeFileSync(canvasDocPath(victimDoc), '{}');
    createServerEntry(victim.bucket.worktree, { folder: victim.bucket.worktree, port: 4310, ownership: 'studio-started' });
    const crashed = claimOnDisk();
    writeFileSync(crashed.bucket.marker, `${JSON.stringify({ workspacePath: victim.bucket.worktree })}\n`);

    expect(sweepBlankBuckets()).toEqual([crashed.bucket.identityDir]);
    expect(existsSync(victim.bucket.worktree)).toBe(true);
    expect(knownCanvasDocId(victim.bucket.worktree)).toBe(victimDoc);
    expect(existsSync(canvasDocPath(victimDoc))).toBe(true);
    expect(serverBookEntries(victim.bucket.worktree)).toHaveLength(1);
  });

  it('continues past a bucket that cannot be removed and answers only the ones that went', async () => {
    useOwnWorkspaceRoot('sweep-rm-fails');
    const stuck = claimOnDisk();
    const other = claimOnDisk();
    const swept = sweepBlankBuckets({
      rm: (path) => {
        if (path === stuck.bucket.identityDir) throw new Error('EPERM: fixture');
        rmSync(path, { recursive: true, force: true });
      },
    });
    expect(swept).toEqual([other.bucket.identityDir]);
    expect(existsSync(stuck.bucket.identityDir)).toBe(true);
    expect(existsSync(other.bucket.identityDir)).toBe(false);
    expect(existsSync(stuck.bucket.marker)).toBe(true);
  });

  it('answers nothing for a root that does not exist yet', () => {
    useOwnWorkspaceRoot('sweep-empty');
    process.env['STUDIO_WORKSPACE_ROOT'] = join(process.env['STUDIO_WORKSPACE_ROOT'] ?? '', 'never-made');
    expect(sweepBlankBuckets()).toEqual([]);
  });
});

describe('the cut records its head (ONL-2351)', () => {
  it('a clean cut queues workspace_created with head_matches true, the hashed identity, and no path', async () => {
    useOwnWorkspaceRoot('head-check');
    const savedKey = process.env['STUDIO_POSTHOG_KEY'];
    const savedState = process.env['STUDIO_STATE_ROOT'];
    const scratch = join(process.env['STUDIO_WORKSPACE_ROOT'] as string, 'state');
    mkdirSync(scratch, { recursive: true });
    process.env['STUDIO_STATE_ROOT'] = scratch;
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    setAppForTesting({ getPath: () => scratch, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (() => Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
    try {
      resetTelemetryForTesting();
      initTelemetry();
      const claim = await makeBlank();
      const [event] = peekQueueForTesting().filter((e) => e.event === 'workspace_created');
      expect(event).toBeDefined();
      expect(event!.properties['head_matches']).toBe(true);
      expect(event!.properties['base_kind']).toBe('local-main');
      expect(typeof event!.properties['project_id']).toBe('string');
      expect(JSON.stringify(event!.properties)).not.toContain(claim.bucket.worktree);
      expect(peekQueueForTesting().some((e) => e.event === '$exception')).toBe(false);
    } finally {
      resetTelemetryForTesting();
      setAppForTesting(undefined);
      globalThis.fetch = realFetch;
      if (savedKey === undefined) delete process.env['STUDIO_POSTHOG_KEY'];
      else process.env['STUDIO_POSTHOG_KEY'] = savedKey;
      if (savedState === undefined) delete process.env['STUDIO_STATE_ROOT'];
      else process.env['STUDIO_STATE_ROOT'] = savedState;
    }
  });
});
