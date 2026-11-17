import { describe, expect, it } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { appendEvents, applyGapFill, emptyBuffer, fillGap, resetBuffer } from './eventBuffer.js';

function event(sessionId: string, seq: number): StudioEvent {
  return {
    type: 'turn.started',
    turnId: `t${String(seq)}`,
    sessionId,
    eventId: `${sessionId}-e${String(seq)}`,
    seq,
    ts: 0,
  };
}

const seqs = (buffer: { events: StudioEvent[] }): number[] =>
  buffer.events.map((e) => e.seq);

const ids = (buffer: { events: StudioEvent[] }): string[] =>
  buffer.events.map((e) => e.eventId);

describe('appendEvents', () => {
  it('keeps events in arrival order and tracks the high-water mark', () => {
    const buffer = appendEvents(emptyBuffer, [event('s1', 1), event('s1', 2)]);
    expect(seqs(buffer)).toEqual([1, 2]);
    expect(buffer.lastSeq).toBe(2);
    expect(buffer.sessionId).toBe('s1');
  });

  it('drops a replayed event the live feed already delivered', () => {
    const live = appendEvents(emptyBuffer, [event('s1', 1), event('s1', 2)]);
    const replayed = appendEvents(live, [event('s1', 1), event('s1', 2), event('s1', 3)]);
    expect(seqs(replayed)).toEqual([1, 2, 3]);
  });

  it('returns the same object when every event is already applied', () => {
    const buffer = appendEvents(emptyBuffer, [event('s1', 1)]);
    expect(appendEvents(buffer, [event('s1', 1)])).toBe(buffer);
  });

  it('starts over when the events belong to a new session', () => {
    const first = appendEvents(emptyBuffer, [
      event('s1', 1),
      event('s1', 2),
      event('s1', 40),
    ]);
    expect(first.lastSeq).toBe(40);

    const second = appendEvents(first, [event('s2', 1), event('s2', 2)]);

    expect(second.sessionId).toBe('s2');
    expect(second.lastSeq).toBe(2);
    expect(ids(second)).toEqual(['s2-e1', 's2-e2']);
  });

  it('handles a batch that spans a session boundary', () => {
    const buffer = appendEvents(emptyBuffer, [
      event('s1', 1),
      event('s1', 2),
      event('s2', 1),
    ]);
    expect(ids(buffer)).toEqual(['s2-e1']);
    expect(buffer.lastSeq).toBe(1);
  });
});

describe('resetBuffer', () => {
  it('clears when the session ends, which no event can announce', () => {
    const buffer = appendEvents(emptyBuffer, [event('s1', 1)]);
    const cleared = resetBuffer(buffer, undefined);
    expect(cleared.events).toEqual([]);
    expect(cleared.lastSeq).toBe(0);
    expect(cleared.sessionId).toBeUndefined();
  });

  it('is a no-op for the session already held', () => {
    const buffer = appendEvents(emptyBuffer, [event('s1', 1)]);
    expect(resetBuffer(buffer, 's1')).toBe(buffer);
  });
});

describe('a hole in the sequence (ONL-2353)', () => {
  it('a skip past the mark is reported once and admitted; the next append clears it', () => {
    const before = appendEvents(emptyBuffer, [event('s1', 4), event('s1', 5)]);
    expect(before.gap).toBeUndefined();
    const gapped = appendEvents(before, [event('s1', 9)]);
    expect(gapped.gap).toEqual({ from: 5, to: 9 });
    expect(seqs(gapped)).toEqual([4, 5, 9]);
    const after = appendEvents(gapped, [event('s1', 10)]);
    expect(after.gap).toBeUndefined();
    expect(seqs(after)).toEqual([4, 5, 9, 10]);
    expect(appendEvents(emptyBuffer, [event('s1', 1), event('s1', 5)]).gap).toEqual({ from: 1, to: 5 });
  });

  it('a new session at seq 1 after an old one at 40 is not a gap', () => {
    const old = appendEvents(emptyBuffer, [event('s1', 40)]);
    const fresh = appendEvents(old, [event('s2', 1)]);
    expect(fresh.gap).toBeUndefined();
    expect(seqs(fresh)).toEqual([1]);
  });

  it('a redundant append still clears a stale gap', () => {
    const gapped = appendEvents(appendEvents(emptyBuffer, [event('s1', 1), event('s1', 2)]), [event('s1', 9)]);
    const same = appendEvents(gapped, [event('s1', 9)]);
    expect(same.gap).toBeUndefined();
    expect(seqs(same)).toEqual([1, 2, 9]);
  });

  it('fillGap inserts the missing events below the mark, in order, dedupes, and clears the gap', () => {
    const gapped = appendEvents(appendEvents(emptyBuffer, [event('s1', 4), event('s1', 5)]), [event('s1', 9)]);
    const filled = fillGap(gapped, [event('s1', 6), event('s1', 7), event('s1', 8), event('s1', 9), event('s1', 10)]);
    expect(seqs(filled)).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(filled.lastSeq).toBe(10);
    expect(filled.gap).toBeUndefined();
    expect(ids(filled)).toEqual(['s1-e4', 's1-e5', 's1-e6', 's1-e7', 's1-e8', 's1-e9', 's1-e10']);
    expect(appendEvents(filled, [event('s1', 6)])).toBe(filled);
  });

  it('fillGap with a snapshot that lacks the events clears the gap and changes nothing else', () => {
    const gapped = appendEvents(appendEvents(emptyBuffer, [event('s1', 4), event('s1', 5)]), [event('s1', 9)]);
    const filled = fillGap(gapped, [event('s1', 9)]);
    expect(seqs(filled)).toEqual([4, 5, 9]);
    expect(filled.gap).toBeUndefined();
    expect(seqs(fillGap(gapped, [event('s2', 6)]))).toEqual([4, 5, 9]);
  });
});

describe('applyGapFill', () => {
  it('still fills after a live event cleared the gap marker', () => {
    const holed = appendEvents(emptyBuffer, [event('s1', 1), event('s1', 5)]);
    expect(holed.gap).toEqual({ from: 1, to: 5 });
    const moved = appendEvents(holed, [event('s1', 6)]);
    expect(moved.gap).toBeUndefined();

    const filled = applyGapFill(moved, 's1', [event('s1', 2), event('s1', 3), event('s1', 4)]);
    expect(seqs(filled)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('refuses an answer for a session the buffer has already left', () => {
    const rotated = appendEvents(emptyBuffer, [event('s2', 1)]);
    expect(applyGapFill(rotated, 's1', [event('s1', 2)])).toBe(rotated);
  });
});
