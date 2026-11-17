import { describe, expect, it } from 'bun:test';
import { zoomActionForInput } from './zoom-chords.js';

const down = (
  key: string,
  mods: Partial<{ meta: boolean; control: boolean; alt: boolean }> = {},
) => ({
  type: 'keyDown' as const,
  key,
  meta: false,
  control: false,
  alt: false,
  ...mods,
});

describe('the zoom chords', () => {
  it('maps ⌘= ⌘+ ⌘− ⌘_ ⌘0 on mac', () => {
    expect(zoomActionForInput(down('=', { meta: true }), true)).toBe('in');
    expect(zoomActionForInput(down('+', { meta: true }), true)).toBe('in');
    expect(zoomActionForInput(down('-', { meta: true }), true)).toBe('out');
    expect(zoomActionForInput(down('_', { meta: true }), true)).toBe('out');
    expect(zoomActionForInput(down('0', { meta: true }), true)).toBe('reset');
  });

  it('leaves numbered shortcuts to tabs', () => {
    expect(zoomActionForInput(down('1', { meta: true }), true)).toBeNull();
    expect(zoomActionForInput(down('2', { meta: true }), true)).toBeNull();
    expect(zoomActionForInput(down('1', { control: true }), false)).toBeNull();
  });

  it('never fires on a bare digit, whatever the platform', () => {
    expect(zoomActionForInput(down('1'), true)).toBeNull();
    expect(zoomActionForInput(down('2'), true)).toBeNull();
    expect(zoomActionForInput(down('1'), false)).toBeNull();
    // ⇧1 arrives as `!` with no ⌘; the guest relay owns it.
    expect(zoomActionForInput(down('!'), true)).toBeNull();
  });

  it('is ctrl elsewhere, and the other modifier disqualifies', () => {
    expect(zoomActionForInput(down('-', { control: true }), false)).toBe('out');
    expect(zoomActionForInput(down('-', { meta: true }), false)).toBeNull();
    expect(zoomActionForInput(down('-', { control: true }), true)).toBeNull();
    expect(
      zoomActionForInput(down('-', { meta: true, control: true }), true),
    ).toBeNull();
  });

  it('ignores alt chords, other keys, bare keys and keyUp', () => {
    expect(
      zoomActionForInput(down('-', { meta: true, alt: true }), true),
    ).toBeNull();
    expect(zoomActionForInput(down('a', { meta: true }), true)).toBeNull();
    expect(zoomActionForInput(down('-'), true)).toBeNull();
    expect(
      zoomActionForInput({ ...down('-', { meta: true }), type: 'keyUp' }, true),
    ).toBeNull();
  });
});
