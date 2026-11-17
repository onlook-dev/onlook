import { describe, expect, it } from 'bun:test';
import { presentationStep, revealsOnPaint } from './reveal.js';

describe('a parked view waits for its own rails (ONL-2318)', () => {
  it('holds back a view built for this press', () => {
    expect(revealsOnPaint({ isParked: true })).toBe(true);
  });

  it('reveals a spare that has already reported at once', () => {
    expect(revealsOnPaint({ spare: { hasPainted: true }, isParked: true })).toBe(false);
  });

  it('reveals home at once: it has no rails to wait for', () => {
    expect(revealsOnPaint({ isParked: false })).toBe(false);
    expect(revealsOnPaint({ spare: {}, isParked: false })).toBe(false);
  });
});

describe('a spare promoted before its own paint', () => {
  it('is held back exactly like a view built at the press', () => {
    expect(revealsOnPaint({ spare: {}, isParked: true })).toBe(true);
    expect(revealsOnPaint({ spare: {}, isParked: true })).toBe(revealsOnPaint({ isParked: true }));
  });
});

describe('the step from the strip selection to what is on screen (ONL-3121)', () => {
  it('waits while nothing is selected, or the selection has no view yet', () => {
    expect(presentationStep({ selectedId: undefined, shownId: 'tab-1' })).toEqual({ kind: 'wait' });
    expect(presentationStep({ selectedId: 'tab-2', shownId: 'tab-1' })).toEqual({ kind: 'wait' });
    expect(presentationStep({ selectedId: 'tab-2', shownId: 'tab-1', selected: { hasView: false, awaitsFirstPaint: true } })).toEqual({ kind: 'wait' });
  });

  it('settles only when the strip and the screen name the same tab', () => {
    for (const awaitsFirstPaint of [false, true]) {
      expect(presentationStep({ selectedId: 'tab-1', shownId: 'tab-1', selected: { hasView: true, awaitsFirstPaint } })).toEqual({ kind: 'settled' });
    }
  });

  it('asks a held-back selection for its frame again, and reveals one that already painted', () => {
    for (const shownId of [undefined, 'tab-1']) {
      expect(presentationStep({ selectedId: 'tab-2', shownId, selected: { hasView: true, awaitsFirstPaint: true } })).toEqual({ kind: 'request-first-paint' });
      expect(presentationStep({ selectedId: 'tab-2', shownId, selected: { hasView: true, awaitsFirstPaint: false } })).toEqual({ kind: 'reveal' });
    }
  });

  it('never settles while the strip and the screen disagree', () => {
    for (const hasView of [false, true]) {
      for (const awaitsFirstPaint of [false, true]) {
        for (const shownId of [undefined, 'tab-1']) {
          expect(presentationStep({ selectedId: 'tab-2', shownId, selected: { hasView, awaitsFirstPaint } }).kind).not.toBe('settled');
        }
      }
    }
  });
});
