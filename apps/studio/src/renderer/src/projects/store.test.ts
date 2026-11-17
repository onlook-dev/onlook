import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { MAX_PROJECT_TABS, type DiscoveredWorktree, type TabsState, type WorkspaceSummary } from '@studio/events';
import { primeProjects, resetProjectsPrimeForTests, useProjectsStore } from './store.js';

function workspace(name: string): WorkspaceSummary {
  return {
    repoIdentity: `id-${name}`,
    name,
    sourcePath: `/src/${name}`,
    lastOpenedAt: '2026-08-05T00:00:00.000Z',
    archived: false,
    projects: [],
  };
}

function candidate(name: string): DiscoveredWorktree {
  return {
    handle: `/workspaces/zest/${name}`,
    name,
    branchName: `fixture/${name}`,
    groupName: 'zest-maps',
    repoIdentity: 'id-zest-maps',
    completedBy: 'record',
  };
}

function tabsState(projectCount: number): TabsState {
  return {
    tabs: [
      { id: 'home', name: 'Projects', purpose: 'projects' },
      ...Array.from({ length: projectCount }, (_, index) => ({
        id: `project-${index}`,
        name: `Project ${index}`,
        purpose: 'project' as const,
      })),
    ],
    canCreate: true,
    isHome: true,
  };
}

function fakeBridge(): {
  install: () => void;
  releaseReads: () => Promise<void>;
  failReads: () => Promise<void>;
  releaseScan: (found: DiscoveredWorktree[]) => Promise<void>;
  broadcast: (list: WorkspaceSummary[]) => void;
  broadcastDiscovered: (found: DiscoveredWorktree[]) => void;
  releaseTabs: (state: TabsState) => Promise<void>;
  failTabs: () => Promise<void>;
  broadcastTabs: (state: TabsState) => void;
  counts: () => {
    listWorkspaces: number;
    subscriptions: number;
    listDiscovered: number;
    tabsState: number;
    tabsSubscriptions: number;
  };
} {
  let listCalls = 0;
  let subscriptions = 0;
  let listDiscovered = 0;
  let releaseList: ((list: WorkspaceSummary[]) => void) | undefined;
  let rejectList: ((error: Error) => void) | undefined;
  let changedListener: ((list: WorkspaceSummary[]) => void) | undefined;
  let discoveredListener: ((found: DiscoveredWorktree[]) => void) | undefined;
  let releaseDiscovered: ((found: DiscoveredWorktree[]) => void) | undefined;
  let pending: Promise<unknown> | undefined;
  let pendingScan: Promise<unknown> | undefined;
  let tabsCalls = 0;
  let tabsSubscriptions = 0;
  let releaseTabs: ((state: TabsState) => void) | undefined;
  let rejectTabs: ((error: Error) => void) | undefined;
  let tabsListener: ((state: TabsState) => void) | undefined;
  let pendingTabs: Promise<TabsState> | undefined;

  const bridge = {
    tabsState(): Promise<TabsState> {
      tabsCalls += 1;
      pendingTabs = new Promise<TabsState>((resolve, reject) => {
        releaseTabs = resolve;
        rejectTabs = reject;
      });
      return pendingTabs;
    },
    onTabsState(listener: (state: TabsState) => void): () => void {
      tabsSubscriptions += 1;
      tabsListener = listener;
      return () => {};
    },
    listWorkspaces(): Promise<WorkspaceSummary[]> {
      listCalls += 1;
      const p = new Promise<WorkspaceSummary[]>((resolve, reject) => {
        releaseList = resolve;
        rejectList = reject;
      });
      pending = p;
      return p;
    },
    onWorkspacesChanged(listener: (list: WorkspaceSummary[]) => void): () => void {
      subscriptions += 1;
      changedListener = listener;
      return () => {};
    },
    listDiscoveredWorktrees(): Promise<DiscoveredWorktree[]> {
      listDiscovered += 1;
      const p = new Promise<DiscoveredWorktree[]>((resolve) => {
        releaseDiscovered = resolve;
      });
      pendingScan = p;
      return p;
    },
    onDiscoveredWorktreesChanged(listener: (found: DiscoveredWorktree[]) => void): () => void {
      discoveredListener = listener;
      return () => {};
    },
  };

  return {
    install(): void {
      Object.defineProperty(globalThis, 'window', {
        value: { studio: bridge },
        configurable: true,
        writable: true,
      });
    },
    async releaseReads(): Promise<void> {
      releaseList?.([workspace('alpha')]);
      await pending;
      // Let the continuation inside the prime run before a case asserts.
      await Promise.resolve();
      await Promise.resolve();
    },
    async failReads(): Promise<void> {
      rejectList?.(new Error('read refused'));
      await pending?.catch(() => undefined);
      await Promise.resolve();
      await Promise.resolve();
    },
    async releaseScan(found): Promise<void> {
      releaseDiscovered?.(found);
      await pendingScan;
      await Promise.resolve();
      await Promise.resolve();
    },
    broadcast(list): void {
      changedListener?.(list);
    },
    broadcastDiscovered(found): void {
      discoveredListener?.(found);
    },
    async releaseTabs(state): Promise<void> {
      releaseTabs?.(state);
      await pendingTabs;
      await Promise.resolve();
    },
    async failTabs(): Promise<void> {
      rejectTabs?.(new Error('tab capacity refused'));
      await pendingTabs?.catch(() => undefined);
      await Promise.resolve();
    },
    broadcastTabs(state): void {
      tabsListener?.(state);
    },
    counts: () => ({
      listWorkspaces: listCalls,
      subscriptions,
      listDiscovered,
      tabsState: tabsCalls,
      tabsSubscriptions,
    }),
  };
}

