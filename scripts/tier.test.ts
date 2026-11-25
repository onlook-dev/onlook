import { describe, expect, it } from 'bun:test';
import { assessesGatekeeper, meetsMinimum, signingGuidance, type Tier } from './tier.js';

it.each(['unsigned', 'signed-unnotarized', 'notarized'] as const)('always assesses official %s builds and signed source builds', (tier: Tier) => {
  expect(assessesGatekeeper(tier, true)).toBe(true);
  expect(assessesGatekeeper(tier, false)).toBe(tier !== 'unsigned');
});

it('unsigned builds explain local use without claiming the app is damaged', () => {
  const guidance = signingGuidance('unsigned', false);
  expect(guidance).toContain('your own Mac');
  expect(guidance).toContain('not as a trusted download');
  expect(guidance).toContain('SOURCE_BUILD.md');
  expect(guidance).not.toContain('damaged');
  expect(guidance).not.toContain('no bypass');
});

it('official builds retain their signing guidance for every tier', () => {
  expect(signingGuidance('unsigned', true)).toBe('Recipient sees "damaged, move to Trash". There is no bypass. Do not send this.');
  expect(signingGuidance('signed-unnotarized', true)).toBe('Recipient must do the "Open Anyway" dance:\n  System Settings > Privacy & Security > Open Anyway.');
  expect(signingGuidance('notarized', true)).toBe('Recipient double-clicks, drags to Applications, opens. No dialog.');
});

it('signed builds distinguish notarized downloads from a macOS security prompt', () => {
  expect(signingGuidance('signed-unnotarized', false)).toContain('Privacy & Security');
  expect(signingGuidance('notarized', false)).toContain('notarized');
});

describe('meetsMinimum with --require-notarized', () => {
  it('lets a notarized cut proceed', () => {
    expect(meetsMinimum('notarized', true)).toBe(true);
  });

  it('aborts a signed-but-unnotarized cut', () => {
    expect(meetsMinimum('signed-unnotarized', true)).toBe(false);
  });
});
