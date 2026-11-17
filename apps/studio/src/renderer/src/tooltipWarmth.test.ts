import { describe, expect, test } from 'bun:test';
import { isTooltipWarm, TOOLTIP_WARM_MS } from './tooltipWarmth.js';

describe('tooltip warmth', () => {
  test('a tooltip still open makes its neighbour warm', () => {
    expect(isTooltipWarm(1, Number.NEGATIVE_INFINITY, 0)).toBe(true);
  });
  test('a neighbour reached soon after one closed is warm; a fresh hover after the idle is not', () => {
    expect(isTooltipWarm(0, 1000, 1000 + TOOLTIP_WARM_MS - 1)).toBe(true);
    expect(isTooltipWarm(0, 1000, 1000 + TOOLTIP_WARM_MS)).toBe(false);
    expect(isTooltipWarm(0, Number.NEGATIVE_INFINITY, 0)).toBe(false);
  });
});
