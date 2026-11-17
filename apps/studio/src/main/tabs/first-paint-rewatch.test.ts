import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, jest, mock } from 'bun:test';
import { IPC_SEND } from '@studio/events';
import { TAB_FIRST_PAINT_TIMEOUT_MS } from './paint.js';
import { fromMainFrame, seatedTabs } from './test-support.js';

function watchedView(id: number) {
  let paint!: (image: { isEmpty(): boolean }) => void;
  const frame = new Promise<{ isEmpty(): boolean }>(resolve => { paint = resolve; });
  const contents = Object.assign(new EventEmitter(), { id, ipc: new EventEmitter(), isDestroyed: () => false, capturePage: mock(() => frame) });
  const view = { webContents: contents, setVisible: mock() };
  return { view, contents, paint: async () => {
    paint({ isEmpty: () => false });
    await Promise.resolve();
  } };
}

/** A Tab whose view was discarded under a live first-paint watch, warmed again on the same record before the old view's `destroyed` arrived. */
function rewatched() {
  jest.useFakeTimers();
  const first = watchedView(801);
  const second = watchedView(802);
  const shown = { id: 'shown', isWorking: false, view: watchedView(803).view };
  const tab: { id: string; isWorking: boolean; view: unknown; health?: string } = { id: 'tab-1', isWorking: false, view: first.view };
  const attach = mock();
  const reveal = mock();
  const showLoading = mock();
  const schedule = mock();
  const host = seatedTabs({
    window: Object.assign(new EventEmitter(), { isDestroyed: () => false, contentView: { removeChildView: mock() } }),
    attach, reveal, showLoading, spare: { schedule }, broadcastTabs: mock(), publishVisibleSlots: mock(),
    tabs: new Map<string, unknown>([[tab.id, tab], [shown.id, shown]]),
    activeId: shown.id, visibleId: shown.id,
  });
  const presentation = host.pieces.presentation;
  presentation.holdBack(tab);
  host.revealWhenPainted(tab, first.view);
  presentation.viewDiscarded(tab);
  tab.view = second.view;
  presentation.holdBack(tab);
  host.revealWhenPainted(tab, second.view);
  return { host, tab, first, second, attach, reveal, showLoading, schedule };
}

afterEach(() => jest.useRealTimers());

/**
 * A discarded view takes its first-paint watch with it. Whatever that view answers later, its
 * `destroyed` included, belongs to a watch that is over and never reaches the watch on the view
 * that replaced it: the Tab stays held back, can be asked for its frame, and paints.
 */
describe('a discarded view is destroyed after its Tab was warmed again', () => {
  it('lets go of the discarded view at once: no listener, no timer and no capture is left on it', () => {
    const { host, first } = rewatched();

    first.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(first.contents));

    expect(first.contents.listenerCount('destroyed')).toBe(0);
    expect(first.contents.listenerCount('did-start-navigation')).toBe(0);
    expect(first.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
    expect(first.contents.capturePage).not.toHaveBeenCalled();
    host.window.emit('closed');
  });

  it('holds the Tab back and asks it for its frame while the old view is still closing', () => {
    const { host, tab, second, reveal, showLoading } = rewatched();
    second.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(second.contents));
    host.activeId = tab.id;

    host.present();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(reveal).not.toHaveBeenCalled();
    expect(second.contents.capturePage).toHaveBeenCalledTimes(2);
    host.window.emit('closed');
  });

  it('still holds the Tab back and asks it for its frame once the old view is destroyed', () => {
    const { host, tab, first, second, reveal, showLoading } = rewatched();
    second.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(second.contents));
    first.contents.emit('destroyed');
    host.activeId = tab.id;

    host.present();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(reveal).not.toHaveBeenCalled();
    expect(second.contents.capturePage).toHaveBeenCalledTimes(2);
    host.window.emit('closed');
  });

  it('places the second view when its frame arrives, the old view destroyed or not', async () => {
    for (const destroyed of [true, false]) {
      const { host, first, second, attach, schedule } = rewatched();
      if (destroyed) first.contents.emit('destroyed');

      second.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(second.contents));
      await second.paint();

      expect(attach).toHaveBeenCalledTimes(1);
      expect(attach).toHaveBeenCalledWith(second.view);
      expect(schedule).toHaveBeenCalledTimes(1);
      expect(second.view.setVisible).toHaveBeenLastCalledWith(false);
      expect(second.contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
      expect(second.contents.listenerCount('destroyed')).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
      host.window.emit('closed');
      jest.useRealTimers();
    }
  });

  it('never marks the Tab failed for the discarded view: only the second view\'s own wait can', async () => {
    // The old view never reports `destroyed` (its close hangs); the second view paints well inside its own wait.
    const { host, tab, second, attach } = rewatched();
    second.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(second.contents));
    await second.paint();

    jest.advanceTimersByTime(TAB_FIRST_PAINT_TIMEOUT_MS);

    expect(tab.health).toBeUndefined();
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledWith(second.view);
    host.window.emit('closed');
  });

  it('still reports the second view when its frame never arrives', () => {
    const { host, tab, first, second, attach } = rewatched();
    first.contents.emit('destroyed');

    jest.advanceTimersByTime(TAB_FIRST_PAINT_TIMEOUT_MS);

    expect(tab.health).toBe('failed');
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledWith(second.view);
    expect(second.contents.listenerCount('destroyed')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
    host.window.emit('closed');
  });
});
