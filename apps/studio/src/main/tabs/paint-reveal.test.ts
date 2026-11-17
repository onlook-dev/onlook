import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, jest, mock } from 'bun:test';
import { IPC_SEND } from '@studio/events';
import { fromMainFrame, fromSubframe, seatedTabs } from './test-support.js';
import { TAB_FIRST_PAINT_TIMEOUT_MS, TAB_PAINT_TIMEOUT_MS, TAB_PRESENT_DEADLINE_MS } from './paint.js';
import type { TabHealth } from './health.js';
import { awaitsFirstPaint, type FirstPaintPhase } from './presentation-machine.js';

function pendingReveal(waitForFirstPaint = true) {
  jest.useFakeTimers();
  let paint!: (image: { isEmpty(): boolean }) => void;
  let frame = new Promise<{ isEmpty(): boolean }>(resolve => { paint = resolve; });
  const contents = Object.assign(new EventEmitter(), {
    id: 731,
    ipc: new EventEmitter(),
    isDestroyed: () => destroyed,
    capturePage: mock(() => frame),
    reload: mock(() => { contents.emit('did-start-navigation', {}, 'about:blank', false, true); }),
    close: () => {
      destroyed = true;
      view.webContents = undefined;
      contents.emit('destroyed');
    },
  });
  let destroyed = false;
  const view = { webContents: contents as typeof contents | undefined, setVisible: mock() };
  const tab = {
    id: 'tab-1', view, isWorking: false,
    firstPaint: { kind: 'held' } as FirstPaintPhase | undefined,
    health: undefined as TabHealth | undefined,
  };
  const attach = mock();
  const reveal = mock();
  const schedule = mock();
  const windowDestroyed = { value: false };
  const host = seatedTabs({
    window: Object.assign(new EventEmitter(), {
      isDestroyed: () => windowDestroyed.value,
      contentView: { removeChildView: mock() },
    }),
    attach,
    reveal,
    spare: { schedule },
    broadcastTabs: mock(),
    publishVisibleSlots: mock(),
    tabs: new Map([[tab.id, tab]]),
    activeId: tab.id,
  });
  // A reveal puts the tab on screen; a mock that skips that leaves the host permanently mid-presentation.
  reveal.mockImplementation((shown: { id: string }) => { host.visibleId = shown.id; });
  if (waitForFirstPaint) host.revealWhenPainted(tab, view);
  return { host, tab, view, contents, attach, reveal, schedule, windowDestroyed, paint: async (empty = false) => {
    paint({ isEmpty: () => empty });
    await Promise.resolve();
  }, nextFrame: () => {
    const previous = paint;
    frame = new Promise(resolve => { paint = resolve; });
    return async () => {
      previous({ isEmpty: () => false });
      await Promise.resolve();
    };
  } };
}

afterEach(() => jest.useRealTimers());

function coveredReveal() {
  const pending = pendingReveal(false);
  delete pending.host.reveal;
  const outgoing = pendingReveal(false);
  pending.host.visibleId = outgoing.tab.id = 'outgoing';
  pending.host.tabs.set(outgoing.tab.id, outgoing.tab);
  pending.host.window.contentView.addChildView = mock();
  pending.host.raiseChrome = mock();
  pending.host.reveal(pending.tab);
  return { ...pending, outgoing };
}

function selectablePendingTabs(count: number) {
  const pending = pendingReveal(false);
  const projects = { id: 'projects', view: { webContents: Object.assign(new EventEmitter(), { id: 732, ipc: new EventEmitter(), isDestroyed: () => false, capturePage: mock(async () => ({ isEmpty: () => false })) }), setVisible: mock() } };
  const cold = Array.from({ length: count }, (_, index) => {
    const next = index === 0 ? pending : pendingReveal(false);
    next.tab.id = `cold-${String(index)}`;
    pending.host.tabs.set(next.tab.id, next.tab);
    pending.host.revealWhenPainted(next.tab, next.view);
    return next;
  });
  pending.host.tabs.set(projects.id, projects);
  pending.host.tabs.delete('tab-1');
  delete pending.host.reveal;
  delete pending.host.publishVisibleSlots;
  const pushSlots = mock();
  Object.assign(pending.host, {
    activeId: projects.id, visibleId: projects.id,
    order: [projects.id, ...cold.map(next => next.tab.id)],
    warm: (tab: unknown) => tab, raiseChrome: mock(),
    followSettingsRequest: mock(), assign: mock(), expand: mock(), pushSlots, pushOnScreen: mock(),
    slots: { forTab: () => ({ showFolder: true }) }, purposeOf: () => 'parked',
    hasReachedProduct: () => true, cooling: { touch: mock() }, persistWindows: mock(),
  });
  pending.host.window.contentView.addChildView = mock();
  pending.host.window.isFocused = () => false;
  return { host: pending.host, projects, cold, pushSlots };
}

