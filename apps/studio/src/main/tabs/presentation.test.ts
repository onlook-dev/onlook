import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, jest, mock } from 'bun:test';
import { IPC_SEND } from '@studio/events';
import { fromMainFrame, seatedTabs } from './test-support.js';
import type { TabHealth } from './health.js';
import { TAB_PAINT_TIMEOUT_MS, TAB_PRESENT_DEADLINE_MS } from './paint.js';

function switchingTab() {
  jest.useFakeTimers();
  let resolve!: (image: { isEmpty(): boolean }) => void;
  let frame = new Promise<{ isEmpty(): boolean }>(done => { resolve = done; });
  const contents = Object.assign(new EventEmitter(), { id: 740, ipc: new EventEmitter(), isDestroyed: () => false, capturePage: mock(() => frame) });
  const incoming = { id: 'incoming', view: { webContents: contents, setVisible: mock() }, health: undefined as TabHealth | undefined };
  const outgoingContents = Object.assign(new EventEmitter(), {
    id: 741, ipc: new EventEmitter(), isDestroyed: () => false,
    capturePage: mock(() => new Promise(() => {})),
  });
  const outgoing = { id: 'outgoing', view: { webContents: outgoingContents, setVisible: mock() } };
  const window = Object.assign(new EventEmitter(), { isDestroyed: () => false, isFocused: () => false, contentView: { addChildView: mock() } });
  const host = seatedTabs({
    window, tabs: new Map([[incoming.id, incoming], [outgoing.id, outgoing]]),
    visibleId: outgoing.id, raiseChrome: mock(), broadcastTabs: mock(),
  });
  host.reveal(incoming);
  return { host, incoming, outgoing, contents, paint: async (empty = false) => {
    resolve({ isEmpty: () => empty });
    await Promise.resolve();
  }, nextFrame: () => { frame = new Promise(done => { resolve = done; }); } };
}

afterEach(() => jest.useRealTimers());

