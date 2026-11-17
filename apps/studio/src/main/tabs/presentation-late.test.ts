import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, jest, mock } from 'bun:test';
import { TAB_PRESENT_DEADLINE_MS } from './paint.js';
import { COVER_HOLD_MS } from './presentation.js';
import { seatedTabs } from './test-support.js';

function tabWithView(id: string, contentsId: number) {
  const contents = Object.assign(new EventEmitter(), { id: contentsId, ipc: new EventEmitter(), isDestroyed: () => false, capturePage: mock(() => new Promise<never>(() => {})) });
  return { id, isWorking: false, view: { webContents: contents, setVisible: mock() } };
}

/** `incoming` is selected while `outgoing` is still the Tab on screen. */
function switching() {
  jest.useFakeTimers();
  const incoming = tabWithView('incoming', 901);
  const outgoing = tabWithView('outgoing', 902);
  const host = seatedTabs({
    window: Object.assign(new EventEmitter(), { isDestroyed: () => false, isFocused: () => false, contentView: { addChildView: mock() } }),
    tabs: new Map([[incoming.id, incoming], [outgoing.id, outgoing]]),
    activeId: incoming.id, visibleId: outgoing.id,
    raiseChrome: mock(), attach: mock(), spare: { schedule: mock() }, broadcastTabs: mock(), publishVisibleSlots: mock(),
  });
  return { host, incoming, outgoing };
}

afterEach(() => jest.useRealTimers());

describe('answers that arrive after their moment in the tab host', () => {
  it('a cover handed over to its own Tab does not uncover again when its hold ends', () => {
    const { host, incoming, outgoing } = switching();
    host.reveal(incoming);
    host.showLoading(incoming);
    expect(outgoing.view.setVisible).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(COVER_HOLD_MS);

    expect(outgoing.view.setVisible).toHaveBeenCalledTimes(1);
    expect(host.publishVisibleSlots).toHaveBeenCalledTimes(1);
    expect(host.cover).toBeDefined();
    host.window.emit('closed');
    host.pieces.presentation.dropCover();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('a repeated press does not push the present deadline back (ONL-3121)', () => {
    const { host, incoming } = switching();
    // A reveal that never lands, so only the deadline can put the Tab on screen.
    host.reveal = mock();
    host.present();
    jest.advanceTimersByTime(TAB_PRESENT_DEADLINE_MS - 1000);
    host.present();
    expect(host.visibleId).toBe('outgoing');

    jest.advanceTimersByTime(1000);

    expect(host.visibleId).toBe(incoming.id);
    expect(host.presenting).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });
});
