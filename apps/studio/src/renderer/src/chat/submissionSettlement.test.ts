import { describe, expect, it } from 'bun:test';
import { shouldClearComposerText, shouldClearElementPicks } from './submissionSettlement.js';

describe('shouldClearComposerText', () => {
  it('clears only when the controlled composer has not changed since submit', () => {
    expect(shouldClearComposerText(4, 4)).toBe(true);
    expect(shouldClearComposerText(4, 5)).toBe(false);
  });
});

describe('shouldClearElementPicks', () => {
  it('keeps the picks for a held prompt, whose take restores only its images', () => {
    expect(shouldClearElementPicks(true)).toBe(false);
  });

  it('clears them for a prompt that actually went', () => {
    expect(shouldClearElementPicks(false)).toBe(true);
  });
});
