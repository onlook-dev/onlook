import { describe, expect, it } from 'bun:test';
import { assessesGatekeeper, meetsMinimum, signingGuidance, type Tier } from './tier.js';

it.each(['unsigned', 'signed-unnotarized', 'notarized'] as const)('always assesses official %s builds and signed source builds', (tier: Tier) => {
  expect(assessesGatekeeper(tier, true)).toBe(true);
  expect(assessesGatekeeper(tier, false)).toBe(tier !== 'unsigned');
});

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