let bridge: ReturnType<typeof fakeBridge>;

beforeEach(() => {
  resetProjectsPrimeForTests();
  bridge = fakeBridge();
  bridge.install();
});

afterEach(() => {
  resetProjectsPrimeForTests();
  Reflect.deleteProperty(globalThis, 'window');
});

describe('primeProjects', () => {
  it('reads and subscribes once however many times it is called', async () => {
    const first = primeProjects();
    const second = primeProjects();

    // Asserted BEFORE the reads are released: counting afterwards would let a
    // memo that only works once-settled pass.
    expect(bridge.counts()).toEqual({
      listWorkspaces: 1, subscriptions: 1, listDiscovered: 1, tabsState: 1, tabsSubscriptions: 1,
    });

    await bridge.releaseReads();
    await Promise.all([first, second]);

    expect(bridge.counts()).toEqual({
      listWorkspaces: 1, subscriptions: 1, listDiscovered: 1, tabsState: 1, tabsSubscriptions: 1,
    });
  });

  it('resolves for every caller, not just the one that did the work', async () => {
    const first = primeProjects();
    const second = primeProjects();
    const third = primeProjects();

    await bridge.releaseReads();

    expect(await Promise.all([first, second, third])).toEqual([undefined, undefined, undefined]);
    expect(useProjectsStore.getState().workspaces.map((w) => w.name)).toEqual(['alpha']);
  });

  it('keeps applying broadcasts after the prime has resolved', async () => {
    const primed = primeProjects();
    await bridge.releaseReads();
    await primed;

    bridge.broadcast([workspace('beta'), workspace('gamma')]);

    expect(useProjectsStore.getState().workspaces.map((w) => w.name)).toEqual(['beta', 'gamma']);
  });

  it('a broadcast landing while the read is in flight is not overwritten by the read', async () => {
    const primed = primeProjects();
    bridge.broadcast([workspace('beta')]);

    await bridge.releaseReads();
    await primed;
    expect(useProjectsStore.getState().workspaces.map((w) => w.name)).toEqual(['beta']);
  });

  it('a failed read leaves the list on what it holds', async () => {
    useProjectsStore.getState().apply({ workspaces: [workspace('beta')] });
    const primed = primeProjects();

    await bridge.failReads();
    await primed;
    expect(useProjectsStore.getState().workspaces.map((w) => w.name)).toEqual(['beta']);
  });

  /* The scan walks the workspace root and runs git per candidate, and with an empty registry
     nothing is skipped — so the gate the Screen waits on must not hold for it (ONL-2522). */
  it('resolves before the scan answers, and takes its list when it does', async () => {
    const primed = primeProjects();

    await bridge.releaseReads();
    expect(await primed).toBeUndefined();
    expect(useProjectsStore.getState().discovered).toEqual([]);

    await bridge.releaseScan([candidate('red-skylark')]);
    expect(useProjectsStore.getState().discovered.map((w) => w.name)).toEqual(['red-skylark']);
  });

  it('a discovered broadcast landing while the scan is in flight is not overwritten by the scan', async () => {
    const primed = primeProjects();
    await bridge.releaseReads();
    await primed;

    bridge.broadcastDiscovered([candidate('blue-harron')]);
    await bridge.releaseScan([candidate('red-skylark'), candidate('blue-harron')]);

    expect(useProjectsStore.getState().discovered.map((w) => w.name)).toEqual(['blue-harron']);
  });

  it('an import retracts the row it registered, through the discovered-changed emit', async () => {
    const primed = primeProjects();
    await bridge.releaseReads();
    await primed;
    await bridge.releaseScan([candidate('red-skylark'), candidate('blue-harron')]);

    bridge.broadcastDiscovered([candidate('blue-harron')]);

    expect(useProjectsStore.getState().discovered.map((w) => w.name)).toEqual(['blue-harron']);
  });
});

