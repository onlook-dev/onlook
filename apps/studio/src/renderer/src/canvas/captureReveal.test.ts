import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test';
import type { CanvasCamera, CaptureGeometry, CaptureViewAnswer } from '@studio/events';
import { BUSY_LIMIT_MS, createCaptureReveal, createPressTracker, type CaptureRevealDeps } from './captureReveal.js';

const FRAME = { width: 1512, height: 982 };
const TAB = { width: 1200, height: 500 };

function rig(start: CanvasCamera = { x: 100, y: 80, zoom: 0.9 }, settled: CaptureRevealDeps['settled'] = async () => {}) {
  let camera = start;
  let busy = false;
  const answers: CaptureViewAnswer[] = [];
  const kept: CanvasCamera[] = [];
  const held: boolean[] = [];
  const deps: CaptureRevealDeps = {
    camera: () => camera,
    setCamera: (next) => { camera = next; },
    geometry: (frameId): CaptureGeometry | null => frameId !== 'f' ? null : {
      tab: TAB,
      pane: { left: 0, top: 0 },
      frame: FRAME,
      rect: { left: camera.x, top: camera.y, width: FRAME.width * camera.zoom, height: FRAME.height * camera.zoom },
      hidden: false,
    },
    busy: () => busy,
    settled,
    holdCamera: (isHeld) => { held.push(isHeld); },
    keepCamera: (next) => { kept.push(next); },
    answer: (answer) => { answers.push(answer); },
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
  return {
    reveal: createCaptureReveal(deps),
    answers,
    kept,
    held,
    camera: () => camera,
    personMoves: (next: CanvasCamera) => { camera = next; },
    setBusy: (isBusy: boolean) => { busy = isBusy; },
  };
}

describe('the renderer side of a capture reveal', () => {
  test('a frame that paints whole where it is answers in place', async () => {
    const r = rig({ x: 100, y: 80, zoom: 0.3 });
    await r.reveal.handle({ requestId: 1, frameId: 'f', step: 'check' });
    expect(r.answers[0]?.state).toBe('in-place');
  });

  test('a frame Studio does not draw answers unknown', async () => {
    const r = rig();
    await r.reveal.handle({ requestId: 1, frameId: 'gone', step: 'check' });
    expect(r.answers[0]?.state).toBe('unknown-frame');
  });

  test('a move zooms out until the frame paints whole, then a restore puts the person’s camera back', async () => {
    const r = rig();
    await r.reveal.handle({ requestId: 1, frameId: 'f', step: 'check' });
    expect(r.answers[0]?.state).toBe('needs-move');
    await r.reveal.handle({ requestId: 1, frameId: 'f', step: 'move' });
    expect(r.answers[1]?.state).toBe('moved');
    expect(r.camera().zoom).toBeLessThan(0.9);
    await r.reveal.handle({ requestId: 2, frameId: 'f', step: 'restore' });
    expect(r.camera().zoom).toBeLessThan(0.9);
    await r.reveal.handle({ requestId: 1, frameId: 'f', step: 'restore' });
    expect(r.answers[3]).toEqual({ requestId: 1, step: 'restore', state: 'restored' });
    expect(r.camera()).toEqual({ x: 100, y: 80, zoom: 0.9 });
    expect(r.held).toEqual([true, false]);
  });

  test('a camera the person moved during the reveal is kept, and saved as theirs', async () => {
    const r = rig();
    await r.reveal.handle({ requestId: 1, frameId: 'f', step: 'move' });
    r.personMoves({ x: -300, y: 40, zoom: 1.2 });
    await r.reveal.handle({ requestId: 1, frameId: 'f', step: 'restore' });
    expect(r.answers[1]?.state).toBe('kept');
    expect(r.camera()).toEqual({ x: -300, y: 40, zoom: 1.2 });
    expect(r.kept).toEqual([{ x: -300, y: 40, zoom: 1.2 }]);
  });

  test('a restore that arrives while its move is still settling waits for the move, then puts the camera back', async () => {
    let settle = (): void => {};
    let first = true;
    const r = rig(undefined, () => {
      if (!first) return Promise.resolve();
      first = false;
      return new Promise<void>((resolve) => { settle = resolve; });
    });
    const moving = r.reveal.handle({ requestId: 1, frameId: 'f', step: 'move' });
    const restoring = r.reveal.handle({ requestId: 1, frameId: 'f', step: 'restore' });
    await Promise.resolve();
    expect(r.answers).toEqual([]);
    settle();
    await Promise.all([moving, restoring]);
    expect(r.answers.map((answer) => answer.step)).toEqual(['move', 'restore']);
    expect(r.camera()).toEqual({ x: 100, y: 80, zoom: 0.9 });
  });

  describe('on a fake clock', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    async function step(ms: number): Promise<void> {
      for (let left = ms; left > 0; left -= 50) {
        jest.advanceTimersByTime(Math.min(50, left));
        await Promise.resolve();
        await Promise.resolve();
      }
    }

    test('the person mid-gesture holds the answer until they stop', async () => {
      const r = rig();
      r.setBusy(true);
      const checked = r.reveal.handle({ requestId: 1, frameId: 'f', step: 'check' });
      await step(400);
      expect(r.answers).toEqual([]);
      r.setBusy(false);
      await step(100);
      await checked;
      expect(r.answers[0]?.state).toBe('needs-move');
    });

    test('a gesture that outlasts the bound answers busy', async () => {
      const r = rig();
      r.setBusy(true);
      const checked = r.reveal.handle({ requestId: 1, frameId: 'f', step: 'check' });
      await step(BUSY_LIMIT_MS + 100);
      await checked;
      expect(r.answers[0]?.state).toBe('busy');
    });
  });
});

describe('the presses that keep a capture waiting', () => {
  test('a press whose release went elsewhere stops holding once the pointer moves with no button down', () => {
    const presses = createPressTracker();
    presses.down(1);
    presses.moved(1);
    expect(presses.held()).toBe(true);
    presses.moved(0);
    expect(presses.held()).toBe(false);
  });

  test('a pointer pressed twice is released by one release', () => {
    const presses = createPressTracker();
    presses.down(1);
    presses.down(1);
    presses.up(1);
    expect(presses.held()).toBe(false);
  });
});
