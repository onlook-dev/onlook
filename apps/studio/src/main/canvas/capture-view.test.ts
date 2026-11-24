import { EventEmitter } from 'node:events';
import { describe, expect, test } from 'bun:test';
import type { WebContents } from 'electron';
import { IPC_SEND, type CaptureGeometry, type CaptureViewAnswer, type CaptureViewRequest } from '@studio/events';
import { captureViewPort, imageRepeatsRows, MOVED_SHOOT_LIMIT_MS, PAINT_RETRY_MS, withCaptureView, type CaptureViewDeps, type CaptureViewPort, type Judged, type RevealFacts, type TabFreeze } from './capture-view.js';
import { fromSubframe } from '../tabs/test-support.js';

const TAB = { width: 1200, height: 500 };
const FRAME = { width: 1512, height: 982 };

function geometry(zoom: number, hidden = false): CaptureGeometry {
  return { tab: TAB, pane: { left: 0, top: 0 }, frame: FRAME, rect: { left: 100, top: 80, width: FRAME.width * zoom, height: FRAME.height * zoom }, hidden };
}

type Step = CaptureViewRequest['step'];
type Reply = (CaptureViewAnswer extends infer A ? A extends CaptureViewAnswer ? Omit<A, 'requestId' | 'step'> : never : never) | null;

let nextPortId = 0;

function fakePort(replies: Partial<Record<Step, Reply>>, log: string[] = [], frozen: () => Promise<TabFreeze> = async () => ({ state: 'held', lift: () => log.push('unfreeze') })): CaptureViewPort & { log: string[]; ids: number[] } {
  nextPortId += 1;
  const ids: number[] = [];
  return {
    id: nextPortId,
    log,
    ids,
    ask: async ({ requestId, step }) => {
      log.push(step);
      ids.push(requestId);
      const reply = replies[step] === undefined ? { state: 'restored' as const } : replies[step];
      return reply === null ? null : ({ requestId, step, ...reply } as CaptureViewAnswer);
    },
    freeze: async () => {
      log.push('freeze');
      return frozen();
    },
    warm: async () => {
      log.push('warm');
    },
  };
}

/** A retry's pause advances the clock at once; any other bound passes on the next task, after every settled step. */
function clock(): CaptureViewDeps & { bounds: number[] } {
  let now = 0;
  const bounds: number[] = [];
  return {
    now: () => now,
    sleep: (ms) => {
      if (ms === PAINT_RETRY_MS) {
        now += ms;
        return Promise.resolve();
      }
      bounds.push(ms);
      return new Promise((resolve) => setTimeout(resolve, 0));
    },
    bounds,
  };
}

const MOVES: Partial<Record<Step, Reply>> = { check: { state: 'needs-move', geometry: geometry(0.9) }, move: { state: 'moved', geometry: geometry(0.6) } };

function shots(...judged: Judged[]): { attempt: () => Promise<Judged>; judge: (value: Judged) => Judged; count(): number } {
  let taken = 0;
  return {
    attempt: async () => judged[Math.min(taken++, judged.length - 1)]!,
    judge: (value) => value,
    count: () => taken,
  };
}