describe('selecting a tab left before its first paint', () => {
  it('keeps the selected loading view visible when a covered warm switch is interrupted', async () => {
    const { host, projects, cold } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    expect(incoming.view.setVisible).toHaveBeenLastCalledWith(true);
    host.activate(projects.id);
    expect(host.visibleId).toBe(incoming.tab.id);
    host.activate(incoming.tab.id);

    expect(host.activeId).toBe(incoming.tab.id);
    expect(host.visibleId).toBe(incoming.tab.id);
    expect(projects.view.setVisible).toHaveBeenLastCalledWith(false);
    expect(incoming.view.setVisible).toHaveBeenLastCalledWith(true);
    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS);
    incoming.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(incoming.contents));
    await incoming.paint();
    host.activate(incoming.tab.id);
    expect(incoming.view.setVisible).toHaveBeenLastCalledWith(true);
    expect(incoming.tab.firstPaint).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
    host.window.emit('closed');
  });

  it('replaces a hanging capture on reselection and ignores its stale completion', async () => {
    const { host, projects, cold, pushSlots } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    incoming.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(incoming.contents));
    host.activate(projects.id);
    const finishPrevious = incoming.nextFrame();

    host.activate(incoming.tab.id);
    expect(incoming.contents.capturePage).toHaveBeenCalledTimes(2);
    await finishPrevious();
    expect(host.visibleId).toBe(incoming.tab.id);
    expect(awaitsFirstPaint(incoming.tab)).toBe(false);
    await incoming.paint();
    incoming.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(incoming.contents));

    expect(host.visibleId).toBe(incoming.tab.id);
    expect(pushSlots).toHaveBeenLastCalledWith({ tabId: incoming.tab.id, slots: { showFolder: true } });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('re-requests a ready cold tab without waiting for another readiness message and publishes its controls', async () => {
    const { host, projects, cold, pushSlots } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    incoming.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(incoming.contents));
    host.activate(projects.id);
    await incoming.paint(true);
    incoming.nextFrame();
    const captures = incoming.contents.capturePage.mock.calls.length;

    host.activate(incoming.tab.id);
    expect(incoming.contents.capturePage).toHaveBeenCalledTimes(captures + 1);
    expect(host.visibleId).toBe(incoming.tab.id);
    await incoming.paint();
    incoming.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(incoming.contents));

    expect(host.visibleId).toBe(incoming.tab.id);
    expect(awaitsFirstPaint(incoming.tab)).toBe(false);
    expect(pushSlots).toHaveBeenLastCalledWith({ tabId: incoming.tab.id, slots: { showFolder: true } });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reveals every reselected tab after three cold activations with no compositor response', () => {
    const { host, cold, pushSlots } = selectablePendingTabs(3);
    for (const incoming of cold) host.activate(incoming.tab.id);
    for (const incoming of cold) {
      host.activate(incoming.tab.id);
      jest.advanceTimersByTime(TAB_FIRST_PAINT_TIMEOUT_MS + TAB_PAINT_TIMEOUT_MS);
      expect(host.visibleId).toBe(incoming.tab.id);
      expect(awaitsFirstPaint(incoming.tab)).toBe(false);
      expect(pushSlots).toHaveBeenLastCalledWith({ tabId: incoming.tab.id, slots: { showFolder: true } });
    }
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not capture a pending screen before its ready-to-present signal', () => {
    const { host, projects, cold } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    host.activate(projects.id);
    host.activate(incoming.tab.id);
    expect(incoming.contents.capturePage).not.toHaveBeenCalled();
    expect(host.visibleId).toBe(incoming.tab.id);
    host.window.emit('closed');
  });

  it('bounds presentation even when repeated navigation restarts the compositor wait', () => {
    const { host, cold } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    for (let elapsed = 0; elapsed < TAB_FIRST_PAINT_TIMEOUT_MS + TAB_PAINT_TIMEOUT_MS; elapsed += 5000) {
      incoming.contents.emit('did-start-navigation', {}, 'about:blank', false, true);
      jest.advanceTimersByTime(5000);
    }
    expect(host.visibleId).toBe(incoming.tab.id);
    host.window.emit('closed');
  });
});

