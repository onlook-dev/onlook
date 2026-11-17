import type { SaveBarPhase } from './SaveBar.js';

export interface SaveBarFacts {
  /** What the bar is showing now. */
  phase: SaveBarPhase | null;
  /** Any open file has unsaved text, not only the active one. */
  dirty: boolean;
  /** A write LANDED since the last answer. Discard, Reload and closing a dirty tab do not. */
  isNewSave: boolean;
}

export function saveBarPhase(facts: SaveBarFacts): SaveBarPhase | null {
  if (facts.dirty) return 'dirty';
  if (facts.isNewSave) return 'saved';
  // The saved word keeps its hold; only the unsaved bar has nothing left to say.
  return facts.phase === 'dirty' ? null : facts.phase;
}
