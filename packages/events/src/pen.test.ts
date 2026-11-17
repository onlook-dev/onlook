import { describe, expect, it } from 'bun:test';
import { penLabel } from './pen.js';

describe('penLabel', () => {
  it('names the parked question: the prompt waits behind the question, not behind the turn', () => {
    expect(penLabel({ isLive: true, needsAttention: true })).toBe('question');
  });

  it('says working while a turn runs and nothing is parked', () => {
    expect(penLabel({ isLive: true, needsAttention: false })).toBe('working');
  });

  it('says not-sent when nothing is running — the prompt is on its way back to the composer', () => {
    expect(penLabel({ isLive: false, needsAttention: false })).toBe('not-sent');
  });

  it('a latched hold outranks both: the turn it was bound to ended without releasing it', () => {
    expect(penLabel({ isLive: true, needsAttention: true, verdict: 'hold' })).toBe('not-sent');
    expect(penLabel({ isLive: true, needsAttention: false, verdict: 'hold' })).toBe('not-sent');
  });
});
