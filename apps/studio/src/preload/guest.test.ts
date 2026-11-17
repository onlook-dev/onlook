import { describe, expect, it } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { FRAME_SCROLL_CHANNEL, GUEST_CHANNEL_TO_GUEST, type PickerToGuest } from '@studio/events';

const build = await Bun.build({
  entrypoints: [new URL('./guest.ts', import.meta.url).pathname],
  target: 'browser',
  format: 'cjs',
  external: ['electron'],
});
if (!build.success) throw new AggregateError(build.logs, 'Guest preload test bundle failed');
const source = await build.outputs[0]!.text();

/** `mintsHtml` is the one thing the two document families differ by: an XML document's element carries no `style` (ONL-2835). */
function guest(mintsHtml: boolean) {
  const messages: unknown[] = [];
  const listeners = new Map<string, (...args: unknown[]) => void>();
  // A real document hands an event to every listener for it, and guest.ts registers two for 'pagehide'.
  const events = new Map<string, ((event: unknown) => void)[]>();
  const timers: (() => void)[] = [];
  const animationFrames: (() => void)[] = [];
  const roots: unknown[] = [];
  const documentEvents = new Map<string, (event: unknown) => void>();
  const document = {
    documentElement: { appendChild: (element: unknown) => { roots.push(element); } },
    body: null,
    scrollingElement: null,
    createElement: () => ({
      ...(mintsHtml ? { style: {} } : {}),
      isConnected: true,
      setAttribute() {},
      appendChild() {},
      replaceChildren() {},
    }),
    querySelectorAll: () => [],
    addEventListener: (name: string, listener: (event: unknown) => void) => { documentEvents.set(name, listener); },
    removeEventListener: (name: string) => { documentEvents.delete(name); },
  };
  class Observer {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  runInNewContext(source, {
    require: (name: string) => {
      if (name !== 'electron') throw new Error(`Unexpected import ${name}`);
      return { ipcRenderer: {
        on: (channel: string, listener: (...args: unknown[]) => void) => { listeners.set(channel, listener); },
        sendToHost: (_channel: string, message: unknown) => { messages.push(message); },
      } };
    },
    document,
    window: {
      getComputedStyle: () => ({ overflowY: 'visible' }),
      requestAnimationFrame: (callback: () => void) => { animationFrames.push(callback); return animationFrames.length; },
      cancelAnimationFrame() {},
      addEventListener() {},
      removeEventListener() {},
    },
    addEventListener: (name: string, listener: (event: unknown) => void) => { events.set(name, [...events.get(name) ?? [], listener]); },
    MutationObserver: Observer,
    ResizeObserver: Observer,
    setTimeout: (callback: () => void) => { timers.push(callback); return timers.length; },
    clearTimeout() {},
    process: { env: {} },
  });
  return {
    messages, roots, documentEvents,
    receive: (message: PickerToGuest) => listeners.get(GUEST_CHANNEL_TO_GUEST)!(null, message),
    receiveScroll: (message: unknown) => listeners.get(FRAME_SCROLL_CHANNEL)!(null, message),
    dispatch: (name: string, event: unknown = {}) => { for (const listener of events.get(name)!) listener(event); },
    flush: () => { while (timers.length > 0) timers.shift()!(); },
    paint: () => { while (animationFrames.length > 0) animationFrames.shift()!(); },
  };
}

describe('guest preload in a document that mints no HTML elements', () => {
  it('leaves the document alone and reports no error, however often the picker is driven', () => {
    const frame = guest(false);
    for (let generation = 1; generation <= 4; generation += 1) {
      const messages: PickerToGuest[] = [
        { type: 'outlineVisibility', visible: true, generation },
        { type: 'zoom', zoom: 1, generation },
        { type: 'arm', generation },
        { type: 'hoverAt', point: { x: 20, y: 30 }, generation },
        { type: 'measure', active: true, generation },
        { type: 'pickAt', point: { x: 20, y: 30 }, shiftHeld: false, generation },
        { type: 'pickPath', selector: '*', shiftHeld: false, generation },
        { type: 'seedSelections', selections: [], anchorId: null, generation },
        { type: 'componentMap', paths: [], generation },
      ];
      for (const message of messages) frame.receive(message);
      frame.dispatch('scroll');
      frame.dispatch('resize');
      frame.flush();
    }
    expect(frame.messages).toEqual([]);
    expect(frame.roots).toEqual([]);
  });

  it('leaves the page its own clicks', () => {
    const frame = guest(false);
    frame.receive({ type: 'arm', generation: 1 });
    let prevented = false;
    frame.dispatch('mousedown', { preventDefault: () => { prevented = true; } });
    expect(prevented).toBe(false);
  });

  it('reports the page it cannot scroll over the scroll channel, and lets it go with the page', () => {
    const frame = guest(false);
    frame.receiveScroll({ type: 'observe', session: 7, enabled: true });
    frame.paint();
    expect(frame.messages).toEqual([{ session: 7, metrics: null }]);
    expect(frame.documentEvents.size).toBeGreaterThan(0);
    frame.dispatch('pagehide');
    expect(frame.documentEvents.size).toBe(0);
  });

  it('still relays a canvas zoom gesture', () => {
    const frame = guest(false);
    let prevented = false;
    frame.dispatch('wheel', {
      ctrlKey: true, metaKey: false, isTrusted: true, deltaY: -10, clientX: 20, clientY: 30,
      preventDefault: () => { prevented = true; }, stopPropagation() {},
    });
    expect(prevented).toBe(true);
    expect(frame.messages).toEqual([{ type: 'wheel', deltaY: -10, clientX: 20, clientY: 30, isPinch: true, generation: 0 }]);
  });
});

describe('guest preload in a document that mints HTML elements', () => {
  it('draws its overlay and swallows a pick while armed', () => {
    const frame = guest(true);
    frame.receive({ type: 'outlineVisibility', visible: true, generation: 1 });
    expect(frame.roots).toHaveLength(1);
    frame.receive({ type: 'arm', generation: 1 });
    let prevented = false;
    frame.dispatch('mousedown', { preventDefault: () => { prevented = true; }, stopPropagation() {}, stopImmediatePropagation() {} });
    expect(prevented).toBe(true);
    expect(frame.messages).toEqual([]);
  });
});
