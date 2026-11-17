import { describe, expect, it } from 'bun:test';
import { createOverlayRecovery, createPageObservation, mutationTouchesPage, restorePickerOverlay, type PageObservationOptions } from './guest-mutations.js';

it('observes only structure until the picker or a held element needs details, without dropping queued structure', () => {
  const options: PageObservationOptions[] = [];
  const records: string[] = [];
  let queued: string[] = [];
  const observe = createPageObservation({
    takeRecords: () => { const pending = queued; queued = []; return pending; },
    disconnect: () => {},
    observe: (_target: object, next: PageObservationOptions) => { options.push(next); },
  }, {}, (pending) => { records.push(...pending); });
  observe(false);
  queued = ['component mounted'];
  observe(true);
  observe(true);
  queued = ['component removed'];
  observe(false);
  expect(records).toEqual(['component mounted', 'component removed']);
  expect(options).toEqual([
    { childList: true, subtree: true, attributes: false, characterData: false },
    { childList: true, subtree: true, attributes: true, characterData: true },
    { childList: true, subtree: true, attributes: false, characterData: false },
  ]);
});

class TestElement {
  constructor(readonly picker = false, readonly parentElement: TestElement | null = null) {}

  closest(): TestElement | null {
    return this.picker ? this : this.parentElement?.closest() ?? null;
  }
}

function mutation(target: TestElement, removed: TestElement[], added: TestElement[] = [], type = 'childList') {
  return { type, target, removedNodes: removed, addedNodes: added };
}

const isPickerNode = (node: TestElement): boolean => node.closest() !== null;

describe('guest mutation ownership', () => {
  it('ignores detached shading children removed from a picker-owned layer', () => {
    const spacing = new TestElement(true);
    const removedShade = new TestElement();
    expect(mutationTouchesPage(mutation(spacing, [removedShade]), isPickerNode)).toBe(false);
  });

  it('does not classify 100 picker spacing redraws as page changes', () => {
    const spacing = new TestElement(true);
    let pageChanges = 0;
    for (let redraw = 0; redraw < 100; redraw += 1) {
      if (mutationTouchesPage(mutation(spacing, [new TestElement()], [new TestElement(false, spacing)]), isPickerNode)) pageChanges += 1;
    }
    expect(pageChanges).toBe(0);
  });

  it('ignores overlay insertion into the page', () => {
    expect(mutationTouchesPage(mutation(new TestElement(), [], [new TestElement(true)]), isPickerNode)).toBe(false);
  });

  it('detects detached page elements even when a picker node also changes', () => {
    expect(mutationTouchesPage(mutation(new TestElement(), [new TestElement(), new TestElement(true)]), isPickerNode)).toBe(true);
  });

  it('detects real page text and style mutations', () => {
    for (const type of ['attributes', 'characterData']) {
      expect(mutationTouchesPage(mutation(new TestElement(), [], [], type), isPickerNode)).toBe(true);
      expect(mutationTouchesPage(mutation(new TestElement(true), [], [], type), isPickerNode)).toBe(false);
    }
  });
});

describe('guest overlay ownership', () => {
  it('keeps one root and the same selected child through 100 detachments', () => {
    const selected = { id: 'selected-outline' };
    const overlay = { isConnected: true, children: [selected] };
    const roots = new Set<typeof overlay>();
    let restorations = 0;
    const parent = { appendChild: (node: typeof overlay) => { roots.add(node); node.isConnected = true; restorations += 1; } };
    for (let removal = 0; removal < 100; removal += 1) {
      overlay.isConnected = false;
      expect(restorePickerOverlay(overlay, parent)).toBe(true);
      expect(restorePickerOverlay(overlay, parent)).toBe(false);
      expect(overlay.children[0]).toBe(selected);
    }
    expect(roots.size).toBe(1);
    expect(restorations).toBe(100);
  });

  it('reattaches the same overlay and its selected children after page removal', () => {
    const selected = { id: 'selected-outline' };
    const overlay = { isConnected: false, children: [selected] };
    const attached: typeof overlay[] = [];
    const parent = { appendChild: (node: typeof overlay) => { attached.push(node); node.isConnected = true; } };
    expect(restorePickerOverlay(overlay, parent)).toBe(true);
    expect(attached).toEqual([overlay]);
    expect(overlay.children[0]).toBe(selected);
    expect(restorePickerOverlay(overlay, parent)).toBe(false);
    expect(attached).toHaveLength(1);
  });

  it('does not create an overlay or touch a connected one', () => {
    let appended = 0;
    const parent = { appendChild: () => { appended += 1; } };
    expect(restorePickerOverlay(null, parent)).toBe(false);
    expect(restorePickerOverlay({ isConnected: true }, parent)).toBe(false);
    expect(appended).toBe(0);
  });

  it('waits for a replacement document root without losing the overlay', () => {
    const overlay = { isConnected: false };
    expect(restorePickerOverlay(overlay, null)).toBe(false);
    expect(overlay.isConnected).toBe(false);
    const parent = { appendChild: (node: typeof overlay) => { node.isConnected = true; } };
    expect(restorePickerOverlay(overlay, parent)).toBe(true);
  });
});

describe('bounded overlay recovery', () => {
  it('does not postpone recovery when external mutations keep requesting it', () => {
    const callbacks = new Map<number, () => void>();
    let scheduled = 0;
    let restored = 0;
    const recovery = createOverlayRecovery(() => { restored += 1; }, (callback) => {
      scheduled += 1;
      callbacks.set(scheduled, callback);
      return scheduled;
    }, (token) => { callbacks.delete(token); });
    for (let mutation = 0; mutation < 100; mutation += 1) recovery.request();
    expect(scheduled).toBe(1);
    callbacks.get(1)?.();
    expect(restored).toBe(1);
    recovery.request();
    expect(scheduled).toBe(2);
  });

  it('cancels pending recovery on de-arm or teardown and permits later re-arm', () => {
    const callbacks = new Map<number, () => void>();
    let scheduled = 0;
    let restored = 0;
    const recovery = createOverlayRecovery(() => { restored += 1; }, (callback) => {
      callbacks.set(++scheduled, callback);
      return scheduled;
    }, (token) => { callbacks.delete(token); });
    for (let cycle = 0; cycle < 100; cycle += 1) {
      recovery.request();
      recovery.cancel();
      recovery.cancel();
      expect(callbacks.size).toBe(0);
    }
    expect(restored).toBe(0);
    recovery.request();
    callbacks.get(scheduled)?.();
    expect(restored).toBe(1);
  });
});
