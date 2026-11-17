import { describe, expect, it } from 'bun:test';
import { nextArtifactTitle } from './naming.js';

describe('the title a minted artifact wears (ONL-2568)', () => {
  it('starts at one', () => {
    expect(nextArtifactTitle([])).toBe('Artifact 1');
  });

  it('never repeats a title a sketch already wears', () => {
    // Two sketches that read the same in the Designs list are two a designer cannot attach.
    expect(nextArtifactTitle(['Artifact 1'])).toBe('Artifact 2');
    expect(nextArtifactTitle(['Artifact 1', 'Artifact 2'])).toBe('Artifact 3');
  });

  it('fills the gap a delete left rather than counting', () => {
    // A count would mint `Artifact 3` here and collide the moment anything is renamed back.
    expect(nextArtifactTitle(['Artifact 1', 'Artifact 3'])).toBe('Artifact 2');
  });

  it('ignores titles the user chose, however they read', () => {
    expect(nextArtifactTitle(['Pricing', 'Checkout'])).toBe('Artifact 1');
  });

  it('reads a padded title as the one it is', () => {
    expect(nextArtifactTitle(['  Artifact 1  '])).toBe('Artifact 2');
  });
});
