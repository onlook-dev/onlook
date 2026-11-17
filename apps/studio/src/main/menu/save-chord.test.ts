import { describe, expect, it } from 'bun:test';
import { isSaveChord } from './save-chord.js';

const down = (over: Partial<Parameters<typeof isSaveChord>[0]>) => ({
  type: 'keyDown' as const,
  key: 's',
  meta: true,
  control: false,
  alt: false,
  shift: false,
  ...over,
});

describe('the save chord main listens for (ONL-2563)', () => {
  it('matches ⌘S on a mac', () => {
    expect(isSaveChord(down({}), true)).toBe(true);
    expect(isSaveChord(down({ key: 'S' }), true)).toBe(true);
  });

  it('matches Ctrl+S off a mac, and not ⌘S there', () => {
    expect(isSaveChord(down({ meta: false, control: true }), false)).toBe(true);
    expect(isSaveChord(down({ meta: true, control: false }), false)).toBe(false);
  });

  it('ignores the key coming up, so one press is one save', () => {
    expect(isSaveChord(down({ type: 'keyUp' as 'keyDown' }), true)).toBe(false);
  });

  /* Shift+⌘S and ⌥⌘S are other commands elsewhere; claiming them here would
     take a chord this feature never asked for. */
  it('ignores the chord with another modifier held', () => {
    expect(isSaveChord(down({ shift: true }), true)).toBe(false);
    expect(isSaveChord(down({ alt: true }), true)).toBe(false);
    expect(isSaveChord(down({ control: true }), true)).toBe(false);
  });

  it('ignores a bare s, which is a letter someone is typing', () => {
    expect(isSaveChord(down({ meta: false }), true)).toBe(false);
  });

  it('ignores another letter held with the same modifier', () => {
    expect(isSaveChord(down({ key: 'd' }), true)).toBe(false);
  });
});
