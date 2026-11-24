import { describe, expect, it } from 'bun:test';
import type { ProjectCreateState, WorkspaceCreated } from '@studio/events';
import { failedSetupLineKey, narrationFor, ownCreateState, useProjectCreateStore } from './projectCreate.js';

const workspace = { sourceRepoName: 'acme-storefront', workspaceName: 'skylark' } as WorkspaceCreated;

const failedInstalling: ProjectCreateState = {
  kind: 'failed',
  sourceRepoName: 'acme-storefront',
  phase: 'installing',
  detail: 'boom',
  workspace,
};

const failedCopying: ProjectCreateState = { kind: 'failed', sourceRepoName: 'acme-storefront', phase: 'copying' };

describe('narrationFor — the failed row (ONL-2363)', () => {
  it('explains an ignored folder and sends the person back to the picker instead of Retry', () => {
    const state = { ...failedCopying, copyFailure: { step: 'git_commit', cause: 'ignored_files' } } as ProjectCreateState;
    expect(narrationFor(state, { hasLiveServer: false })).toMatchObject({
      nextActionKey: 'project.create.copy.ignored_files',
      wayOut: 'choose-folder',
    });
  });

  it('keeps Retry for a copy that timed out or failed unclassified (ONL-3285)', () => {
    for (const cause of ['git_timed_out', 'unknown'] as const) {
      const state = { ...failedCopying, copyFailure: { step: 'git_commit', cause } } as ProjectCreateState;
      expect(narrationFor(state, { hasLiveServer: false })).toMatchObject({ wayOut: 'retry' });
    }
  });
  it('names the source Project, rather than its repository, while making a duplicate (ONL-2515)', () => {
    for (const state of [
      { kind: 'planning', sourceRepoName: 'acme-storefront', duplicateSourceName: 'Landing' },
      { kind: 'copying', sourceRepoName: 'acme-storefront', duplicateSourceName: 'Landing', workspaceName: 'copy-id' },
    ] as const) {
      expect(narrationFor(state, { hasLiveServer: false })).toEqual({ kind: 'progress', phase: state.kind, lineKey: 'project.create.copying', repo: 'Landing' });
    }
  });

  it('failed at installing with nothing running: the failed narration, with Dismiss', () => {
    const narration = narrationFor(failedInstalling, { hasLiveServer: false });
    expect(narration).toEqual({
      kind: 'failed',
      phase: 'installing',
      lineKey: 'project.create.failed.installingPackages',
      nextActionKey: 'project.create.next.installing',
      repo: 'acme-storefront',
      detail: 'boom',
      canDismiss: true,
      wayOut: 'retry',
    });
  });

  it('failed with the server measuring live: nothing — the app answers for itself', () => {
    expect(narrationFor(failedInstalling, { hasLiveServer: true })).toBeNull();
  });

  it('failed at copying, no project yet: the failed narration without Dismiss', () => {
    const narration = narrationFor(failedCopying, { hasLiveServer: false });
    expect(narration?.kind).toBe('failed');
    expect(narration?.kind === 'failed' && narration.canDismiss).toBe(false);
  });

  it('failed at copying with a live entry in the book: still the failed narration, because the entry is not this creation\'s', () => {
    const narration = narrationFor(failedCopying, { hasLiveServer: true });
    expect(narration?.kind).toBe('failed');
    expect(narration?.kind === 'failed' && narration.canDismiss).toBe(false);
  });

  it('a stage in progress reads the same whatever the book says', () => {
    const installing: ProjectCreateState = { kind: 'installing', workspace };
    const quiet = narrationFor(installing, { hasLiveServer: false });
    expect(quiet).toEqual({ kind: 'progress', phase: 'installing', lineKey: 'project.create.installingPackages', repo: 'acme-storefront' });
    expect(narrationFor(installing, { hasLiveServer: true })).toEqual(quiet);
  });
  it('leaves the starting line to the agent\'s setup checklist, and keeps the failed row and its Retry (ONL-2913)', () => {
    const starting: ProjectCreateState = { kind: 'starting', workspace };
    expect(narrationFor(starting, { hasLiveServer: false, hasSetupCard: true })).toBeNull();
    expect(narrationFor(starting, { hasLiveServer: false })?.kind).toBe('progress');
    expect(narrationFor(failedInstalling, { hasLiveServer: false, hasSetupCard: true })?.kind).toBe('failed');
  });
});

describe('when the current copy began', () => {
  it('starts on planning and holds through copying, then clears on the next phase', () => {
    const store = useProjectCreateStore.getState();
    store.set({ kind: 'planning', sourceRepoName: 'silt' }, 1_000);
    store.set({ kind: 'copying', sourceRepoName: 'silt', workspaceName: 'amber-heron' }, 9_000);
    expect(useProjectCreateStore.getState().copyStartedAt).toBe(1_000);
    store.set({ kind: 'installing', workspace }, 9_500);
    expect(useProjectCreateStore.getState().copyStartedAt).toBeUndefined();
    store.set({ kind: 'planning', sourceRepoName: 'silt' }, 20_000);
    expect(useProjectCreateStore.getState().copyStartedAt).toBe(20_000);
    store.set(null);
  });
});

describe('narrationFor — one name per failed step (ONL-2961)', () => {
  const failedStarting: ProjectCreateState = { ...failedInstalling, phase: 'starting' };

  it('names an install failure the setup machine saw, though the create phase says starting', () => {
    const narration = narrationFor(failedStarting, { hasLiveServer: false, failedStep: 'install' });
    expect(narration).toMatchObject({ lineKey: 'project.create.failed.installingPackages', nextActionKey: 'project.create.next.installing' });
  });

  it('gives the ended setup row the failed step’s line', () => {
    expect(failedSetupLineKey(failedStarting, { hasLiveServer: false, failedStep: 'start' })).toBe('project.create.failed.starting');
    expect(failedSetupLineKey(failedStarting, { hasLiveServer: false, failedStep: 'install' })).toBe('project.create.failed.installingPackages');
  });

  it('draws no failed line while the canvas card holds the failure', () => {
    expect(narrationFor(failedStarting, { hasLiveServer: false, isFailureCardHeld: true })).toBeNull();
  });
});

describe("a tab's creation record belongs to the Project it made", () => {
  const made = { workspacePath: '/w/skylark', sourceRepoName: 'acme-storefront' } as WorkspaceCreated;
  const draft = { workspacePath: '/w/amber-heron', sourceRepoName: 'amber-heron', origin: 'blank' } as WorkspaceCreated;
  const failed: ProjectCreateState = { kind: 'failed', sourceRepoName: 'acme-storefront', phase: 'starting', workspace: made };

  it("reads as no creation once another Project is open, so its failure is not that Project's", () => {
    expect(ownCreateState(failed, draft)).toBeNull();
    expect(narrationFor(ownCreateState(failed, draft), { hasLiveServer: false })).toBeNull();
  });

  it('stays with the Project it made, and before any Project is open', () => {
    expect(ownCreateState(failed, made)).toBe(failed);
    const copying: ProjectCreateState = { kind: 'copying', sourceRepoName: 'acme-storefront', workspaceName: 'skylark' };
    expect(ownCreateState(copying, draft)).toBe(copying);
    expect(ownCreateState(failed, null)).toBe(failed);
  });
});