describe('the outgoing tab covers an incoming tab until it presents (ONL-2807)', () => {
  it('keeps the last painted editor visible through rapid switches inside the cover window', async () => {
    const tab = switchingTab();
    const thirdContents = Object.assign(new EventEmitter(), {
      id: 742, ipc: new EventEmitter(), isDestroyed: () => false,
      capturePage: mock(() => new Promise(() => {})),
    });
    const third = { id: 'third', view: { webContents: thirdContents, setVisible: mock() } };
    tab.host.tabs.set(third.id, third);
    jest.advanceTimersByTime(40);
    tab.host.reveal(third);
    expect(tab.outgoing.view.setVisible).not.toHaveBeenCalledWith(false);
    expect(tab.host.visibleId).toBe(tab.outgoing.id);
    await tab.paint();
    expect(tab.outgoing.view.setVisible).not.toHaveBeenCalledWith(false);
    thirdContents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(thirdContents));
    expect(tab.outgoing.view.setVisible).toHaveBeenCalledWith(false);
    expect(tab.host.visibleId).toBe(third.id);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels a warm switch when activating a cold tab still awaiting its first paint', async () => {
    const tab = switchingTab();
    const coldView = { webContents: { id: 742, isDestroyed: () => false }, setVisible: mock() };
    const cold = { id: 'cold' };
    tab.host.tabs.set(cold.id, cold);
    Object.assign(tab.host, {
      activeId: tab.incoming.id, order: [tab.outgoing.id, tab.incoming.id, cold.id],
      // Warming registers the tab it hands back, so the host reads the promoted view and not the cold chip.
      warm: mock(() => {
        const warmed = { ...cold, view: coldView, firstPaint: { kind: 'held' } };
        tab.host.tabs.set(cold.id, warmed);
        return warmed;
      }),
      attach: mock(), spare: { schedule: mock() },
      followSettingsRequest: mock(), assign: mock(), expand: mock(), pushSlots: mock(), pushOnScreen: mock(),
      slots: { forTab: mock(() => []) }, purposeOf: mock(() => 'parked'),
      hasReachedProduct: mock(() => true), cooling: { touch: mock() }, persistWindows: mock(),
    });
    jest.advanceTimersByTime(150);
    tab.host.activate(cold.id);
    expect(tab.host.activeId).toBe(cold.id);
    expect(tab.outgoing.view.setVisible).toHaveBeenCalledWith(false);
    expect(tab.host.visibleId).toBe(cold.id);
    await tab.paint();
    expect(tab.outgoing.view.setVisible).toHaveBeenCalledWith(false);
    expect(tab.incoming.view.setVisible).toHaveBeenLastCalledWith(false);

    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS);

    expect(tab.host.visibleId).toBe(cold.id);
    expect(coldView.setVisible).toHaveBeenLastCalledWith(true);
    expect(tab.outgoing.view.setVisible).toHaveBeenLastCalledWith(false);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('stops covering after two frames instead of holding the tab the user left (ONL-3153)', async () => {
    const tab = switchingTab();
    jest.advanceTimersByTime(49);
    expect(tab.outgoing.view.setVisible).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);

    expect(tab.outgoing.view.setVisible).toHaveBeenCalledWith(false);
    jest.advanceTimersByTime(100);
    expect(tab.contents.capturePage).toHaveBeenCalledTimes(1);
    expect(tab.outgoing.view.setVisible).toHaveBeenCalledWith(false);
    expect(tab.host.visibleId).toBe(tab.incoming.id);
    await tab.paint();
    expect(tab.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
  });

  it('accepts the renderer presentation without waiting for the fallback', () => {
    const tab = switchingTab();
    tab.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(tab.contents));
    jest.advanceTimersByTime(1500);
    expect(tab.outgoing.view.setVisible).toHaveBeenCalledTimes(1);
    expect(tab.contents.capturePage).not.toHaveBeenCalled();
  });

  it('ignores a late compositor reply when the user returns to the covering tab', async () => {
    const tab = switchingTab();
    jest.advanceTimersByTime(150);
    tab.host.reveal(tab.outgoing);
    const visibilityCalls = tab.outgoing.view.setVisible.mock.calls.length;
    await tab.paint();
    expect(tab.outgoing.view.setVisible).toHaveBeenLastCalledWith(true);
    expect(tab.outgoing.view.setVisible).toHaveBeenCalledTimes(visibilityCalls);
    expect(tab.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
  });

  it('retries an empty capture when a reload reports ready, without taking the tab off screen', async () => {
    const tab = switchingTab();
    jest.advanceTimersByTime(150);
    await tab.paint(true);
    expect(tab.host.visibleId).toBe(tab.incoming.id);
    expect(tab.incoming.view.setVisible).toHaveBeenLastCalledWith(true);
    expect(tab.incoming.health).toBeUndefined();
    tab.nextFrame();
    tab.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(tab.contents));
    await tab.paint();
    expect(tab.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('clears a paint-owned failure after switching away and returning to a recovered tab', async () => {
    const tab = switchingTab();
    jest.advanceTimersByTime(150);
    await tab.paint(true);
    jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS);
    expect(tab.incoming.health).toBe('failed');
    tab.host.reveal(tab.outgoing);
    tab.outgoing.view.webContents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(tab.outgoing.view.webContents));
    tab.host.reveal(tab.incoming);
    tab.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(tab.contents));
    expect(tab.incoming.health).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('never clears a native failure just because an old frame presents', () => {
    const tab = switchingTab();
    Object.assign(tab.incoming, { health: 'failed' });
    tab.contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(tab.contents));
    expect(tab.incoming.health).toBe('failed');
  });

  it('clears a timed-out switch when its outstanding compositor frame finally arrives', async () => {
    const tab = switchingTab();
    jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS);
    expect(tab.incoming.health).toBe('failed');
    await tab.paint();
    expect(tab.incoming.health).toBeUndefined();
    expect(tab.outgoing.view.setVisible).toHaveBeenCalledWith(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('retains a native load failure arriving between a paint timeout and its late capture', async () => {
    const tab = switchingTab();
    tab.host.observeHealth(tab.incoming, tab.incoming.view);
    jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS);
    expect(tab.incoming.health).toBe('failed');
    tab.contents.emit('did-fail-load', {}, -105, 'unreachable', 'about:blank', true);
    await tab.paint();
    expect(tab.incoming.health).toBe('failed');
  });

  it('still clears a late paint failure after an aborted navigation or subframe load failure', async () => {
    for (const failure of [{ errorCode: -3, isMainFrame: true }, { errorCode: -105, isMainFrame: false }]) {
      const tab = switchingTab();
      tab.host.observeHealth(tab.incoming, tab.incoming.view);
      jest.advanceTimersByTime(TAB_PAINT_TIMEOUT_MS);
      tab.contents.emit('did-fail-load', {}, failure.errorCode, 'ignored', 'about:blank', failure.isMainFrame);
      await tab.paint();
      expect(tab.incoming.health).toBeUndefined();
    }
  });
});
