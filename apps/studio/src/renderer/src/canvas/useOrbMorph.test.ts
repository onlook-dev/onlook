import { describe, expect, it } from 'bun:test';
import { ORB_SIZE, ORB_SPRINGS, morphFrame, stepSpring, type Spring } from './useOrbMorph.js';

const CARD = { width: 280, height: 48, radius: 12 };
const DT = 0.004;

function run(spring: Spring, from: number, to: number, seconds: number, velocity = 0): number[] {
  let x = from;
  let v = velocity;
  const samples: number[] = [];
  for (let t = 0; t < seconds; t += DT) {
    [x, v] = stepSpring(x, v, to, spring, DT);
    samples.push(x);
  }
  return samples;
}

function settledBy(samples: number[], target: number, tolerance: number): number {
  let last = 0;
  samples.forEach((x, i) => {
    if (Math.abs(x - target) > tolerance) last = i;
  });
  return (last + 1) * DT;
}

describe('the orb-to-input springs (ONL-2455)', () => {
  it('open: width lands within a few px of overshoot and settles in about a quarter second', () => {
    const width = run(ORB_SPRINGS.open.width, ORB_SIZE, CARD.width, 1);
    const overshoot = Math.max(...width) - CARD.width;
    expect(overshoot).toBeGreaterThan(1);
    expect(overshoot).toBeLessThan(8);
    expect(settledBy(width, CARD.width, 0.5)).toBeLessThan(0.35);
  });

  it('open: width leads height, so it stretches wide before it fills', () => {
    const width = run(ORB_SPRINGS.open.width, ORB_SIZE, CARD.width, 0.3);
    const height = run(ORB_SPRINGS.open.height, ORB_SIZE, CARD.height, 0.3);
    const at = Math.round(0.06 / DT);
    const widthDone = ((width[at] ?? 0) - ORB_SIZE) / (CARD.width - ORB_SIZE);
    const heightDone = ((height[at] ?? 0) - ORB_SIZE) / (CARD.height - ORB_SIZE);
    expect(widthDone).toBeGreaterThan(heightDone);
  });

  it('close: height leads width, so it drops to a pill before it zips in', () => {
    const width = run(ORB_SPRINGS.close.width, CARD.width, ORB_SIZE, 0.3);
    const height = run(ORB_SPRINGS.close.height, CARD.height, ORB_SIZE, 0.3);
    const at = Math.round(0.06 / DT);
    const widthDone = (CARD.width - (width[at] ?? 0)) / (CARD.width - ORB_SIZE);
    const heightDone = (CARD.height - (height[at] ?? 0)) / (CARD.height - ORB_SIZE);
    expect(heightDone).toBeGreaterThan(widthDone);
  });

  it('close: the orb lands with a squash of a px or two, never a wobble you can count', () => {
    const width = run(ORB_SPRINGS.close.width, CARD.width, ORB_SIZE, 1);
    const dip = ORB_SIZE - Math.min(...width);
    expect(dip).toBeGreaterThan(0.5);
    expect(dip).toBeLessThan(4);
    expect(settledBy(width, ORB_SIZE, 0.5)).toBeLessThan(0.35);
  });

  it('a reversal mid-flight keeps its momentum: the turn is continuous, with no jump', () => {
    let x = ORB_SIZE;
    let v = 0;
    for (let t = 0; t < 0.08; t += DT) [x, v] = stepSpring(x, v, CARD.width, ORB_SPRINGS.open.width, DT);
    const before = x;
    const [after, afterV] = stepSpring(x, v, ORB_SIZE, ORB_SPRINGS.close.width, DT);
    expect(after).toBeGreaterThan(before);
    expect(Math.abs(after - before)).toBeLessThan(Math.abs(v) * DT * 1.1);
    expect(afterV).toBeLessThan(v);
  });
});

describe('the surface follows the shape (ONL-2455)', () => {
  it('at the orb: a 32px circle, the input hidden and clipped, the sparkles whole', () => {
    const frame = morphFrame(ORB_SIZE, ORB_SIZE, CARD, 'above');
    expect(frame.shape).toEqual({ width: 32, height: 32, radius: 16 });
    expect(frame.clip).toBe('inset(16.00px 124.00px 0px 124.00px round 16.00px)');
    expect(frame.content).toBe(0);
    expect(frame.orb).toBe(1);
    expect(frame.turn).toBe(0);
  });

  it('open: the card, unclipped, the input whole, the sparkles gone', () => {
    const frame = morphFrame(CARD.width, CARD.height, CARD, 'above');
    expect(frame.shape).toEqual({ width: 280, height: 48, radius: 12 });
    expect(frame.clip).toBeNull();
    expect(frame.content).toBe(1);
    expect(frame.orb).toBe(0);
    expect(frame.turn).toBe(40);
  });

  it('below its element, the clip hangs from the top edge', () => {
    expect(morphFrame(ORB_SIZE, ORB_SIZE, CARD, 'below').clip).toBe(
      'inset(0px 124.00px 16.00px 124.00px round 16.00px)',
    );
  });

  it('an overshoot past the card shows as the shape, never as a clip', () => {
    const frame = morphFrame(CARD.width + 4, CARD.height, CARD, 'above');
    expect(frame.shape.width).toBe(284);
    expect(frame.clip).toBeNull();
  });

  it('a squash under the orb stays a circle', () => {
    expect(morphFrame(30, 32, CARD, 'above').shape.radius).toBe(15);
  });

  it('the input only appears once the shape can hold it', () => {
    const halfway = morphFrame(ORB_SIZE + (CARD.width - ORB_SIZE) / 2, CARD.height, CARD, 'above');
    expect(halfway.content).toBe(0);
    expect(halfway.orb).toBe(0);
  });
});
