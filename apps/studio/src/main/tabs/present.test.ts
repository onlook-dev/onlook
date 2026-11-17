import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, jest, mock } from 'bun:test';
import { IPC_SEND } from '@studio/events';
import { fromMainFrame, fromSubframe, seatedTabs } from './test-support.js';
import { COVER_GROUND_MS, COVER_HOLD_MS, PRESENT_CAPTURE_DELAY_MS } from './presentation.js';
import { TAB_FIRST_PAINT_TIMEOUT_MS, TAB_PRESENT_DEADLINE_MS } from './paint.js';
import { awaitsFirstPaint, isWatched, type FirstPaintPhase } from './presentation-machine.js';
import { PREWARM_GAP_MS, PREWARM_READY_TIMEOUT_MS } from './prewarm.js';
import { ClosedTabs } from './reopen.js';

function hostShowingHome() {
  jest.useFakeTimers();
  let paint!: (image: { isEmpty(): boolean }) => void;
  let frame = new Promise<{ isEmpty(): boolean }>(resolve => { paint = resolve; });
  const contents = Object.assign(new EventEmitter(), {
    id: 3121, ipc: new EventEmitter(), isDestroyed: mock(() => false),
    capturePage: mock(() => frame),
    loadFile: mock(async (_file: string, _options?: { query?: Record<string, string> }) => {}), loadURL: mock(async () => {}),
  });
  const view = { webContents: contents, setVisible: mock(), setBounds: mock() };
  const home = { id: 'home', isWorking: false, view: { webContents: { id: 3122, isDestroyed: () => false }, setVisible: mock() } };
  const pushSlots = mock();
  const host = seatedTabs({
    window: Object.assign(new EventEmitter(), {
      isVisible: () => true, isFocused: () => false, isDestroyed: () => false,
      contentView: { addChildView: mock() },
    }),
    seq: 0, activation: 0,
    tabs: new Map([[home.id, home]]), order: [home.id], activeId: home.id, visibleId: home.id,
    closed: new ClosedTabs(),
    spare: { take: mock(() => undefined), schedule: mock(), arm: mock() },
    newView: mock(() => view), observeHealth: mock(), layout: mock(), attach: mock(),
    destroyView: mock(), isAtProjectLimit: () => false, startCreate: mock(),
    slots: { forget: mock(), forTab: () => ({ showFolder: true }) },
    cooling: { forget: mock(), touch: mock(), start: mock() },
    purposeOf: () => 'project', hasReachedProduct: () => true,
    raiseChrome: mock(), broadcastTabs: mock(), persistWindows: mock(),
    followSettingsRequest: mock(), assign: mock(), expand: mock(), pushSlots, pushOnScreen: mock(),
  });
  return { host, home, view, contents, pushSlots, paint: async (empty = false) => {
    paint({ isEmpty: () => empty });
    await Promise.resolve();
  }, nextFrame: () => { frame = new Promise(resolve => { paint = resolve; }); } };
}

afterEach(() => jest.useRealTimers());

describe('a project created from the tab strip reaches the screen (ONL-3121)', () => {
  it('shows its own loading ground at the press before readiness or capture resolves (ONL-3153)', () => {
    const { host, home, view, contents, pushSlots } = hostShowingHome();
    const id = host.open('/fixture/source', 'plus');

    expect(host.visibleId).toBe(id);
    expect(view.setVisible).toHaveBeenLastCalledWith(true);
    expect(home.view.setVisible).toHaveBeenLastCalledWith(false);
    expect(pushSlots).toHaveBeenLastCalledWith({ tabId: id, slots: { showFolder: true } });
    expect(contents.capturePage).not.toHaveBeenCalled();
    host.window.emit('closed');
  });

  it('goes on screen when the user clicks the tab the strip highlights', async () => {
    const pending = hostShowingHome();
    const { host, home, contents, pushSlots } = pending;
    const id = host.open('/fixture/source', 'plus');
    expect(host.activeId).toBe(id);
    expect(host.visibleId).toBe(id);
    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    await pending.paint(true);
    pending.nextFrame();
    const captures = contents.capturePage.mock.calls.length;

    host.activate(id);
    expect(contents.capturePage).toHaveBeenCalledTimes(captures + 1);
    await pending.paint();
    contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(contents));

    expect(host.visibleId).toBe(id);
    expect(pending.view.setVisible).toHaveBeenLastCalledWith(true);
    expect(home.view.setVisible).toHaveBeenLastCalledWith(false);
    expect(pushSlots).toHaveBeenLastCalledWith({ tabId: id, slots: { showFolder: true } });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stays on its own ground without waiting for the deadline when its first frame never arrives', () => {
    const pending = hostShowingHome();
    const { host, home } = pending;
    const id = host.open('/fixture/source', 'plus');
    expect(host.visibleId).toBe(id);

    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS);

    expect(host.visibleId).toBe(id);
    expect(pending.view.setVisible).toHaveBeenLastCalledWith(true);
    expect(home.view.setVisible).toHaveBeenLastCalledWith(false);
    host.window.emit('closed');
  });
});

