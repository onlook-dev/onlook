import { describe, expect, it } from 'bun:test';
import { correctedAnchorPoint, type AnchorPress } from './anchorPoint.js';

const ORIGIN = { x: 100, y: 50 };

function press(spec: Partial<AnchorPress> = {}): AnchorPress {
  return {
    client: { x: 500, y: 250 },
    origin: ORIGIN,
    zoom: 0.5,
    detail: 1,
    isTrusted: true,
    ...spec,
  };
}

describe("the menu's cursor anchor inside the scaled canvas (ONL-2502)", () => {
  it('doubles the offset at half scale, so the scaled anchor lands back on the pointer', () => {
    expect(correctedAnchorPoint(press())).toEqual({ x: 900, y: 450 });
  });

  it('halves it at double scale', () => {
    expect(correctedAnchorPoint(press({ zoom: 2 }))).toEqual({ x: 300, y: 150 });
  });

  it('leaves a 1:1 canvas alone — Astryx already lands there', () => {
    expect(correctedAnchorPoint(press({ zoom: 1 }))).toBeNull();
  });

  it('carries an offset above or left of the trigger with its own sign — the chrome band hangs outside the box', () => {
    const above = correctedAnchorPoint(press({ client: { x: 80, y: 20 } }));
    expect(above).toEqual({ x: 60, y: -10 });
  });

  it('corrects nothing on a zero, negative or NaN zoom rather than dividing by it', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(correctedAnchorPoint(press({ zoom: bad })), `zoom ${String(bad)}`).toBeNull();
    }
  });

  it("leaves the keyboard shape alone, so the menu keeps Astryx's trigger-corner fallback", () => {
    expect(correctedAnchorPoint(press({ client: { x: 0, y: 0 }, detail: 0 }))).toBeNull();
  });

  it('corrects a real press that happens to carry no click count', () => {
    expect(correctedAnchorPoint(press({ detail: 0 }))).toEqual({ x: 900, y: 450 });
  });

  it('corrects nothing untrusted, so the re-dispatch cannot recurse', () => {
    expect(correctedAnchorPoint(press({ isTrusted: false }))).toBeNull();
  });
});