describe('a Tab the strip already highlights (ONL-3121)', () => {
  it('re-requests paint without hiding an already-visible selection', async () => {
    const { host, cold, pushSlots } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    incoming.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(incoming.contents));
    await incoming.paint(true);
    incoming.nextFrame();
    const captures = incoming.contents.capturePage.mock.calls.length;
    expect(host.activeId).toBe(incoming.tab.id);
    expect(host.visibleId).toBe(incoming.tab.id);

    host.activate(incoming.tab.id);
    expect(incoming.contents.capturePage).toHaveBeenCalledTimes(captures + 1);
    await incoming.paint();
    incoming.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(incoming.contents));

    expect(host.visibleId).toBe(incoming.tab.id);
    expect(pushSlots).toHaveBeenLastCalledWith({ tabId: incoming.tab.id, slots: { showFolder: true } });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('shows its own ground without readiness or a compositor response', () => {
    const { host, cold, pushSlots } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    expect(host.visibleId).toBe(incoming.tab.id);

    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS);

    expect(host.visibleId).toBe(incoming.tab.id);
    expect(awaitsFirstPaint(incoming.tab)).toBe(false);
    expect(pushSlots).toHaveBeenLastCalledWith({ tabId: incoming.tab.id, slots: { showFolder: true } });
    host.window.emit('closed');
  });

  it('prevents a late first paint from replacing the newer selected ground', async () => {
    const { host, cold } = selectablePendingTabs(2);
    const forced = cold[0]!;
    const next = cold[1]!;
    host.activate(forced.tab.id);
    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS);
    expect(host.visibleId).toBe(forced.tab.id);
    const hidden = forced.view.setVisible.mock.calls.filter(call => call[0] === false).length;

    host.activate(next.tab.id);
    forced.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(forced.contents));
    await forced.paint();

    expect(host.visibleId).toBe(next.tab.id);
    expect(forced.view.setVisible.mock.calls.filter(call => call[0] === false).length).toBe(hidden + 1);
    host.window.emit('closed');
  });

  it('still reports a Tab that never paints as failed once it is on screen', () => {
    const { host, cold } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS);
    expect(host.visibleId).toBe(incoming.tab.id);
    expect(incoming.tab.health).toBeUndefined();

    jest.advanceTimersByTime(TAB_FIRST_PAINT_TIMEOUT_MS);

    expect(incoming.tab.health).toBe('failed');
    host.window.emit('closed');
  });

  it('clears that failure when the Tab paints after all', async () => {
    const { host, cold } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS + TAB_FIRST_PAINT_TIMEOUT_MS);
    expect(incoming.tab.health).toBe('failed');

    incoming.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(incoming.contents));
    await incoming.paint();

    expect(incoming.tab.health).toBeUndefined();
    expect(host.visibleId).toBe(incoming.tab.id);
    host.window.emit('closed');
  });

  it('reports a Tab left off screen that never paints, and keeps none of its listeners', () => {
    const { host, projects, cold } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);
    host.activate(projects.id);

    jest.advanceTimersByTime(TAB_FIRST_PAINT_TIMEOUT_MS);

    expect(host.visibleId).toBe(projects.id);
    expect(incoming.tab.health).toBe('failed');
    expect(incoming.tab.firstPaint).toBeUndefined();
    expect(incoming.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
    expect(incoming.contents.listenerCount('did-start-navigation')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps the selected ground on screen however often it is clicked, and owes the deadline nothing', () => {
    const { host, cold } = selectablePendingTabs(1);
    const incoming = cold[0]!;
    host.activate(incoming.tab.id);

    // The ground is on screen outright, so nothing is waiting on the ONL-3121 deadline to put it there (ONL-3153).
    expect(host.visibleId).toBe(incoming.tab.id);
    expect(host.presenting).toBeUndefined();

    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS - 1000);
    host.activate(incoming.tab.id);
    host.activate(incoming.tab.id);
    expect(host.visibleId).toBe(incoming.tab.id);
    expect(host.presenting).toBeUndefined();

    jest.advanceTimersByTime(1000);

    expect(host.visibleId).toBe(incoming.tab.id);
    host.window.emit('closed');
  });
});