describe('restored projects present without a paint dependency (ONL-3153)', () => {
  for (const useSpare of [false, true]) {
    it(`attaches and shows a cold project before readiness, spare=${String(useSpare)}`, async () => {
      const pending = hostShowingHome();
      const { host, home, view, contents } = pending;
      const cold = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
      host.tabs.set(cold.id, cold);
      host.order.push(cold.id);
      if (useSpare) host.spare.take.mockImplementation(() => ({ id: 'spare', view }));
      contents.capturePage.mockImplementation(async () => ({
        isEmpty: () => host.attach.mock.calls.length === 0 || view.setVisible.mock.lastCall?.[0] !== true,
      }));

      host.activate(cold.id);

      const selectedId = useSpare ? 'spare' : cold.id;
      expect(host.activeId).toBe(selectedId);
      expect(host.visibleId).toBe(selectedId);
      expect(host.attach).toHaveBeenCalledWith(view);
      expect(home.view.setVisible).toHaveBeenLastCalledWith(false);
      contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
      await Promise.resolve();
      expect(host.tabs.get(selectedId)?.firstPaint).toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
      host.window.emit('closed');
    });
  }
});

describe('a launch warms the tabs it restored cold (ONL-3153)', () => {
  it('builds a renderer in the background, off screen, without taking the spare', () => {
    const { host, home, view, contents } = hostShowingHome();
    const cold: { id: string; workspacePath: string; isWorking: boolean; view?: unknown; warming?: { phase: string } } = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);

    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    expect(cold.view).toBe(view);
    expect(cold.warming?.phase).toBe('loading');
    expect(host.visibleId).toBe(home.id);
    expect(view.setVisible).toHaveBeenLastCalledWith(false);
    expect(host.spare.take).not.toHaveBeenCalled();
    expect(contents.loadFile.mock.calls[0]?.[1]?.query?.['purpose']).toBe('parked');
    host.window.emit('closed');
  });

  it('builds one renderer at a time, the next only once this one has its frame', async () => {
    const pending = hostShowingHome();
    const { host, contents } = pending;
    for (const id of ['restored-a', 'restored-b']) {
      host.tabs.set(id, { id, workspacePath: `/fixture/${id}`, isWorking: false });
      host.order.push(id);
    }

    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    expect(host.newView).toHaveBeenCalledTimes(1);

    // The gap alone does not start the next one: it waits on this renderer's own report.
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    expect(host.newView).toHaveBeenCalledTimes(1);

    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    await pending.paint();
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    expect(host.newView).toHaveBeenCalledTimes(2);
    host.window.emit('closed');
  });

  it('takes a warming renderer\'s report from its main frame alone: a subframe\'s asks for no frame and frees no turn', async () => {
    const pending = hostShowingHome();
    const { host, contents } = pending;
    for (const id of ['restored-a', 'restored-b']) {
      host.tabs.set(id, { id, workspacePath: `/fixture/${id}`, isWorking: false });
      host.order.push(id);
    }

    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    contents.ipc.emit(IPC_SEND.uiReady, fromSubframe(contents));
    expect(contents.capturePage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    expect(host.newView).toHaveBeenCalledTimes(1);

    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    expect(contents.capturePage).toHaveBeenCalledTimes(1);
    await pending.paint();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    expect(host.newView).toHaveBeenCalledTimes(2);
    host.window.emit('closed');
  });

  it('warms the next one when a renderer never reports at all', () => {
    const { host } = hostShowingHome();
    for (const id of ['restored-a', 'restored-b']) {
      host.tabs.set(id, { id, workspacePath: `/fixture/${id}`, isWorking: false });
      host.order.push(id);
    }

    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    jest.advanceTimersByTime(PREWARM_READY_TIMEOUT_MS + PREWARM_GAP_MS);

    expect(host.newView).toHaveBeenCalledTimes(2);
    host.window.emit('closed');
  });

  it('answers its renderer nothing until the press, so the project stays unopened', () => {
    const { host, contents } = hostShowingHome();
    const cold = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    expect(host.assignmentFrom(contents)).toBeNull();
    host.window.emit('closed');
  });

  it('tells the warmed renderer what it is when the user presses its tab', () => {
    const { host, view } = hostShowingHome();
    const cold = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    host.activate(cold.id);

    // A warmed Tab is a warm Tab: the press reveals it behind the cover, not through the loading ground.
    expect(view.setVisible).toHaveBeenLastCalledWith(true);
    expect(host.assign).toHaveBeenCalledWith(cold);
    host.window.emit('closed');
  });

  it('keeps the cover up for a press that beat the warm to its first frame, and reveals on that frame', async () => {
    const pending = hostShowingHome();
    const { host, contents } = pending;
    const cold = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    host.activate(cold.id);

    // Nothing is drawn yet, so two frames would uncover an empty view — the surface that was rejected.
    jest.advanceTimersByTime(COVER_HOLD_MS);
    expect(host.visibleId).toBe('home');
    jest.advanceTimersByTime(PRESENT_CAPTURE_DELAY_MS);
    expect(contents.capturePage).toHaveBeenCalled();
    await pending.paint();

    expect(host.visibleId).toBe(cold.id);
    host.window.emit('closed');
  });

  it('uncovers a press whose warm never paints once the ceiling passes', () => {
    const { host } = hostShowingHome();
    const cold = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    host.activate(cold.id);
    jest.advanceTimersByTime(COVER_GROUND_MS);

    // Past the ceiling an empty view is the lesser evil: the cover is the Tab the user left.
    expect(host.visibleId).toBe(cold.id);
    expect(host.presenting).toBeUndefined();
    host.window.emit('closed');
  });

  it('uncovers at two frames when the warm already took one', async () => {
    const pending = hostShowingHome();
    const { host, contents } = pending;
    const cold = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    await pending.paint();
    pending.nextFrame();

    host.activate(cold.id);
    jest.advanceTimersByTime(COVER_HOLD_MS);

    expect(host.visibleId).toBe(cold.id);
    host.window.emit('closed');
  });

  it('takes a frame once its renderer reports, so the press has nothing left to wait for', async () => {
    const pending = hostShowingHome();
    const { host, contents } = pending;
    const cold: { id: string; workspacePath: string; isWorking: boolean; warming?: { phase: string } } = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    expect(cold.warming?.phase).toBe('loading');

    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    expect(cold.warming?.phase).toBe('ready');
    expect(contents.capturePage).toHaveBeenCalled();
    await pending.paint();

    expect(cold.warming?.phase).toBe('primed');
    host.window.emit('closed');
  });

  it('reports nothing about a Tab the user never pressed, however its renderer behaves', () => {
    const { host, contents } = hostShowingHome();
    const cold = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    jest.advanceTimersByTime(TAB_FIRST_PAINT_TIMEOUT_MS);

    // Nobody is watching it, so a renderer that never gives a frame is not a failure to report.
    expect(host.tabs.get(cold.id)?.health).toBeUndefined();
    expect(host.broadcastTabs).not.toHaveBeenCalled();
    host.window.emit('closed');
  });

  it('ends the warm when the press takes it, and a frame still in flight changes nothing', async () => {
    const pending = hostShowingHome();
    const { host, contents } = pending;
    const cold: { id: string; workspacePath: string; isWorking: boolean; warming?: { phase: string } } = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));

    host.activate(cold.id);
    expect(cold.warming).toBeUndefined();
    await pending.paint();

    expect(cold.warming).toBeUndefined();
    expect(host.assign).toHaveBeenCalledWith(cold);
    host.window.emit('closed');
  });

  it('warms the next restored tab when the press takes the one still warming', () => {
    const { host } = hostShowingHome();
    const restored: Record<string, { id: string; workspacePath: string; isWorking: boolean; view?: unknown; warming?: { phase: string } }> = {};
    for (const id of ['restored-a', 'restored-b']) {
      restored[id] = { id, workspacePath: `/fixture/${id}`, isWorking: false };
      host.tabs.set(id, restored[id]);
      host.order.push(id);
    }
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    expect(restored['restored-b']?.view).toBeUndefined();

    // The press ends this warm before it ever paints, and the queue's turn is the warm's end, not the frame.
    host.activate('restored-a');
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    expect(restored['restored-b']?.warming?.phase).toBe('loading');
    host.window.emit('closed');
  });

  it('tells the tab what it is when the press rebuilds a warmed renderer that died', () => {
    const { host, view, contents } = hostShowingHome();
    const cold = { id: 'restored', workspacePath: '/fixture/restored', isWorking: false };
    host.tabs.set(cold.id, cold);
    host.order.push(cold.id);
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    // Dead while parked: the press frees the corpse and builds a renderer, which knows nothing about the project.
    contents.isDestroyed.mockReturnValue(true);
    contents.emit('destroyed');
    host.activate(cold.id);

    expect(host.destroyView).toHaveBeenCalledWith(view);
    expect(host.newView).toHaveBeenCalledTimes(2);
    expect(host.assign).toHaveBeenCalledWith(cold);
    host.window.emit('closed');
  });
});

