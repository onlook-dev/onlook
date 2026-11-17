import { describe, expect, it } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { preserveWheelScroll, scrollWheelViewport, WheelViewport, wheelViewport } from './wheelViewport.js';

function fixture(deltaY: number, overrides: Partial<WheelEvent> = {}, rounded = false) {
  const order: string[] = [];
  let position = 0;
  let horizontal = 33;
  const scroll = { clientHeight: 600, scrollHeight: 3000, clientWidth: 400, scrollWidth: 1000,
    get scrollLeft() { return horizontal; },
    set scrollLeft(value: number) { horizontal = rounded ? Math.round(value) : value; },
    get scrollTop() { return position; },
    set scrollTop(value: number) { order.push('scroll'); position = rounded ? Math.round(value) : value; },
  };
  let target: number | undefined;
  let effect: ReturnType<typeof EditorView.scrollIntoView> | undefined;
  const view = { scrollDOM: scroll, documentPadding: { top: 8 }, viewportLineBlocks: [{ top: 0, bottom: 1320 }],
    lineBlockAtHeight: (height: number) => { target = height; return { from: 80, top: Math.floor(height / 20) * 20, bottom: Math.floor(height / 20) * 20 + 20 }; },
    dispatch: (spec: { effects: ReturnType<typeof EditorView.scrollIntoView> }) => { effect = spec.effects; order.push('render'); },
  } as unknown as EditorView;
  const event = { defaultPrevented: false, ctrlKey: false, metaKey: false, shiftKey: false, deltaMode: 0, deltaX: 0, deltaY,
    preventDefault: () => { order.push('prevent'); }, ...overrides } as unknown as WheelEvent;
  return { view, scroll, event, order, target: () => target, effect: () => effect, start: (top: number) => { position = top; } };
}

