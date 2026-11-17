import { describe, expect, it } from 'bun:test';
import type { AnchorRect } from '@studio/events';
import type { InlineChatRecord } from './inlinePlacement.js';
import { nextInlineChatPresence } from './useInlineChatPresence.js';

const RECT: AnchorRect = { x: 10, y: 20, width: 100, height: 40 };

function record(overrides: Partial<InlineChatRecord> = {}): InlineChatRecord {
  return { anchorId: 'a', draft: '', expanded: false, entry: 'orb', placement: 'above', send: 'idle', refusal: null, ...overrides };
}

describe('the bubble is held through its exit (ONL-2455)', () => {
  it('shows an open record as it is, and keeps the same presence while nothing changed', () => {
    const open = record();
    const first = nextInlineChatPresence(null, open, RECT);
    expect(first).toEqual({ record: open, rect: RECT, exit: null });
    expect(nextInlineChatPresence(first, open, RECT)).toBe(first);
  });

  it('paints nothing for an anchor with no reported box, as before', () => {
    expect(nextInlineChatPresence(null, record(), undefined)).toBeNull();
  });

  it('a record cleared while sending leaves as a send', () => {
    const held = nextInlineChatPresence(null, record({ send: 'sending' }), RECT);
    expect(nextInlineChatPresence(held, null, undefined)?.exit).toBe('sent');
  });

  it('a record cleared any other way leaves as a dismissal, keeping its last frame', () => {
    const open = record({ draft: 'lost', send: 'failed' });
    const held = nextInlineChatPresence(null, open, RECT);
    const leaving = nextInlineChatPresence(held, null, undefined);
    expect(leaving).toEqual({ record: open, rect: RECT, exit: 'dismissed' });
    expect(nextInlineChatPresence(leaving, null, undefined)).toBe(leaving);
  });

  it('a pick during the exit opens the new bubble at once', () => {
    const leaving = nextInlineChatPresence(nextInlineChatPresence(null, record(), RECT), null, undefined);
    const next = record({ anchorId: 'b' });
    expect(nextInlineChatPresence(leaving, next, RECT)).toEqual({ record: next, rect: RECT, exit: null });
  });

  it('nothing held, nothing to play', () => {
    expect(nextInlineChatPresence(null, null, undefined)).toBeNull();
  });
});
