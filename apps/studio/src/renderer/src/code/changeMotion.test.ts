import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { EditorState } from '@codemirror/state';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import { agentCodeChange, animateEditedLine, CodeChangeMotion } from './changeMotion.js';

function fixture(reduced: boolean) {
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const frames: (Keyframe[] | PropertyIndexedKeyframes | null)[] = [];
  const timings: (number | KeyframeAnimationOptions | undefined)[] = [];
  let cancellations = 0;
  const finishers: (() => void)[] = [];
  const line = {
    animate: (keyframes: Keyframe[] | PropertyIndexedKeyframes | null, timing?: number | KeyframeAnimationOptions): Animation => {
      frames.push(keyframes);
      timings.push(timing);
      return { cancel: () => { cancellations += 1; }, finished: new Promise<void>(resolve => finishers.push(resolve)) } as unknown as Animation;
    },
  };
  const stop = animateEditedLine(line, 'transparent', motion);
  return { motion, frames, timings, stop, cancellations: () => cancellations, finish: () => finishers.forEach(finish => finish()) };
}

describe('edited line motion', () => {
  it('uses a quick 3px reveal and a longer fading accent without dimensions', () => {
    const run = fixture(false);
    expect(run.timings).toEqual([{ duration: 1400, easing: 'ease-out' }, { duration: 180, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' }]);
    expect(run.frames[1]).toEqual([{ transform: 'translateX(3px)', opacity: 0.7 }, { transform: 'translateX(0)', opacity: 1 }]);
    run.stop();
    run.stop();
    expect(run.cancellations()).toBe(2);
  });

  it('keeps reduced motion stationary while retaining the edited cue', () => {
    const run = fixture(true);
    expect(run.frames).toHaveLength(1);
    expect(JSON.stringify(run.frames)).not.toContain('transform');
    run.stop();
  });

  it('cleans up when the preference changes', () => {
    const run = fixture(false);
    run.motion.dispatchEvent(new Event('change'));
    run.stop();
    expect(run.cancellations()).toBe(2);
  });

  it('removes finished effects and their preference listener', async () => {
    const run = fixture(false);
    run.finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(run.cancellations()).toBe(2);
    run.motion.dispatchEvent(new Event('change'));
    expect(run.cancellations()).toBe(2);
  });
});

describe('edited line scroll lifecycle', () => {
  const restore: (() => void)[] = [];
  afterEach(() => { for (const reset of restore.splice(0).reverse()) reset(); });

  function globalValue(name: string, value: unknown): void {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    restore.push(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else Reflect.deleteProperty(globalThis, name);
    });
  }

  function editorFixture() {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    globalValue('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
    globalValue('cancelAnimationFrame', (id: number) => { frames.delete(id); });
    globalValue('window', { matchMedia: () => Object.assign(new EventTarget(), { matches: false }) });
    globalValue('getComputedStyle', () => ({ backgroundColor: 'transparent' }));
    let started = 0;
    let cancelled = 0;
    const line = (position: number, top: number) => ({ position, getBoundingClientRect: () => ({ top, bottom: top + 20 }),
      animate: () => {
        started += 1;
        return { cancel: () => { cancelled += 1; }, finished: new Promise<void>(() => {}) };
      } });
    const scroll = Object.assign(new EventTarget(), { scrollTop: 0, scrollLeft: 0, clientTop: 0, clientHeight: 80, getBoundingClientRect: () => ({ top: 0, bottom: 100 }) });
    const lines = [line(0, 10), line(4, -20), line(8, 90)];
    const view = { scrollDOM: scroll, contentDOM: { querySelectorAll: () => lines },
      state: EditorState.create({ doc: 'one\ntwo\nthree' }), posAtDOM: (target: typeof lines[number]) => target.position };
    const plugin = new CodeChangeMotion(view as unknown as EditorView);
    restore.push(() => plugin.destroy());
    const update = { docChanged: true, viewportChanged: false, transactions: [{ effects: [agentCodeChange.of(true)] }],
      changes: { iterChangedRanges: (callback: (from: number, to: number, fromNext: number, toNext: number) => void) => callback(0, 0, 0, 13) } } as unknown as ViewUpdate;
    const flush = () => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(0); } };
    return { plugin, update, scroll, frames, flush, started: () => started, cancelled: () => cancelled };
  }

  it('excludes rendered margins and code obscured by the horizontal scrollbar', () => {
    const run = editorFixture();
    run.plugin.update(run.update);
    run.flush();
    expect(run.started()).toBe(2);
  });

  it('cancels active effects on a small scroll without a viewport update', () => {
    const run = editorFixture();
    run.plugin.update(run.update);
    run.flush();
    run.scroll.scrollTop = 1;
    run.scroll.dispatchEvent(new Event('scroll'));
    expect(run.cancelled()).toBe(2);
  });

  it('cancels a pending reveal on a small scroll before its frame', () => {
    const run = editorFixture();
    run.plugin.update(run.update);
    run.scroll.scrollTop = 1;
    run.scroll.dispatchEvent(new Event('scroll'));
    expect(run.frames.size).toBe(0);
    run.flush();
    expect(run.started()).toBe(0);
  });

  it('rejects a pending reveal if scrolling precedes delivery of the scroll event', () => {
    const run = editorFixture();
    run.plugin.update(run.update);
    run.scroll.scrollTop = 1;
    run.flush();
    expect(run.started()).toBe(0);
  });

  it('removes pending frames and its scroll listener on teardown', () => {
    const run = editorFixture();
    run.plugin.update(run.update);
    run.plugin.destroy();
    expect(run.frames.size).toBe(0);
    run.scroll.dispatchEvent(new Event('scroll'));
    run.flush();
    expect(run.started()).toBe(0);
  });

  it('cancels active effects and unregisters the scroll listener on teardown', () => {
    const run = editorFixture();
    const remove = spyOn(run.scroll, 'removeEventListener');
    restore.push(() => remove.mockRestore());
    run.plugin.update(run.update);
    run.flush();
    run.plugin.destroy();
    expect(run.cancelled()).toBe(2);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    run.scroll.dispatchEvent(new Event('scroll'));
    expect(run.cancelled()).toBe(2);
  });
});