describe('closing the tab on screen (ONL-3121)', () => {
  it('brings the selected tab on screen', () => {
    const { host, home } = hostShowingHome();
    const selected = { id: 'selected', isWorking: false, view: { webContents: { id: 3123, isDestroyed: () => false }, setVisible: mock() } };
    host.tabs.set(selected.id, selected);
    host.order = [home.id, selected.id];
    host.activeId = selected.id;

    host.close(home.id);

    expect(host.visibleId).toBe(selected.id);
    expect(selected.view.setVisible).toHaveBeenCalledWith(true);
  });
});

describe('the prewarm queue\'s turn (ONL-3153)', () => {
  it('is handed on once: pressing a Tab that already gave its frame starts no warm beside the next one', async () => {
    const pending = hostShowingHome();
    const { host, contents } = pending;
    for (const id of ['restored-a', 'restored-b', 'restored-c']) {
      host.tabs.set(id, { id, workspacePath: `/fixture/${id}`, isWorking: false });
      host.order.push(id);
    }
    host.armSpare();
    jest.advanceTimersByTime(PREWARM_GAP_MS);
    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    await pending.paint();
    pending.nextFrame();

    host.activate('restored-a');
    jest.advanceTimersByTime(PREWARM_GAP_MS);

    expect(host.newView).toHaveBeenCalledTimes(2);
    host.window.emit('closed');
  });
});

