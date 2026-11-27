import { describe, expect, test } from 'bun:test';
import { withoutRecommended } from './question-answers.js';

describe('the agent’s recommended mark', () => {
  test('trims whitespace after removing the suffix and handles long whitespace quickly', () => {
    expect(withoutRecommended('Palette \t（ 推奨 ）  ')).toBe('Palette');
    expect(withoutRecommended('Palette  ')).toBe('Palette');
    const label = `Palette${' '.repeat(1_000_000)}!`;
    const started = performance.now();
    expect(withoutRecommended(label)).toBe(label);
    expect(performance.now() - started).toBeLessThan(1000);
  });
  test('is read in the language the agent wrote it in, in either bracket width', () => {
    for (const label of ['Warm palette (Recommended)', 'Warm palette (recommended)', '暖色系 (おすすめ)', '暖色系（おすすめ）', '暖色系（推奨）']) {
      expect(withoutRecommended(label)).not.toBe(label);
    }
    expect(withoutRecommended('暖色系（おすすめ）')).toBe('暖色系');
  });

  test('is only a mark at the end of the label', () => {
    expect(withoutRecommended('おすすめの配色')).toBe('おすすめの配色');
    expect(withoutRecommended('Recommended layout')).toBe('Recommended layout');
  });
});
