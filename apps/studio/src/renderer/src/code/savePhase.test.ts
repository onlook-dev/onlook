import { describe, expect, it } from 'bun:test';
import { saveBarPhase } from './savePhase.js';

describe('what the save bar says next (ONL-2563)', () => {
  /* A save clears the dirty flag and reports itself in ONE store update. Judged apart, the
     "nothing is unsaved" arm took the bar down in the same commit and the word never held. */
  it('says it saved when the write lands, even though nothing is unsaved any more', () => {
    expect(saveBarPhase({ phase: 'dirty', dirty: false, isNewSave: true })).toBe('saved');
  });

  it('says unsaved while anything is', () => {
    expect(saveBarPhase({ phase: null, dirty: true, isNewSave: false })).toBe('dirty');
  });

  it('stays unsaved when saving one file leaves another dirty', () => {
    expect(saveBarPhase({ phase: 'dirty', dirty: true, isNewSave: true })).toBe('dirty');
  });

  it('stays unsaved when a keystroke lands during a save', () => {
    expect(saveBarPhase({ phase: 'saved', dirty: true, isNewSave: true })).toBe('dirty');
  });

  /* Discarding or closing a dirty tab clears the flag and saved nothing, so the bar goes. */
  it('takes the unsaved bar down when the text goes without a write', () => {
    expect(saveBarPhase({ phase: 'dirty', dirty: false, isNewSave: false })).toBeNull();
  });

  it('leaves the saved word up for its hold', () => {
    expect(saveBarPhase({ phase: 'saved', dirty: false, isNewSave: false })).toBe('saved');
    expect(saveBarPhase({ phase: 'leaving', dirty: false, isNewSave: false })).toBe('leaving');
  });

  /* Typing inside the hold: the designer has unsaved text again, and the bar says so rather than
     finishing the previous save's exit. */
  it('goes back to unsaved when an edit lands inside the saved hold', () => {
    expect(saveBarPhase({ phase: 'saved', dirty: true, isNewSave: false })).toBe('dirty');
  });

  it('stays down when there is nothing to say', () => {
    expect(saveBarPhase({ phase: null, dirty: false, isNewSave: false })).toBeNull();
  });
});
