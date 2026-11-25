import { describe, expect, it } from 'bun:test';
import { meetsMinimum, signingGuidance } from './tier.js';

it('unsigned builds explain local use without claiming the app is damaged', () => {
  const guidance = signingGuidance('unsigned');
  expect(guidance).toContain('your own Mac');
  expect(guidance).toContain('not as a trusted download');
  expect(guidance).toContain('SOURCE_BUILD.md');
  expect(guidance).not.toContain('damaged');
  expect(guidance).not.toContain('no bypass');
});

it('signed builds distinguish notarized downloads from a macOS security prompt', () => {
  expect(signingGuidance('signed-unnotarized')).toContain('Privacy & Security');
  expect(signingGuidance('notarized')).toContain('notarized');
});

describe('meetsMinimum with --require-notarized', () => {
  it('lets a notarized cut proceed', () => {
    expect(meetsMinimum('notarized', true)).toBe(true);
  });

  it('aborts a signed-but-unnotarized cut', () => {
    expect(meetsMinimum('signed-unnotarized', true)).toBe(false);
  });
});
