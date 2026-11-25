import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { app, type WebContentsView } from 'electron';
import { afterAll, afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { IPC_EMIT, IPC_SEND, type CanvasDoc, type TabAssignment } from '@studio/events';
import { cleanupTempFixtures, makeStateRoot, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { emptyCanvasDoc } from '../canvas/document.js';
import { canvasDocPath, createFsDocumentStore } from '../canvas/fs-backend.js';
import { canvasDocIdFor, knownCanvasDocId, resetCanvasRegistryCache } from '../canvas/registry.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import type { WarmPhase } from './presentation-machine.js';
import type { TabPresentation } from './presentation.js';
import type { Tab } from './tab.js';
import { fromMainFrame, seatedTabs } from './test-support.js';
import { TabViewPool } from './view-pool.js';

interface RestorationSeam {
  restoreOne(ids: readonly string[]): Promise<void>;
  memoryKb(): number;
}

interface RestoredTab {
  id: string;
  workspacePath?: string;
  isWorking: boolean;
  view?: WebContentsView;
  warming?: WarmPhase;
}

const enteringStateRoot = process.env['STUDIO_STATE_ROOT'];
const presentations: TabPresentation[] = [];
let workspaceRoot: string;
let enteringAppMetrics: PropertyDescriptor | undefined;

beforeEach(() => {
  enteringAppMetrics = Object.getOwnPropertyDescriptor(app, 'getAppMetrics');
  workspaceRoot = makeWorkspaceRoot({ name: 'tab-restored-project' });
  process.env['STUDIO_WORKSPACE_ROOT'] = workspaceRoot;
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'tab-restored-project' });
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  jest.useFakeTimers();
});

afterEach(() => {
  for (const presentation of presentations.splice(0)) presentation.cancelRestoration();
  if (enteringAppMetrics === undefined) Reflect.deleteProperty(app, 'getAppMetrics');
  else Object.defineProperty(app, 'getAppMetrics', enteringAppMetrics);
  jest.useRealTimers();
  resetCanvasRegistryCache();
  resetWorkspaceCache();
});