describe('withCaptureView', () => {
  test('a frame that already paints whole is captured where it is, with no freeze and no move', async () => {
    const port = fakePort({ check: { state: 'in-place', geometry: geometry(0.3) } });
    const shot = shots('whole');
    const facts: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
    expect(await withCaptureView(port, 'f', shot.attempt, shot.judge, clock(), facts)).toEqual({ value: 'whole' });
    expect(port.log).toEqual(['check']);
    expect(facts.viewMoved).toBe(false);
  });

  test('the reveal time leaves out the time spent in the capture itself', async () => {
    let now = 0;
    const deps: CaptureViewDeps = { ...clock(), now: () => now };
    const port = fakePort({ check: { state: 'in-place', geometry: geometry(0.3) } });
    const ask = port.ask;
    port.ask = async (request, limitMs) => {
      now += 30;
      return ask(request, limitMs);
    };
    const facts: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
    const capture = async (): Promise<Judged> => {
      now += 4_000;
      return 'whole';
    };
    await withCaptureView(port, 'f', capture, (value) => value, deps, facts);
    expect(facts.revealMs).toBe(30);
    expect(facts.captureMs).toBe(4_000);
  });

  test('a frame that needs the view moved is frozen, moved, captured, then restored before the freeze lifts', async () => {
    const port = fakePort(MOVES);
    const shot = shots('whole');
    const facts: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
    expect(await withCaptureView(port, 'f', async () => { port.log.push('capture'); return shot.attempt(); }, shot.judge, clock(), facts)).toEqual({ value: 'whole' });
    expect(port.log).toEqual(['check', 'freeze', 'move', 'capture', 'restore', 'unfreeze']);
    expect(new Set(port.ids).size).toBe(1);
    expect(facts.viewMoved).toBe(true);
    expect(facts.restore).toBe('restored');
    expect(facts.geometry).toEqual(geometry(0.6));
  });

  test('a resize recapture accumulates time and attempts without counting the first capture as negative reveal time', async () => {
    let now = 0;
    const deps = { ...clock(), now: () => now };
    const port = fakePort(MOVES);
    const ask = port.ask;
    port.ask = async (request, limitMs) => {
      now += 30;
      return ask(request, limitMs);
    };
    const facts: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
    const capture = async (): Promise<Judged> => {
      now += 100;
      return 'whole';
    };
    await withCaptureView(port, 'f', capture, value => value, deps, facts);
    await withCaptureView(port, 'f', capture, value => value, deps, facts);
    expect(facts).toMatchObject({ revealMs: 180, captureMs: 200, freezeMs: 320, paintMs: 200, attempts: 2 });
  });

  test('a move the tab answers too late is refused without capturing, and the view is still restored before the freeze lifts', async () => {
    let now = 0;
    const port = fakePort({ ...MOVES, move: null });
    const ask = port.ask;
    port.ask = async (request, limitMs) => {
      now += 30;
      return ask(request, limitMs);
    };
    const shot = shots('whole');
    const facts: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
    expect(await withCaptureView(port, 'f', shot.attempt, shot.judge, { ...clock(), now: () => now }, facts)).toEqual({ refusal: { kind: 'late' } });
    expect(facts).toMatchObject({ moveAnsweredLate: true, freezeMs: 60 });
    expect(shot.count()).toBe(0);
    expect(port.log).toEqual(['check', 'freeze', 'move', 'restore', 'unfreeze']);
  });

  for (const [how, frozen] of [
    ['answers that it could not hold the tab still', async (): Promise<TabFreeze> => ({ state: 'failed' })],
    ['throws', async (): Promise<TabFreeze> => { throw new Error('no picture'); }],
  ] as const) {
    test(`a shown tab whose freeze ${how} is captured where it is, and its view never moves`, async () => {
      const log: string[] = [];
      const port = fakePort(MOVES, log, frozen);
      const facts: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
      expect(await withCaptureView(port, 'f', async () => { log.push('capture'); return 'whole' as Judged; }, (value) => value, clock(), facts)).toEqual({ value: 'whole' });
      expect(log).toEqual(['check', 'freeze', 'capture']);
      expect(facts.viewMoved).toBe(false);
    });
  }

  test('a tab that is not on screen is moved without a freeze, since nobody sees it', async () => {
    const log: string[] = [];
    const port = fakePort(MOVES, log, async () => ({ state: 'not-shown' }));
    expect(await withCaptureView(port, 'f', async () => { log.push('capture'); return 'whole' as Judged; }, (value) => value, clock())).toEqual({ value: 'whole' });
    expect(log).toEqual(['check', 'freeze', 'move', 'capture', 'restore']);
  });

  test('the view is restored and the freeze lifted when the capture throws', async () => {
    const port = fakePort(MOVES);
    const failing = withCaptureView(port, 'f', () => Promise.reject(new Error('gone')), () => 'final', clock());
    expect(await failing.catch((error: unknown) => String(error))).toContain('gone');
    expect(port.log.slice(-2)).toEqual(['restore', 'unfreeze']);
  });

  test('a capture that comes back short is retried until it paints whole', async () => {
    const port = fakePort(MOVES);
    const shot = shots('short', 'short', 'whole');
    expect(await withCaptureView(port, 'f', shot.attempt, shot.judge, clock())).toEqual({ value: 'whole' });
    expect(shot.count()).toBe(3);
  });

  test('a capture still short when the paint budget runs out returns its short image', async () => {
    const port = fakePort(MOVES);
    const shot = shots('short');
    expect(await withCaptureView(port, 'f', shot.attempt, shot.judge, clock())).toEqual({ value: 'short' });
    expect(shot.count()).toBeGreaterThan(10);
  });

  test('a shoot under the moved view that never settles is abandoned at its budget, then the view is restored and the freeze lifted', async () => {
    const port = fakePort(MOVES);
    const deps = clock();
    const facts: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
    const outcome = await withCaptureView(port, 'f', async () => { port.log.push('capture'); return new Promise<Judged>(() => undefined); }, (value) => value, deps, facts);
    expect(outcome).toEqual({ refusal: { kind: 'stalled' } });
    expect(deps.bounds).toEqual([MOVED_SHOOT_LIMIT_MS]);
    expect(port.log).toEqual(['check', 'freeze', 'move', 'capture', 'restore', 'unfreeze']);
    expect(facts.stalledStep).toBe('capture');
  });

  test('a moved geometry Chromium does not paint whole is refused without capturing', async () => {
    const port = fakePort({ ...MOVES, move: { state: 'moved', geometry: geometry(0.9) } });
    const shot = shots('whole');
    expect(await withCaptureView(port, 'f', shot.attempt, shot.judge, clock())).toEqual({ refusal: { kind: 'not-whole', why: 'too-large' } });
    expect(shot.count()).toBe(0);
    expect(port.log).toContain('restore');
  });

  test('a hidden tab is warmed before each capture, never frozen, and named when it stays short', async () => {
    const port = fakePort({ check: { state: 'needs-move', geometry: geometry(0.9, true) }, move: { state: 'moved', geometry: geometry(0.6, true) } });
    const shot = shots('short');
    expect(await withCaptureView(port, 'f', shot.attempt, shot.judge, clock())).toEqual({ value: 'short', refusal: { kind: 'not-whole', why: 'hidden-tab' } });
    expect(port.log).not.toContain('freeze');
    expect(port.log.filter((step) => step === 'warm').length).toBe(shot.count());
  });

  test('the person mid-gesture refuses the capture as busy without capturing', async () => {
    const port = fakePort({ check: { state: 'busy' } });
    const shot = shots('whole');
    expect(await withCaptureView(port, 'f', shot.attempt, shot.judge, clock())).toEqual({ refusal: { kind: 'busy' } });
    expect(shot.count()).toBe(0);
  });

  test('a renderer that never answers leaves the capture as it is today', async () => {
    const port = fakePort({ check: null });
    const shot = shots('short');
    expect(await withCaptureView(port, 'f', shot.attempt, shot.judge, clock())).toEqual({ value: 'short' });
    expect(port.log).toEqual(['check']);
  });

  test('two captures on one tab run one after the other', async () => {
    const log: string[] = [];
    let open = (): void => {};
    const gate = new Promise<void>((resolve) => { open = resolve; });
    const port = fakePort(MOVES, log);
    const deps = clock();
    const first = withCaptureView(port, 'a', async () => { log.push('capture a'); await gate; return 'whole' as Judged; }, (value) => value, deps);
    const second = withCaptureView(port, 'b', async () => { log.push('capture b'); return 'whole' as Judged; }, (value) => value, deps);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(log).not.toContain('capture b');
    open();
    await Promise.all([first, second]);
    expect(log.indexOf('capture b')).toBeGreaterThan(log.indexOf('unfreeze'));
  });

  test('a capture queued behind a slow one waits its turn and is captured, not refused as busy', async () => {
    let open = (): void => {};
    const gate = new Promise<void>((resolve) => { open = resolve; });
    const port = fakePort({ check: { state: 'in-place', geometry: geometry(0.3) } });
    const deps = clock();
    const first = withCaptureView(port, 'a', async () => { await gate; return 'whole' as Judged; }, (value) => value, deps);
    const second = withCaptureView(port, 'b', async () => 'whole' as Judged, (value) => value, deps);
    await new Promise((resolve) => setTimeout(resolve, 0));
    open();
    expect(await Promise.all([first, second])).toEqual([{ value: 'whole' }, { value: 'whole' }]);
  });
});

