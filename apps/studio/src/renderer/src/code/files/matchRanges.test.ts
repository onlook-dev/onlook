import { describe, expect, it } from 'bun:test';
import { matchRanges } from './matchRanges.js';

const shown = (text: string, query: string): string =>
  matchRanges(text, query)
    .map((part) => (part.isMatch ? `[${part.text}]` : part.text))
    .join('');

describe('marking what a search matched (ONL-2563)', () => {
  it('marks the term where it was found', () => {
    expect(shown('const Teal = 1', 'Teal')).toBe('const [Teal] = 1');
  });

  it('matches case-insensitively and keeps the text’s own casing', () => {
    expect(shown('const Teal = 1', 'teal')).toBe('const [Teal] = 1');
  });

  it('marks every occurrence on the line', () => {
    expect(shown('Teal and Teal', 'teal')).toBe('[Teal] and [Teal]');
  });

  it('marks a term at the very start and at the very end', () => {
    expect(shown('Teal x', 'Teal')).toBe('[Teal] x');
    expect(shown('x Teal', 'Teal')).toBe('x [Teal]');
  });

  /* A term that is not there is one unmarked part, so the row renders as plain
     text rather than as a single empty mark. */
  it('leaves a line with no match as one plain part', () => {
    expect(matchRanges('const x = 1', 'zzz')).toEqual([{ text: 'const x = 1', isMatch: false }]);
  });

  it('leaves everything plain for an empty or blank term', () => {
    expect(matchRanges('const x', '')).toEqual([{ text: 'const x', isMatch: false }]);
    expect(matchRanges('const x', '   ')).toEqual([{ text: 'const x', isMatch: false }]);
  });

  it('loses no characters, whatever it marked', () => {
    const line = 'TealTeal teal';
    expect(matchRanges(line, 'teal').map((part) => part.text).join('')).toBe(line);
  });
});