afterAll(() => {
  restoreWorkspaceRoot();
  if (enteringStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = enteringStateRoot;
  cleanupTempFixtures();
});

function restorationHost({ productionMemory = false }: { productionMemory?: boolean } = {}) {
  const newView = mock(() => { throw new Error('restoration must reuse an already primed view'); });
  const teardown = mock();
  const windowDestroyed = mock(() => false);
  const host = seatedTabs({
    tabs: new Map(), order: [], activeId: 'home',
    window: { isDestroyed: windowDestroyed },
    newView, teardown, present: mock(), requestFirstPaint: mock(), expand: mock(),
    broadcastTabs: mock(), persistWindows: mock(), followSettingsRequest: mock(),
    pushOnScreen: mock(), noteActiveProjectShown: mock(),
  });
  host.tabs.set('home', { id: 'home', isWorking: false });
  host.pieces.views.noteActivity = mock();
  const presentation = host.pieces.presentation as TabPresentation;
  const seam = presentation as unknown as RestorationSeam;
  const memoryKb = mock(() => 1_000);
  if (!productionMemory) seam.memoryKb = memoryKb;
  presentations.push(presentation);
  return { host, presentation, seam, memoryKb, newView, teardown, windowDestroyed };
}

async function savedTab(rig: ReturnType<typeof restorationHost>, id: string, edit?: (doc: CanvasDoc) => void) {
  const workspacePath = join(workspaceRoot, id);
  const repoIdentity = `fixture/restored-${id}`;
  rememberProject({
    workspacePath, workspaceName: id, branchName: id, baseBranch: 'main',
    sourceRepoName: 'fixture', sourcePath: workspacePath, sourceRepoRoot: workspacePath,
    repoIdentity, copiedEnvFiles: [],
  });
  const docId = canvasDocIdFor(workspacePath);
  const doc = emptyCanvasDoc(docId);
  doc.pages.page = { id: 'page', name: 'Page', order: 0 };
  doc.nodes.frame = {
    id: 'frame', pageId: 'page', kind: 'browser', name: 'App',
    x: 0, y: 0, width: 800, height: 600, order: 0,
    content: { homeUrl: 'http://localhost:3000' },
  };
  edit?.(doc);
  await createFsDocumentStore().persist(doc);
  const contents = { id: rig.host.tabs.size + 28_420, isDestroyed: mock(() => false), send: mock() };
  const view = { webContents: contents } as unknown as WebContentsView;
  const tab: RestoredTab = { id, workspacePath, isWorking: false, view, warming: { phase: 'primed', run: 1, turn: 'passed' } };
  rig.host.tabs.set(id, tab);
  rig.host.order.push(id);
  const assignment: TabAssignment = { tabId: id, purpose: 'project', workspacePath, repoIdentity };
  return { tab, contents, view, docId, assignment };
}

function processMetrics(...workingSets: number[]): ReturnType<typeof app.getAppMetrics> {
  return workingSets.map((workingSetSize, processIndex) => ({
    pid: processIndex + 1, memory: { workingSetSize },
  })) as ReturnType<typeof app.getAppMetrics>;
}

describe('restoration reads Electron process memory', () => {
  const invalidReads: [string, () => ReturnType<typeof app.getAppMetrics>][] = [
    ['empty metrics', () => processMetrics()],
    ['a throwing read', () => { throw new Error('synthetic metrics read failure'); }],
    ...[Number.NaN, 0, -1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map(
      (invalid): [string, () => ReturnType<typeof app.getAppMetrics>] => [
        `one ${invalid} row among valid rows`, () => processMetrics(400, invalid, 600),
      ],
    ),
    ['a sum overflowing to infinity', () => processMetrics(Number.MAX_VALUE, Number.MAX_VALUE)],
  ];

  it('sums every process at baseline and on polls across the inclusive 15% limit', async () => {
    const metrics = mock(() => processMetrics(400, 600));
    app.getAppMetrics = metrics;
    const rig = restorationHost({ productionMemory: true });
    const restored = await savedTab(rig, 'restored');
    await rig.seam.restoreOne(['restored']);

    expect(restored.contents.send).toHaveBeenCalledWith(IPC_EMIT.tabsAssigned, { ...restored.assignment, restoring: true });
    expect(metrics).toHaveBeenCalledTimes(1);
    metrics.mockReturnValue(processMetrics(450, 700));
    jest.advanceTimersByTime(1_000);

    expect(metrics).toHaveBeenCalledTimes(2);
    expect(rig.teardown).not.toHaveBeenCalled();
    metrics.mockReturnValue(processMetrics(450, 701));
    jest.advanceTimersByTime(1_000);

    expect(metrics).toHaveBeenCalledTimes(3);
    expect(rig.teardown).toHaveBeenCalledTimes(1);
    expect(rig.teardown).toHaveBeenCalledWith(restored.tab.id, { keepProject: true });
    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
    jest.advanceTimersByTime(10_000);

    expect(metrics).toHaveBeenCalledTimes(3);
    expect(rig.teardown).toHaveBeenCalledTimes(1);
    expect(rig.memoryKb).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it.each(invalidReads)('prevents assignment when baseline metrics contain %s', async (_name, read) => {
    const metrics = mock(read);
    app.getAppMetrics = metrics;
    const rig = restorationHost({ productionMemory: true });
    const first = await savedTab(rig, 'first');
    const second = await savedTab(rig, 'second');

    await rig.seam.restoreOne(['first', 'second']);
    metrics.mockReturnValue(processMetrics(400, 600));
    await rig.seam.restoreOne(['second']);
    jest.advanceTimersByTime(10_000);

    expect(first.contents.send).not.toHaveBeenCalled();
    expect(second.contents.send).not.toHaveBeenCalled();
    expect(rig.presentation.assignmentFrom(first.view.webContents)).toBeNull();
    expect(metrics).toHaveBeenCalledTimes(1);
    expect(rig.teardown).not.toHaveBeenCalled();
    expect(rig.memoryKb).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it.each(invalidReads)('tears down once and stops polling when current metrics contain %s', async (_name, read) => {
    const metrics = mock(() => processMetrics(400, 600));
    app.getAppMetrics = metrics;
    const rig = restorationHost({ productionMemory: true });
    const restored = await savedTab(rig, 'restored');
    await rig.seam.restoreOne(['restored']);

    expect(restored.contents.send).toHaveBeenCalledWith(IPC_EMIT.tabsAssigned, { ...restored.assignment, restoring: true });
    metrics.mockImplementation(read);
    jest.advanceTimersByTime(1_000);

    expect(metrics).toHaveBeenCalledTimes(2);
    expect(rig.teardown).toHaveBeenCalledTimes(1);
    expect(rig.teardown).toHaveBeenCalledWith(restored.tab.id, { keepProject: true });
    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
    metrics.mockReturnValue(processMetrics(400, 600));
    jest.advanceTimersByTime(10_000);

    expect(metrics).toHaveBeenCalledTimes(2);
    expect(rig.teardown).toHaveBeenCalledTimes(1);
    expect(restored.contents.send).toHaveBeenCalledTimes(1);
    expect(rig.memoryKb).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });
});

describe('bounded background Project restoration', () => {
  it('admits only one primed Project, reuses its view, and never refills the budget', async () => {
    const rig = restorationHost();
    const first = await savedTab(rig, 'first');
    const second = await savedTab(rig, 'second');

    expect(rig.presentation.assignmentFrom(first.view.webContents)).toBeNull();
    await rig.seam.restoreOne(['first', 'second']);

    expect(first.contents.send).toHaveBeenCalledTimes(1);
    expect(first.contents.send).toHaveBeenCalledWith(IPC_EMIT.tabsAssigned, { ...first.assignment, restoring: true });
    expect(rig.presentation.assignmentFrom(first.view.webContents)).toEqual({ ...first.assignment, restoring: true });
    expect(first.tab.warming).toBeUndefined();
    expect(first.tab.view).toBe(first.view);
    expect(second.contents.send).not.toHaveBeenCalled();
    expect(rig.presentation.assignmentFrom(second.view.webContents)).toBeNull();
    expect(rig.host.activeId).toBe('home');

    await rig.seam.restoreOne(['second']);
    rig.presentation.cancelRestoration();
    await rig.seam.restoreOne(['second']);
    jest.advanceTimersByTime(10_000);

    expect(second.contents.send).not.toHaveBeenCalled();
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    expect(rig.teardown).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it('skips selected, heavy, unprimed, missing, and destroyed views before admitting an eligible Project', async () => {
    const rig = restorationHost();
    const selected = await savedTab(rig, 'selected');
    const heavy = await savedTab(rig, 'heavy', (doc) => {
      doc.pages.other = { id: 'other', name: 'Other', order: 1 };
      doc.nodes.second = { ...doc.nodes.frame!, id: 'second', pageId: 'other' };
    });
    const loading = await savedTab(rig, 'loading');
    loading.tab.warming = { phase: 'loading', run: 2, turn: 'held' };
    const ready = await savedTab(rig, 'ready');
    ready.tab.warming = { phase: 'ready', run: 3, turn: 'passed' };
    const notWarmed = await savedTab(rig, 'not-warmed');
    delete notWarmed.tab.warming;
    const noView = await savedTab(rig, 'no-view');
    delete noView.tab.view;
    const destroyed = await savedTab(rig, 'destroyed');
    destroyed.contents.isDestroyed.mockReturnValue(true);
    const noWorkspace = await savedTab(rig, 'no-workspace');
    delete noWorkspace.tab.workspacePath;
    const eligible = await savedTab(rig, 'eligible');
    rig.host.activeId = selected.tab.id;
    const skipped = [selected, heavy, loading, ready, notWarmed, noView, destroyed, noWorkspace];

    await rig.seam.restoreOne(['unknown', ...skipped.map(({ tab }) => tab.id), eligible.tab.id]);

    for (const candidate of skipped) expect(candidate.contents.send).not.toHaveBeenCalled();
    expect(eligible.contents.send).toHaveBeenCalledWith(IPC_EMIT.tabsAssigned, { ...eligible.assignment, restoring: true });
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it('does not build a view or retry admission when no candidate is primed with a view', async () => {
    const rig = restorationHost();
    const cold = await savedTab(rig, 'cold');
    delete cold.tab.view;

    await rig.seam.restoreOne(['cold']);
    cold.tab.view = cold.view;
    await rig.seam.restoreOne(['cold']);
    jest.advanceTimersByTime(10_000);

    expect(cold.contents.send).not.toHaveBeenCalled();
    expect(rig.memoryKb).not.toHaveBeenCalled();
    expect(rig.teardown).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('fails closed when baseline memory is %s KB', async (baselineKb) => {
    const rig = restorationHost();
    const first = await savedTab(rig, 'first');
    const second = await savedTab(rig, 'second');
    rig.memoryKb.mockReturnValue(baselineKb);

    await rig.seam.restoreOne(['first', 'second']);
    rig.memoryKb.mockReturnValue(1_000);
    await rig.seam.restoreOne(['second']);
    jest.advanceTimersByTime(10_000);

    expect(first.contents.send).not.toHaveBeenCalled();
    expect(second.contents.send).not.toHaveBeenCalled();
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    expect(rig.teardown).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it('replaces over-budget preparation with a painted, unassigned shell for the first selection', async () => {
    const rig = restorationHost();
    const restored = await savedTab(rig, 'restored');
    const contents = Object.assign(new EventEmitter(), {
      id: 28_999, ipc: new EventEmitter(), isDestroyed: () => false,
      capturePage: mock(async () => ({ isEmpty: () => false })),
      loadFile: mock(async () => {}), loadURL: mock(async () => {}), send: mock(),
    });
    const shell = { webContents: contents, setVisible: mock() } as unknown as WebContentsView;
    const views = rig.host.pieces.views as TabViewPool;
    const destroy = mock();
    const retire = mock();
    rig.host.retire = retire;
    views.destroyView = destroy;
    views.adopt = (tab, view) => { (tab as RestoredTab).view = view; };
    views.newView = mock(() => shell);
    views.teardown = TabViewPool.prototype.teardown.bind(views);
    await rig.seam.restoreOne(['restored']);
    rig.memoryKb.mockReturnValue(1_151);

    jest.advanceTimersByTime(1_000);

    expect(destroy).toHaveBeenCalledWith(restored.view);
    expect(retire).not.toHaveBeenCalled();
    expect(restored.tab.view).toBe(shell);
    expect(shell.setVisible).toHaveBeenCalledWith(false);
    expect(contents.loadFile).toHaveBeenCalledTimes(1);
    expect(contents.loadFile.mock.calls[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ query: expect.objectContaining({ purpose: 'parked' }) }),
    ]));
    expect(rig.presentation.assignmentFrom(contents as unknown as Electron.WebContents)).toBeNull();
    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    await Promise.resolve();
    expect(restored.tab.warming?.phase).toBe('primed');
    expect(contents.capturePage).toHaveBeenCalledTimes(1);
    expect(rig.presentation.warm(restored.tab as Tab)).toBe(restored.tab as Tab);
    expect(views.newView).toHaveBeenCalledTimes(1);
    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
    rig.presentation.assign(restored.tab as Tab);
    expect(contents.send).toHaveBeenCalledWith(IPC_EMIT.tabsAssigned, restored.assignment);
    await rig.seam.restoreOne(['restored']);
    jest.advanceTimersByTime(10_000);
    expect(rig.memoryKb).toHaveBeenCalledTimes(2);
    expect(views.newView).toHaveBeenCalledTimes(1);
  });

  it('polls from the original baseline, allows exactly 15%, and tears down only the still-unselected restoration above it', async () => {
    const rig = restorationHost();
    const restored = await savedTab(rig, 'restored');
    const other = await savedTab(rig, 'other');
    await rig.seam.restoreOne(['restored', 'other']);
    rig.host.activeId = other.tab.id;
    rig.memoryKb.mockReturnValue(1_150);

    jest.advanceTimersByTime(999);
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(rig.memoryKb).toHaveBeenCalledTimes(2);
    expect(rig.teardown).not.toHaveBeenCalled();

    rig.memoryKb.mockReturnValue(1_151);
    jest.advanceTimersByTime(1_000);
    expect(rig.teardown).toHaveBeenCalledTimes(1);
    expect(rig.teardown).toHaveBeenCalledWith(restored.tab.id, { keepProject: true });
    expect(rig.host.activeId).toBe(other.tab.id);
    expect(other.contents.send).not.toHaveBeenCalled();
    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);

    await rig.seam.restoreOne(['other']);
    jest.advanceTimersByTime(10_000);
    expect(rig.memoryKb).toHaveBeenCalledTimes(3);
    expect(rig.teardown).toHaveBeenCalledTimes(1);
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('tears down a restoration when current memory becomes %s KB', async (currentKb) => {
    const rig = restorationHost();
    const restored = await savedTab(rig, 'restored');
    await rig.seam.restoreOne(['restored']);
    rig.memoryKb.mockReturnValue(currentKb);

    jest.advanceTimersByTime(1_000);
    jest.advanceTimersByTime(10_000);

    expect(rig.teardown).toHaveBeenCalledTimes(1);
    expect(rig.teardown).toHaveBeenCalledWith(restored.tab.id, { keepProject: true });
    expect(rig.memoryKb).toHaveBeenCalledTimes(2);
    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
    expect(rig.newView).not.toHaveBeenCalled();
  });
});

describe('restoration cancellation and promotion', () => {
  it.each(['removed-tab', 'replaced-tab', 'replaced-view', 'selected'] as const)(
    'does not admit a Project that becomes %s while its saved canvas is being read',
    async (change) => {
      const rig = restorationHost();
      const restored = await savedTab(rig, 'restored');
      const replacement = await savedTab(rig, 'replacement');

      const pending = rig.seam.restoreOne(['restored']);
      switch (change) {
        case 'removed-tab': rig.host.tabs.delete(restored.tab.id); break;
        case 'replaced-tab': rig.host.tabs.set(restored.tab.id, { ...restored.tab }); break;
        case 'replaced-view': restored.tab.view = replacement.view; break;
        case 'selected': rig.host.activeId = restored.tab.id; break;
      }
      await pending;
      jest.advanceTimersByTime(10_000);

      expect(restored.contents.send).not.toHaveBeenCalled();
      expect(replacement.contents.send).not.toHaveBeenCalled();
      expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
      expect(rig.memoryKb).not.toHaveBeenCalled();
      expect(rig.teardown).not.toHaveBeenCalled();
      expect(rig.newView).not.toHaveBeenCalled();
    },
  );

  it.each(['removed-tab', 'replaced-tab', 'missing-view', 'replaced-view', 'destroyed-view', 'destroyed-window', 'quitting'] as const)(
    'cancels without teardown or another metric read after %s',
    async (change) => {
      const rig = restorationHost();
      const restored = await savedTab(rig, 'restored');
      await rig.seam.restoreOne(['restored']);
      switch (change) {
        case 'removed-tab': rig.host.tabs.delete(restored.tab.id); break;
        case 'replaced-tab': rig.host.tabs.set(restored.tab.id, { ...restored.tab }); break;
        case 'missing-view': delete restored.tab.view; break;
        case 'replaced-view': {
          const replacement = await savedTab(rig, 'replacement');
          restored.tab.view = replacement.view;
          break;
        }
        case 'destroyed-view': restored.contents.isDestroyed.mockReturnValue(true); break;
        case 'destroyed-window': rig.windowDestroyed.mockReturnValue(true); break;
        case 'quitting': rig.host.isQuitting = true; break;
      }
      rig.memoryKb.mockReturnValue(200_000);

      jest.advanceTimersByTime(1_000);
      expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
      jest.advanceTimersByTime(10_000);

      expect(rig.memoryKb).toHaveBeenCalledTimes(1);
      expect(rig.teardown).not.toHaveBeenCalled();
      expect(restored.contents.send).toHaveBeenCalledTimes(1);
      expect(rig.newView).not.toHaveBeenCalled();
    },
  );

  it('cancels idempotently without promoting, tearing down, or resuming its guard', async () => {
    const rig = restorationHost();
    const restored = await savedTab(rig, 'restored');
    await rig.seam.restoreOne(['restored']);

    rig.presentation.cancelRestoration();
    rig.presentation.cancelRestoration();
    rig.memoryKb.mockReturnValue(200_000);
    jest.advanceTimersByTime(10_000);

    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
    expect(restored.contents.send).toHaveBeenCalledTimes(1);
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    expect(rig.teardown).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it('cancels when the view is discarded before the next budget check', async () => {
    const rig = restorationHost();
    const restored = await savedTab(rig, 'restored');
    await rig.seam.restoreOne(['restored']);

    rig.presentation.viewDiscarded(restored.tab as Tab);
    rig.memoryKb.mockReturnValue(200_000);
    jest.advanceTimersByTime(10_000);

    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    expect(rig.teardown).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it('beginQuit cancels immediately rather than waiting for the next memory poll', async () => {
    const rig = restorationHost();
    const restored = await savedTab(rig, 'restored');
    rig.host.pieces.views.dispose = mock();
    await rig.seam.restoreOne(['restored']);

    rig.host.beginQuit();

    expect(rig.host.pieces.window.quitting).toBe(true);
    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
    rig.memoryKb.mockReturnValue(200_000);
    jest.advanceTimersByTime(10_000);

    expect(restored.contents.send).toHaveBeenCalledTimes(1);
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    expect(rig.teardown).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it('does not promote another Tab or stop the restored Tab\'s guard', async () => {
    const rig = restorationHost();
    const restored = await savedTab(rig, 'restored');
    const other = await savedTab(rig, 'other');
    await rig.seam.restoreOne(['restored', 'other']);

    expect(rig.presentation.promoteRestored(other.tab as Tab)).toBe(false);
    rig.memoryKb.mockReturnValue(200_000);
    jest.advanceTimersByTime(1_000);

    expect(rig.teardown).toHaveBeenCalledWith(restored.tab.id, { keepProject: true });
    expect(other.contents.send).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });

  it('selection promotes once with a plain assignment and stops the memory guard before it can evict the selected Tab', async () => {
    const rig = restorationHost();
    const restored = await savedTab(rig, 'restored');
    await rig.seam.restoreOne(['restored']);
    rig.memoryKb.mockReturnValue(200_000);

    rig.host.activate(restored.tab.id);

    expect(rig.host.activeId).toBe(restored.tab.id);
    expect(restored.contents.send.mock.calls).toEqual([
      [IPC_EMIT.tabsAssigned, { ...restored.assignment, restoring: true }],
      [IPC_EMIT.tabsAssigned, restored.assignment],
    ]);
    expect(rig.presentation.assignmentFrom(restored.view.webContents)).toEqual(restored.assignment);
    expect(rig.presentation.promoteRestored(restored.tab as Tab)).toBe(false);
    rig.host.activate(restored.tab.id);
    rig.host.activeId = 'home';
    rig.host.activate(restored.tab.id);
    jest.advanceTimersByTime(10_000);

    expect(restored.contents.send).toHaveBeenCalledTimes(2);
    expect(restored.tab.view).toBe(restored.view);
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    expect(rig.teardown).not.toHaveBeenCalled();
    expect(rig.newView).not.toHaveBeenCalled();
  });
});

describe('saved canvas admission fails closed', () => {
  it.each(['unregistered', 'missing', 'corrupt', 'invalid', 'empty', 'non-browser'] as const)('skips a %s canvas without repairing it', async (state) => {
    const rig = restorationHost();
    const skipped = await savedTab(rig, 'skipped', (doc) => {
      if (state === 'empty') doc.nodes = {};
      if (state === 'non-browser') {
        doc.nodes.frame = {
          id: 'frame', pageId: 'page', kind: 'text', name: 'Note',
          x: 0, y: 0, width: 200, height: 100, order: 0,
          content: { text: 'Saved note', size: 'small' },
        };
      }
    });
    if (state === 'unregistered') skipped.tab.workspacePath = join(workspaceRoot, 'unregistered');
    const missingPath = join(workspaceRoot, 'missing');
    const missingDocId = state === 'missing' ? canvasDocIdFor(missingPath) : undefined;
    if (state === 'missing') skipped.tab.workspacePath = missingPath;
    const path = canvasDocPath(skipped.docId);
    if (state === 'corrupt' || state === 'invalid') {
      writeFileSync(path, state === 'corrupt' ? '{invalid json' : JSON.stringify({ version: 1, data: { nodes: [] } }));
    }
    const before = readFileSync(path, 'utf8');
    const eligible = await savedTab(rig, 'eligible');

    await rig.seam.restoreOne(['skipped', 'eligible']);

    expect(skipped.contents.send).not.toHaveBeenCalled();
    expect(eligible.contents.send).toHaveBeenCalledWith(IPC_EMIT.tabsAssigned, { ...eligible.assignment, restoring: true });
    expect(readFileSync(path, 'utf8')).toBe(before);
    if (state === 'unregistered') expect(knownCanvasDocId(skipped.tab.workspacePath!)).toBeUndefined();
    if (missingDocId !== undefined) expect(existsSync(canvasDocPath(missingDocId))).toBe(false);
    expect(rig.memoryKb).toHaveBeenCalledTimes(1);
    expect(rig.newView).not.toHaveBeenCalled();
  });
});