describe('a Tab is rebuilt while its old view is still closing', () => {
  function watchedOldView() {
    const pending = hostShowingHome();
    const oldContents = Object.assign(new EventEmitter(), {
      id: 3130, ipc: new EventEmitter(), isDestroyed: mock(() => false), capturePage: mock((): Promise<{ isEmpty(): boolean }> => new Promise(() => {})),
    });
    const oldView = { webContents: oldContents, setVisible: mock() };
    const tab: { id: string; workspacePath: string; isWorking: boolean; view: unknown; health?: string; idle?: { wake(): Promise<void> }; firstPaint?: FirstPaintPhase } = {
      id: 'asleep', workspacePath: '/fixture/asleep', isWorking: false, view: oldView,
    };
    pending.host.tabs.set(tab.id, tab);
    pending.host.order.push(tab.id);
    pending.host.holdBack(tab);
    pending.host.revealWhenPainted(tab, oldView);
    return { ...pending, tab, oldContents, oldView };
  }

  it('after a wake that fails: the rebuilt view stays watched when the old one is destroyed, can be asked for its frame, and paints', async () => {
    const pending = watchedOldView();
    const { host, tab, view, contents, oldContents } = pending;
    tab.idle = { wake: () => Promise.reject(new Error('wake refused')) };

    host.activate(tab.id);
    for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();

    // The failed wake tore the old view down and the same press built a new one, in one turn.
    expect(tab.view).toBe(view);
    expect(host.activeId).toBe(tab.id);
    expect(host.visibleId).toBe(tab.id);

    oldContents.emit('destroyed');
    expect(isWatched(tab)).toBe(true);

    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    expect(contents.capturePage).toHaveBeenCalledTimes(1);
    host.activate(tab.id);
    expect(contents.capturePage).toHaveBeenCalledTimes(2);

    await pending.paint();
    expect(isWatched(tab)).toBe(false);
    expect(tab.health).toBeUndefined();
    expect(host.visibleId).toBe(tab.id);
    expect(view.setVisible).toHaveBeenLastCalledWith(true);
    host.window.emit('closed');
  });

  it('after a wake that fails: nothing is left listening on the view that was torn down', async () => {
    const { host, tab, oldContents } = watchedOldView();
    tab.idle = { wake: () => Promise.reject(new Error('wake refused')) };

    host.activate(tab.id);
    for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();

    expect(oldContents.listenerCount('destroyed')).toBe(0);
    expect(oldContents.listenerCount('did-start-navigation')).toBe(0);
    expect(oldContents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
    host.window.emit('closed');
  });

  it('after its renderer died while parked: the press starts a fresh watch even before the dead view reports `destroyed`', async () => {
    const pending = watchedOldView();
    const { host, tab, view, contents, oldContents } = pending;
    oldContents.isDestroyed.mockReturnValue(true);

    host.activate(tab.id);

    expect(tab.view).toBe(view);
    expect(oldContents.listenerCount('destroyed')).toBe(0);
    expect(isWatched(tab)).toBe(true);
    expect(awaitsFirstPaint(tab)).toBe(false);
    expect(host.visibleId).toBe(tab.id);

    oldContents.emit('destroyed');
    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    await pending.paint();

    expect(isWatched(tab)).toBe(false);
    expect(tab.health).toBeUndefined();
    host.window.emit('closed');
  });

  it('a Tab cooled under its watch and pressed onto a painted spare is revealed as any warm Tab, carrying nothing from the view it lost', () => {
    const { host, tab, view, home } = watchedOldView();
    host.teardown(tab.id);
    expect(tab.view).toBeUndefined();
    host.spare.take.mockReturnValueOnce({ id: 'tab-9', view, hasPainted: true });

    host.activate(tab.id);

    const moved = host.tabs.get('tab-9');
    expect(moved.view).toBe(view);
    expect(moved.firstPaint).toBeUndefined();
    // Behind the cover, as a painted view is: the Tab the user left stays up until this one redraws or the hold ends.
    expect(host.visibleId).toBe(home.id);
    jest.advanceTimersByTime(COVER_HOLD_MS);
    expect(host.visibleId).toBe('tab-9');
    host.window.emit('closed');
  });

  it('a watched Tab closed before its frame: the frame of the closing view puts nothing back in the window', async () => {
    const pending = watchedOldView();
    const { host, tab, oldContents } = pending;
    let paintOld!: (image: { isEmpty(): boolean }) => void;
    oldContents.capturePage.mockImplementation(() => new Promise((resolve) => { paintOld = resolve; }));
    oldContents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(oldContents));

    host.close(tab.id);
    paintOld({ isEmpty: () => false });
    await Promise.resolve();

    expect(host.attach).not.toHaveBeenCalled();
    expect(host.spare.schedule).not.toHaveBeenCalled();
    expect(oldContents.listenerCount('destroyed')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
    host.window.emit('closed');
  });
});
