import { beforeEach, describe, expect, it } from 'bun:test';
import type { CanvasNode } from '@studio/events';
import { createCancelToken } from './cancel.js';
import {
  awaitSessionIdle,
  awaitStartOutcome,
  hasSetupRecord,
  isSessionStreaming,
  noteSetupParked,
  noteSetupReport,
  noteSetupStreaming,
  noteSetupTabClosed,
  resetSetupSignals,
  type FirstFrameAnswer,
} from './setup-signals.js';

const A = '/ws/a';
const B = '/ws/b';
const NOT_PLACED: FirstFrameAnswer = { kind: 'not-placed', reason: 'nothing to place in this test' };
const place = async (): Promise<FirstFrameAnswer> => NOT_PLACED;

beforeEach(() => {
  resetSetupSignals();
});

async function settled<T>(promise: Promise<T>): Promise<{ done: true; value: T } | { done: false }> {
  const pending = Symbol('pending');
  const result = await Promise.race([promise, new Promise<typeof pending>((r) => setTimeout(() => r(pending), 0))]);
  return result === pending ? { done: false } : { done: true, value: result as T };
}

describe('awaitStartOutcome', () => {
  it('answers the first report with its port, and only for the reported worktree', async () => {
    const a = awaitStartOutcome(A, createCancelToken(), place);
    const b = awaitStartOutcome(B, createCancelToken(), place);
    noteSetupReport(A, 5173);
    expect(await settled(a)).toEqual({ done: true, value: { kind: 'reported', port: 5173, frame: NOT_PLACED } });
    expect(await settled(b)).toEqual({ done: false });
  });

  it('answers turn-ended on the transition to idle when nothing is parked', async () => {
    const a = awaitStartOutcome(A, createCancelToken(), place);
    noteSetupStreaming(A, true);
    expect(await settled(a)).toEqual({ done: false });
    noteSetupStreaming(A, false);
    expect(await settled(a)).toEqual({ done: true, value: { kind: 'turn-ended' } });
  });

  it('keeps waiting through an idle transition while a question is parked — the agent may still report', async () => {
    const a = awaitStartOutcome(A, createCancelToken(), place);
    noteSetupStreaming(A, true);
    noteSetupParked(A, 1);
    noteSetupStreaming(A, false);
    expect(await settled(a)).toEqual({ done: false });
    noteSetupParked(A, -1);
    noteSetupStreaming(A, true);
    noteSetupReport(A, 3000);
    expect(await settled(a)).toEqual({ done: true, value: { kind: 'reported', port: 3000, frame: NOT_PLACED } });
  });

  it('a parked count never goes negative, so one stray resolve cannot un-park a later question', async () => {
    noteSetupParked(A, -1);
    noteSetupParked(A, 1);
    const a = awaitStartOutcome(A, createCancelToken(), place);
    noteSetupStreaming(A, true);
    noteSetupStreaming(A, false);
    expect(await settled(a)).toEqual({ done: false });
  });

  it('answers canceled at once when the token fires', async () => {
    const token = createCancelToken();
    const a = awaitStartOutcome(A, token, place);
    token.cancel();
    expect(await settled(a)).toEqual({ done: true, value: { kind: 'canceled' } });
  });

  it('reaches one record through both spellings of a worktree', async () => {
    const a = awaitStartOutcome('/ws/a/', createCancelToken(), place);
    noteSetupReport(A, 4000);
    expect(await settled(a)).toEqual({ done: true, value: { kind: 'reported', port: 4000, frame: NOT_PLACED } });
  });
});

describe('awaitSessionIdle', () => {
  it('answers idle at once for a session between turns', async () => {
    expect(await awaitSessionIdle(A, createCancelToken())).toBe('idle');
    expect(isSessionStreaming(A)).toBe(false);
  });

  it('waits out a running turn and answers on the transition', async () => {
    noteSetupStreaming(A, true);
    expect(isSessionStreaming(A)).toBe(true);
    const idle = awaitSessionIdle(A, createCancelToken());
    expect(await settled(idle)).toEqual({ done: false });
    noteSetupStreaming(A, false);
    expect(await settled(idle)).toEqual({ done: true, value: 'idle' });
  });

  it('answers canceled when the token fires first', async () => {
    noteSetupStreaming(A, true);
    const token = createCancelToken();
    const idle = awaitSessionIdle(A, token);
    token.cancel();
    expect(await settled(idle)).toEqual({ done: true, value: 'canceled' });
  });
});

describe('noteSetupTabClosed', () => {
  it('evicts an idle record, through either spelling, and leaves the other worktree alone', () => {
    noteSetupStreaming(A, true);
    noteSetupStreaming(B, true);
    noteSetupTabClosed('/ws/a/');
    expect(hasSetupRecord(A)).toBe(false);
    expect(hasSetupRecord(B)).toBe(true);
    expect(isSessionStreaming(A)).toBe(false);
    expect(() => noteSetupTabClosed('/ws/never')).not.toThrow();
  });

  it('keeps a record a start waiter is pending on, and that waiter still hears the outcome', async () => {
    const a = awaitStartOutcome(A, createCancelToken(), place);
    noteSetupTabClosed(A);
    expect(hasSetupRecord(A)).toBe(true);
    noteSetupStreaming(A, true);
    noteSetupStreaming(A, false);
    expect(await settled(a)).toEqual({ done: true, value: { kind: 'turn-ended' } });
  });

  it('keeps a record an idle waiter is pending on', async () => {
    noteSetupStreaming(A, true);
    const idle = awaitSessionIdle(A, createCancelToken());
    noteSetupTabClosed(A);
    expect(hasSetupRecord(A)).toBe(true);
    noteSetupStreaming(A, false);
    expect(await settled(idle)).toEqual({ done: true, value: 'idle' });
  });
});

describe('a report answers with the first frame the setup placed (ONL-2424)', () => {
  const node: CanvasNode = {
    id: 'frame-1',
    name: 'localhost:5173',
    pageId: 'page-1',
    kind: 'browser',
    content: { homeUrl: 'http://localhost:5173' },
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
    order: 0,
  };

  it('places once for every waiting start, and the report and the waiters hear the same frame', async () => {
    const ports: number[] = [];
    const placing = async (port: number): Promise<FirstFrameAnswer> => {
      ports.push(port);
      return { kind: 'placed', node };
    };
    const first = awaitStartOutcome(A, createCancelToken(), placing);
    const retry = awaitStartOutcome(A, createCancelToken(), placing);
    expect(await noteSetupReport(A, 5173)).toEqual({ kind: 'placed', node });
    expect(ports).toEqual([5173]);
    for (const waiter of [first, retry]) {
      expect(await waiter).toEqual({ kind: 'reported', port: 5173, frame: { kind: 'placed', node } });
    }
  });

  it('a placement that throws still answers, as not placed, and still wakes the setup', async () => {
    const start = awaitStartOutcome(A, createCancelToken(), () => Promise.reject(new Error('canvas gone')));
    const answer = await noteSetupReport(A, 3000);
    expect(answer.kind).toBe('not-placed');
    expect(await settled(start)).toEqual({ done: true, value: { kind: 'reported', port: 3000, frame: answer } });
  });

  it('a canceled setup answers no-setup at once and places nothing', async () => {
    let placed = false;
    const token = createCancelToken();
    void awaitStartOutcome(A, token, async () => {
      placed = true;
      return { kind: 'placed', node };
    });
    token.cancel();
    await token.whenCanceled;
    expect(await settled(noteSetupReport(A, 3000))).toEqual({ done: true, value: { kind: 'no-setup' } });
    expect(placed).toBe(false);
  });
});
