import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { PANEL_DEFAULTS, type PanelsState, type RendererLogLine } from '@studio/events';
import { deferred, type Deferred } from '../testing/bridge.js';

const STORED: PanelsState = { sidebar: 320, end: 420, code: 700 };

const BROADCAST: PanelsState = { sidebar: 280, end: 360, code: 640 };

let saves: Partial<PanelsState>[];
let logged: RendererLogLine[];
let read: Deferred<PanelsState> | undefined;
let broadcast: (state: PanelsState) => void;

// Before the import: the store binds its release listener to `window` once, at load.
const fakeWindow = Object.assign(new EventTarget(), { studio: {} });
Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true, writable: true });
const { primePanels, resetPanelsStoreForTesting, subscribeToPanelWidths, usePanelsStore } = await import('./store.js');

beforeEach(() => {
  jest.useFakeTimers();
  saves = [];
  logged = [];
  read = undefined;
  const listeners = new Set<(state: PanelsState) => void>();
  broadcast = (state) => {
    for (const listener of listeners) listener(state);
  };
  fakeWindow.studio = {
    log: (line: RendererLogLine) => {
      logged.push(line);
    },
    telemetryException: () => {},
    panelsState: () => read?.promise ?? Promise.resolve(STORED),
    onPanelsChanged: (listener: (state: PanelsState) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    panelsSave: (next: Partial<PanelsState>) => {
      saves.push(next);
      return Promise.resolve();
    },
  };
  resetPanelsStoreForTesting();
});

afterEach(() => {
  resetPanelsStoreForTesting();
  jest.useRealTimers();
});

afterAll(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

describe('a panel drag', () => {
  it('moves the panel that was dragged and leaves every other width alone', () => {
    usePanelsStore.getState().setWidth('code', 700);
    expect(usePanelsStore.getState()).toMatchObject({
      sidebar: PANEL_DEFAULTS.sidebar,
      end: PANEL_DEFAULTS.end,
      code: 700,
    });
  });

  it('saves only the widths that moved, so one panel cannot erase another', () => {
    usePanelsStore.getState().setWidth('code', 700);
    jest.advanceTimersByTime(1000);
    expect(saves).toEqual([{ code: 700 }]);
  });

  it('carries every width a burst moved, not just the last one', () => {
    usePanelsStore.getState().setWidth('code', 700);
    usePanelsStore.getState().setWidth('sidebar', 300);
    jest.advanceTimersByTime(1000);
    expect(saves).toEqual([{ code: 700, sidebar: 300 }]);
  });
});

describe('releasing a panel drag', () => {
  it('sends the moved widths at once, and only once, so another Tab hears them before the debounce', () => {
    usePanelsStore.getState().setWidth('code', 700);
    usePanelsStore.getState().setWidth('sidebar', 300);
    fakeWindow.dispatchEvent(new Event('pointerup'));
    expect(saves).toEqual([{ code: 700, sidebar: 300 }]);
    jest.advanceTimersByTime(1000);
    expect(saves).toEqual([{ code: 700, sidebar: 300 }]);
  });

  it('leaves the next drag to save only its own width, on its own debounce', () => {
    usePanelsStore.getState().setWidth('code', 700);
    fakeWindow.dispatchEvent(new Event('pointerup'));
    jest.advanceTimersByTime(200);
    usePanelsStore.getState().setWidth('end', 500);
    jest.advanceTimersByTime(299);
    expect(saves).toEqual([{ code: 700 }]);
    jest.advanceTimersByTime(1);
    expect(saves).toEqual([{ code: 700 }, { end: 500 }]);
  });

  it('sends nothing for a release that moved no panel', () => {
    fakeWindow.dispatchEvent(new Event('pointerup'));
    jest.advanceTimersByTime(1000);
    expect(saves).toEqual([]);
  });
});

describe('priming the widths a tab opens at', () => {
  it('restores every stored width, the code view among them', async () => {
    await primePanels();
    expect(usePanelsStore.getState()).toMatchObject(STORED);
  });
});

describe('a read of the widths against something newer', () => {
  it("leaves another tab's broadcast showing when the read answers after it", async () => {
    read = deferred<PanelsState>();
    const stop = subscribeToPanelWidths();
    const primed = primePanels();

    broadcast(BROADCAST);
    read.settle(STORED);
    await primed;

    expect(usePanelsStore.getState()).toMatchObject(BROADCAST);
    stop();
  });

  it('keeps a broadcast that lands after the read and before any screen follows the widths', async () => {
    await primePanels();
    broadcast(BROADCAST);
    expect(usePanelsStore.getState()).toMatchObject(BROADCAST);
  });

  it('leaves a width dragged during the read where the drag put it', async () => {
    read = deferred<PanelsState>();
    const primed = primePanels();

    usePanelsStore.getState().setWidth('end', 500);
    read.settle(STORED);
    await primed;

    expect(usePanelsStore.getState().end).toBe(500);
  });

  it('hands a broadcast to the screen following the widths, and stops when it lets go', () => {
    const followed: PanelsState[] = [];
    const stop = subscribeToPanelWidths((state) => followed.push(state));
    broadcast(BROADCAST);
    stop();
    broadcast(STORED);
    expect(followed).toEqual([BROADCAST]);
  });
});

describe('a refused read of the widths', () => {
  it('is logged, and leaves the widths the tab holds', async () => {
    usePanelsStore.setState(BROADCAST);
    read = deferred<PanelsState>();
    const primed = primePanels();

    read.refuse(new Error('read refused'));
    await primed;

    expect(usePanelsStore.getState()).toMatchObject(BROADCAST);
    expect(logged.map((line) => `${line.subsystem}: ${line.msg}`)).toEqual(['panels: state read refused']);
  });
});