function image(rows: readonly number[], width = 4): { getSize(): { width: number; height: number }; toBitmap(): Buffer } {
  const bitmap = Buffer.alloc(width * 4 * rows.length);
  rows.forEach((value, row) => bitmap.fill(value, row * width * 4, (row + 1) * width * 4));
  return { getSize: () => ({ width, height: rows.length }), toBitmap: () => bitmap };
}

describe('imageRepeatsRows', () => {
  test('flags an image whose lower rows repeat its top', () => {
    expect(imageRepeatsRows(image([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6]))).toBe(true);
  });

  test('passes a blank image and an image of real rows', () => {
    expect(imageRepeatsRows(image(Array.from({ length: 12 }, () => 255)))).toBe(false);
    expect(imageRepeatsRows(image(Array.from({ length: 12 }, (_, row) => row * 9)))).toBe(false);
  });
});

describe('the tab renderer\'s answer', () => {
  test('is taken from the view\'s own main frame, never from a subframe of it', async () => {
    const host = Object.assign(new EventEmitter(), { id: 41, mainFrame: {}, ipc: new EventEmitter(), isDestroyed: () => false, send: () => {} });
    const request: CaptureViewRequest = { requestId: 3, frameId: 'frame', step: 'check' };
    const answer: CaptureViewAnswer = { requestId: 3, step: 'check', state: 'busy' };
    let answered: CaptureViewAnswer | null | undefined;
    const asked = captureViewPort(host as unknown as WebContents).ask(request, 1_000).then((got) => { answered = got; });
    host.ipc.emit(IPC_SEND.canvasCaptureViewed, fromSubframe(host), answer);
    await Promise.resolve();
    expect(answered).toBeUndefined();
    host.ipc.emit(IPC_SEND.canvasCaptureViewed, { sender: host, senderFrame: host.mainFrame }, answer);
    await asked;
    expect(answered).toEqual(answer);
    expect(host.ipc.listenerCount(IPC_SEND.canvasCaptureViewed)).toBe(0);
  });
});
