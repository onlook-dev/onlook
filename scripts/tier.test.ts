import { describe, expect, it } from 'bun:test';
import { meetsMinimum } from './tier.js';

describe('meetsMinimum with --require-notarized', () => {
  it('lets a notarized cut proceed', () => {
    expect(meetsMinimum('notarized', true)).toBe(true);
  });

  it('aborts a signed-but-unnotarized cut', () => {
    expect(meetsMinimum('signed-unnotarized', true)).toBe(false);
  });
});