describe('a covered Tab forced on screen before it redraws (ONL-3121)', () => {
  it('still reports it when the frame never arrives', () => {
    const pending = coveredReveal();
    const { host, tab } = pending;
    delete tab.firstPaint;
    host.present();

    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS);
    expect(host.visibleId).toBe(tab.id);
    expect(pending.view.setVisible).toHaveBeenLastCalledWith(true);

    jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS);

    expect(tab.health).toBe('failed');
    host.window.emit('closed');
  });
});

describe('a Tab reveal survives its outgoing cover closing (ONL-3044)', () => {
  for (const completion of ['presented', 'capture'] as const) {
    it(`finishes on ${completion} after the outgoing contents disappear`, async () => {
      const pending = coveredReveal();
      pending.host.destroyView(pending.outgoing.view);
      expect(pending.outgoing.view.webContents).toBeUndefined();
      expect(pending.outgoing.contents.isDestroyed()).toBe(true);

      if (completion === 'presented') {
        expect(() => pending.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(pending.contents))).not.toThrow();
      } else {
        pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
        await pending.paint();
      }

      expect(pending.host.visibleId).toBe(pending.tab.id);
      expect(pending.host.publishVisibleSlots).toHaveBeenCalledWith(pending.tab);
      expect(pending.host.cover).toBeUndefined();
      expect(pending.view.setVisible).toHaveBeenLastCalledWith(true);
      expect(pending.outgoing.view.setVisible).not.toHaveBeenCalled();
      expect(pending.contents.ipc.listenerCount(IPC_SEND.tabPresented)).toBe(0);
      expect(pending.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
      expect(pending.contents.listenerCount('destroyed')).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });
  }

  it('hides a surviving outgoing cover exactly once', () => {
    const pending = coveredReveal();
    pending.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(pending.contents));
    pending.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(pending.contents));
    expect(pending.outgoing.view.setVisible).toHaveBeenCalledTimes(1);
    expect(pending.outgoing.view.setVisible).toHaveBeenCalledWith(false);
    expect(pending.host.visibleId).toBe(pending.tab.id);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels a superseded reveal after its outgoing cover closes', () => {
    const pending = coveredReveal();
    pending.host.destroyView(pending.outgoing.view);
    pending.host.dropCover();
    pending.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(pending.contents));
    expect(pending.view.setVisible).toHaveBeenLastCalledWith(false);
    expect(pending.host.visibleId).toBe(pending.outgoing.tab.id);
    expect(pending.host.cover).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('a pending Tab reveal owns its paint and listeners (ONL-2738, ONL-2807)', () => {
  it('never marks a restored cold tab unhealthy when its first paint arrives after the warm deadline', async () => {
    const pending = pendingReveal();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS + 1000);
    expect(pending.tab.health).toBeUndefined();
    await pending.paint();
    expect(pending.tab.health).toBeUndefined();
    expect(pending.reveal).toHaveBeenCalledTimes(1);
  });
  it('cancels the backstop when destroyView closes the contents before paint', () => {
    const pending = pendingReveal();
    pending.host.destroyView(pending.view);

    expect(() => jest.advanceTimersByTime(1500)).not.toThrow();
    expect(pending.attach).not.toHaveBeenCalled();
    expect(pending.schedule).not.toHaveBeenCalled();
    expect(pending.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels when Electron destroys the contents outside destroyView', () => {
    const pending = pendingReveal();
    pending.contents.close();

    expect(() => jest.advanceTimersByTime(1500)).not.toThrow();
    expect(pending.attach).not.toHaveBeenCalled();
    expect(pending.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reveals once after ui:ready and a compositor frame, then removes its listeners', async () => {
    const pending = pendingReveal();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    jest.advanceTimersByTime(1500);
    expect(pending.attach).not.toHaveBeenCalled();
    await pending.paint();

    expect(pending.attach).toHaveBeenCalledTimes(1);
    expect(pending.reveal).toHaveBeenCalledWith(pending.tab);
    expect(pending.schedule).toHaveBeenCalledTimes(1);
    expect(awaitsFirstPaint(pending.tab)).toBe(false);
    expect(pending.contents.listenerCount('destroyed')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps the outgoing interface beyond both old backstops until a late ui:ready paints', async () => {
    const pending = pendingReveal();
    jest.advanceTimersByTime(5000);
    expect(pending.attach).not.toHaveBeenCalled();
    expect(pending.reveal).not.toHaveBeenCalled();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    expect(pending.reveal).not.toHaveBeenCalled();
    await pending.paint();

    expect(pending.attach).toHaveBeenCalledTimes(1);
    expect(pending.reveal).toHaveBeenCalledTimes(1);
    expect(pending.schedule).toHaveBeenCalledTimes(1);
    expect(pending.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
    expect(pending.contents.listenerCount('destroyed')).toBe(0);
  });

  it('does not attach a pending Tab after the window is destroyed', () => {
    const pending = pendingReveal();
    pending.windowDestroyed.value = true;
    pending.host.window.emit('closed');
    jest.advanceTimersByTime(1500);

    expect(pending.attach).not.toHaveBeenCalled();
    expect(pending.schedule).not.toHaveBeenCalled();
    expect(pending.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
    expect(pending.contents.listenerCount('destroyed')).toBe(0);
  });

  it('keeps a background Tab hidden when it finishes painting', async () => {
    const pending = pendingReveal();
    pending.host.activeId = 'tab-2';
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    await pending.paint();

    expect(pending.attach).toHaveBeenCalledTimes(1);
    expect(pending.view.setVisible).toHaveBeenCalledWith(false);
    expect(pending.reveal).not.toHaveBeenCalled();
  });

  it('ignores a compositor reply after the pending contents are destroyed', async () => {
    const pending = pendingReveal();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    pending.contents.close();
    await pending.paint();
    expect(pending.attach).not.toHaveBeenCalled();
    expect(pending.reveal).not.toHaveBeenCalled();
  });

  it('reveals on a readiness timeout and still recovers on late readiness', async () => {
    const pending = pendingReveal();
    jest.advanceTimersByTime(TAB_FIRST_PAINT_TIMEOUT_MS);
    expect(pending.tab.health).toBe('failed');
    expect(pending.attach).toHaveBeenCalledTimes(1);
    expect(pending.reveal).toHaveBeenCalledTimes(1);
    Object.assign(pending.tab, { health: undefined });
    pending.contents.emit('did-finish-load');
    expect(pending.tab.health).toBe('failed');
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    await pending.paint();
    expect(pending.tab.health).toBeUndefined();
    expect(pending.reveal).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels an outstanding capture on Reload and waits for the new document', async () => {
    const pending = pendingReveal();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    jest.advanceTimersByTime(TAB_FIRST_PAINT_TIMEOUT_MS);
    pending.host.reload(pending.tab.id);
    expect(pending.contents.reload).toHaveBeenCalledTimes(1);
    await pending.paint();
    expect(pending.reveal).toHaveBeenCalledTimes(1);
    expect(pending.tab.health).toBe('failed');
    pending.nextFrame();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    expect(pending.reveal).toHaveBeenCalledTimes(1);
    expect(pending.contents.capturePage).toHaveBeenCalledTimes(2);
    expect(pending.tab.health).toBe('failed');
    await pending.paint();
    expect(pending.reveal).toHaveBeenCalledTimes(1);
    expect(pending.tab.health).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('a view listener takes only its view\'s own main frame', () => {
  it('a subframe\'s `ui:ready` neither marks a held-back Tab ready nor asks for its frame', async () => {
    const pending = pendingReveal();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromSubframe(pending.contents));
    expect(pending.contents.capturePage).not.toHaveBeenCalled();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    expect(pending.contents.capturePage).toHaveBeenCalledTimes(1);
    await pending.paint();
    expect(pending.attach).toHaveBeenCalledTimes(1);
    pending.host.window.emit('closed');
  });

  it('a subframe\'s `tab:presented` leaves the cover up; the main frame\'s takes it down', () => {
    const pending = coveredReveal();
    pending.contents.ipc.emit(IPC_SEND.tabPresented, fromSubframe(pending.contents));
    expect(pending.host.cover).toBeDefined();
    expect(pending.host.visibleId).toBe('outgoing');
    pending.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(pending.contents));
    expect(pending.host.cover).toBeUndefined();
    expect(pending.host.visibleId).toBe(pending.tab.id);
    pending.host.window.emit('closed');
  });

  it('a subframe\'s `ui:ready` under a cover asks for no frame', () => {
    const pending = coveredReveal();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromSubframe(pending.contents));
    expect(pending.contents.capturePage).not.toHaveBeenCalled();
    pending.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(pending.contents));
    expect(pending.contents.capturePage).toHaveBeenCalledTimes(1);
    pending.host.window.emit('closed');
  });
});