describe('Project copy capacity', () => {
  it('stays unresolved until tab capacity answers, without blocking the workspace list', async () => {
    expect(useProjectsStore.getState().copyLimitReached).toBeNull();
    const primed = primeProjects();
    await bridge.releaseReads();
    await primed;

    expect(useProjectsStore.getState().copyLimitReached).toBeNull();
    await bridge.releaseTabs(tabsState(MAX_PROJECT_TABS));
    expect(useProjectsStore.getState().copyLimitReached).toBe(true);
  });

  it('counts Project tabs, not the Projects tab or new-project availability', async () => {
    const primed = primeProjects();
    await bridge.releaseReads();
    await primed;
    await bridge.releaseTabs({ ...tabsState(MAX_PROJECT_TABS - 1), canCreate: false });

    expect(useProjectsStore.getState().copyLimitReached).toBe(false);
  });

  it('keeps a full-capacity broadcast over a deferred available-capacity read', async () => {
    const primed = primeProjects();
    await bridge.releaseReads();
    await primed;

    bridge.broadcastTabs(tabsState(MAX_PROJECT_TABS));
    expect(useProjectsStore.getState().copyLimitReached).toBe(true);
    await bridge.releaseTabs(tabsState(0));
    expect(useProjectsStore.getState().copyLimitReached).toBe(true);
  });

  it('keeps newly available capacity over a stale full-capacity read', async () => {
    const primed = primeProjects();
    bridge.broadcastTabs(tabsState(MAX_PROJECT_TABS - 1));
    await bridge.releaseTabs(tabsState(MAX_PROJECT_TABS));
    await bridge.releaseReads();
    await primed;

    expect(useProjectsStore.getState().copyLimitReached).toBe(false);
  });

  it('keeps applying broadcasts after the initial read resolves', async () => {
    const primed = primeProjects();
    await bridge.releaseTabs(tabsState(0));
    await bridge.releaseReads();
    await primed;

    bridge.broadcastTabs(tabsState(MAX_PROJECT_TABS));
    expect(useProjectsStore.getState().copyLimitReached).toBe(true);
    bridge.broadcastTabs(tabsState(0));
    expect(useProjectsStore.getState().copyLimitReached).toBe(false);
  });

  it('stays unresolved on refusal and recovers through a broadcast', async () => {
    const primed = primeProjects();
    await bridge.failTabs();
    await bridge.releaseReads();
    await primed;

    expect(useProjectsStore.getState().copyLimitReached).toBeNull();
    bridge.broadcastTabs(tabsState(0));
    expect(useProjectsStore.getState().copyLimitReached).toBe(false);
  });
});
