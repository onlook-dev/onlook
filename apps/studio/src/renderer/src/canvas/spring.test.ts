import { describe, expect, it } from 'bun:test';
import { SPRING_EASING, step, type Spring } from './spring.js';

const run = (spring: Spring, dt = 1 / 120): number => {
  let frames = 0;
  while (!step(spring, dt) && frames < 1000) frames += 1;
  return frames;
};

describe('the toolbar spring', () => {
  it('settles on its target', () => {
    const spring: Spring = { value: 0, velocity: 0, target: 1 };
    expect(run(spring)).toBeLessThan(1000);
    expect(spring.value).toBeCloseTo(1, 2);
  });

  it('keeps its velocity when retargeted mid-flight', () => {
    const spring: Spring = { value: 0, velocity: 0, target: 1 };
    for (let i = 0; i < 6; i += 1) step(spring, 1 / 120);
    const moving = spring.velocity;
    spring.target = 0;
    step(spring, 1 / 120);
    expect(moving).toBeGreaterThan(0);
    expect(spring.velocity).toBeGreaterThan(0);
  });

  it('samples into a linear() easing that ends at 1', () => {
    expect(SPRING_EASING.easing.startsWith('linear(0,')).toBe(true);
    expect(SPRING_EASING.easing.endsWith(', 1)')).toBe(true);
    expect(SPRING_EASING.duration).toBeGreaterThan(0);
  });
});
