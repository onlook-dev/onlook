import { describe, expect, it } from 'bun:test';
import { mappingIsStale } from './mappingCertainty.js';

const CLEAN = { isDirty: false, snapshotHash: 'a', onDiskHash: 'a' };

describe('whether Studio can still stand behind a mapping (ONL-2563)', () => {
  it('stands behind one whose file is open and untouched', () => {
    expect(mappingIsStale({ isSelectionStale: false, tab: CLEAN })).toBe(false);
  });

  /* The gap this closes: the mapping is cached per pick, so without this an edit
     left the panel claiming `exact` about a line the designer had just moved. */
  it('stops claiming certainty once the buffer is edited', () => {
    expect(mappingIsStale({ isSelectionStale: false, tab: { ...CLEAN, isDirty: true } })).toBe(true);
  });

  it('stops claiming certainty when the file moved on disk under a clean tab', () => {
    expect(
      mappingIsStale({ isSelectionStale: false, tab: { ...CLEAN, onDiskHash: 'b' } }),
    ).toBe(true);
  });

  it('keeps the guest’s own staleness, whatever the buffer says', () => {
    expect(mappingIsStale({ isSelectionStale: true, tab: CLEAN })).toBe(true);
    expect(mappingIsStale({ isSelectionStale: true, tab: null })).toBe(true);
  });

  /* A file nobody opened cannot be said to have moved, and guessing either way
     would be invention. */
  it('says nothing about a file that is not open', () => {
    expect(mappingIsStale({ isSelectionStale: false, tab: null })).toBe(false);
  });

  it('says nothing when a hash is simply not known yet', () => {
    expect(
      mappingIsStale({ isSelectionStale: false, tab: { isDirty: false, snapshotHash: null, onDiskHash: null } }),
    ).toBe(false);
    expect(
      mappingIsStale({ isSelectionStale: false, tab: { isDirty: false, snapshotHash: 'a', onDiskHash: null } }),
    ).toBe(false);
  });
});