describe('wheel input at the virtual viewport boundary', () => {
  it('handles the scrolling surface once and removes its listener on teardown', () => {
    const run = fixture(180);
    const surface = new EventTarget();
    Object.defineProperties(surface, Object.getOwnPropertyDescriptors(run.scroll));
    Object.assign(run.view, { scrollDOM: surface });
    const plugin = new WheelViewport(run.view);
    const event = Object.assign(new Event('wheel', { cancelable: true }), { deltaX: 0, deltaY: 180, deltaMode: 0 });
    surface.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(run.scroll.scrollTop).toBe(180);
    plugin.destroy();
    const ignored = Object.assign(new Event('wheel', { cancelable: true }), { deltaX: 0, deltaY: 180, deltaMode: 0 });
    surface.dispatchEvent(ignored);
    expect(ignored.defaultPrevented).toBe(false);
    expect(run.scroll.scrollTop).toBe(180);
  });

  for (const delta of [.25, .5, -.25]) {
    it(`accumulates ${delta}px steps despite rounded DOM offsets`, () => {
      const run = fixture(delta, { deltaX: delta }, true);
      run.start(300);
      for (let index = 0; index < 40; index += 1) scrollWheelViewport(run.event, run.view);
      expect(run.scroll.scrollTop).toBe(300 + 40 * delta);
      expect(run.scroll.scrollLeft).toBe(33 + 40 * delta);
    });
  }

  it('drops fractional carry when source navigation or outside scrolling takes over', () => {
    const run = fixture(.25, {}, true);
    scrollWheelViewport(run.event, run.view);
    preserveWheelScroll(run.view, { head: 0 }, { y: 'start', yMargin: 5 });
    scrollWheelViewport(run.event, run.view);
    expect(run.scroll.scrollTop).toBe(0);
    run.start(500);
    scrollWheelViewport(run.event, run.view);
    expect(run.scroll.scrollTop).toBe(500);
    scrollWheelViewport(run.event, run.view);
    expect(run.scroll.scrollTop).toBe(501);
  });

  it('does not accumulate an outward gesture at the document edge', () => {
    const run = fixture(-.25, {}, true);
    for (let index = 0; index < 40; index += 1) expect(scrollWheelViewport(run.event, run.view)).toBe(true);
    const inward = { ...run.event, deltaY: .25 };
    for (let index = 0; index < 40; index += 1) scrollWheelViewport(inward, run.view);
    expect(run.scroll.scrollTop).toBe(10);
  });

  it('moves an already rendered destination without a viewport transaction', () => {
    const run = fixture(180);
    expect(scrollWheelViewport(run.event, run.view)).toBe(true);
    expect(run.order).toEqual(['prevent', 'scroll']);
    expect(run.scroll.scrollTop).toBe(180);
  });

  it('renders the destination before moving past the rendered margin', () => {
    const run = fixture(1000.5);
    expect(scrollWheelViewport(run.event, run.view)).toBe(true);
    expect(run.order).toEqual(['prevent', 'render', 'scroll']);
    expect(run.scroll.scrollTop).toBe(1000.5);
    expect(run.target()).toBe(1592.5);
    expect(run.effect()?.value).toMatchObject({ y: 'end', yMargin: -7.5, range: { anchor: 80, head: 80 } });
  });

  it('prepares an upward destination and preserves the exact pixel offset', () => {
    const run = fixture(-1800.5);
    run.start(2000);
    Object.assign(run.view, { viewportLineBlocks: [{ top: 1500, bottom: 3000 }] });
    expect(scrollWheelViewport(run.event, run.view)).toBe(true);
    expect(run.scroll.scrollTop).toBe(199.5);
    expect(run.target()).toBe(191.5);
    expect(run.effect()?.value).toMatchObject({ y: 'start', yMargin: -11.5 });
  });

  it('leaves a hidden editor alone', () => {
    const run = fixture(1000);
    run.scroll.clientHeight = 0;
    expect(scrollWheelViewport(run.event, run.view)).toBe(false);
    expect(run.order).toEqual([]);
  });

  it('consumes outward wheel bursts at the document end without re-rendering', () => {
    const run = fixture(10000);
    expect(scrollWheelViewport(run.event, run.view)).toBe(true);
    expect(run.scroll.scrollTop).toBe(2400);
    run.order.length = 0;
    expect(scrollWheelViewport(run.event, run.view)).toBe(true);
    expect(run.order).toEqual(['prevent', 'scroll']);
  });

  it('keeps horizontal movement at a vertical edge', () => {
    const run = fixture(-10000, { deltaX: .25 }, true);
    for (let index = 0; index < 40; index += 1) scrollWheelViewport(run.event, run.view);
    expect(run.scroll.scrollTop).toBe(0);
    expect(run.scroll.scrollLeft).toBe(43);
    expect(run.target()).toBeUndefined();
  });

  for (const [overflowY, top, overscrollBehaviorY, expected] of [['auto', 40, 'auto', false], ['scroll', 40, 'auto', false], ['hidden', 40, 'auto', true], ['visible', 40, 'auto', true], ['auto', 200, 'auto', true], ['auto', 200, 'contain', false], ['auto', 200, 'none', false]] as const) {
    it(`respects nested ${overflowY} scrolling at ${top}px with ${overscrollBehaviorY} chaining`, () => {
      const run = fixture(180);
      const child = { nodeType: 1, parentElement: run.scroll, scrollTop: top, scrollHeight: 300, clientHeight: 100,
        scrollLeft: 0, scrollWidth: 100, clientWidth: 100,
        ownerDocument: { defaultView: { getComputedStyle: () => ({ overflowY, overscrollBehaviorY, overflowX: 'visible' }) } } };
      const text = { nodeType: 3, parentElement: child };
      expect(scrollWheelViewport({ ...run.event, target: text } as unknown as WheelEvent, run.view)).toBe(expected);
      expect(run.scroll.scrollTop).toBe(expected ? 180 : 0);
      expect(run.order).toEqual(expected ? ['prevent', 'scroll'] : []);
    });
  }

  it('leaves a nested horizontal scroller its diagonal input', () => {
    const run = fixture(180, { deltaX: 25 });
    const child = { nodeType: 1, parentElement: run.scroll, scrollTop: 0, scrollHeight: 100, clientHeight: 100,
      scrollLeft: 40, scrollWidth: 300, clientWidth: 100,
      ownerDocument: { defaultView: { getComputedStyle: () => ({ overflowY: 'visible', overflowX: 'auto' }) } } };
    expect(scrollWheelViewport({ ...run.event, target: child } as unknown as WheelEvent, run.view)).toBe(false);
    expect(run.order).toEqual([]);
  });

  it('keeps both exact deltas for a diagonal gesture', () => {
    const run = fixture(1000.5, { deltaX: 4.25 });
    expect(scrollWheelViewport(run.event, run.view)).toBe(true);
    expect(run.scroll.scrollLeft).toBe(37.25);
    expect(run.scroll.scrollTop).toBe(1000.5);
    expect(preserveWheelScroll(run.view, { head: 80 }, { y: 'end', yMargin: -7.5 })).toBe(true);
    expect(run.scroll.scrollLeft).toBe(37.25);
    expect(preserveWheelScroll(run.view, { head: 80 }, { y: 'end', yMargin: -7.5 })).toBe(false);
  });

  it('does not take over a source reveal or keyboard scroll replacing the wheel target', () => {
    const run = fixture(1000);
    scrollWheelViewport(run.event, run.view);
    expect(preserveWheelScroll(run.view, { head: 80 }, { y: 'center', yMargin: 5 })).toBe(false);
    expect(preserveWheelScroll(run.view, { head: 80 }, { y: 'end', yMargin: -8 })).toBe(false);
  });

  it('maps a queued wheel target through agent text and cancels it for a new selection', () => {
    const run = fixture(1000.5);
    const state = EditorState.create({ doc: '.'.repeat(200), extensions: wheelViewport });
    const listener = state.facet(EditorView.updateListener)[0]!;
    scrollWheelViewport(run.event, run.view);
    listener({ view: run.view, selectionSet: false, docChanged: true, changes: state.changes({ from: 0, insert: 'new\n' }) } as unknown as ViewUpdate);
    expect(preserveWheelScroll(run.view, { head: 84 }, { y: 'end', yMargin: -7.5 })).toBe(true);
    scrollWheelViewport(run.event, run.view);
    listener({ view: run.view, selectionSet: true, docChanged: false } as unknown as ViewUpdate);
    expect(preserveWheelScroll(run.view, { head: 80 }, { y: 'end', yMargin: -7 })).toBe(false);
  });

  for (const override of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { deltaMode: 1 }, { deltaMode: 2 }, { deltaY: 0 }, { deltaY: NaN }, { deltaX: NaN }, { defaultPrevented: true }]) {
    it(`does not replace native input for ${JSON.stringify(override)}`, () => {
      const run = fixture(1000, override);
      expect(scrollWheelViewport(run.event, run.view)).toBe(false);
      expect(run.order).toEqual([]);
    });
  }
});
