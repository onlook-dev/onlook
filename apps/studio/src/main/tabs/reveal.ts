export interface RevealFacts {
  /** `hasPainted` once the promoted view has reported `ui:ready`. */
  spare?: { hasPainted?: true };
  /** Home has no rails, and is no worse bare. */
  isParked: boolean;
}

/** Having a spare is not the test: one promoted before its own paint shows the same bare ground (ONL-2318). */
export function revealsOnPaint(facts: RevealFacts): boolean {
  return facts.isParked && facts.spare?.hasPainted !== true;
}

export interface PresentationFacts {
  /** The Tab the strip highlights. */
  selectedId: string | undefined;
  /** The Tab whose view is on screen. */
  shownId: string | undefined;
  /** Absent only when no Tab is selected; a cold selection reports `hasView: false`. */
  selected?: { hasView: boolean; awaitsFirstPaint: boolean };
}

export type PresentationStep =
  | { kind: 'settled' }
  | { kind: 'request-first-paint' }
  | { kind: 'reveal' }
  | { kind: 'wait' };

/** A held-back Tab is asked for its frame again, never revealed bare (ONL-2318, ONL-3121). */
export function presentationStep(facts: PresentationFacts): PresentationStep {
  if (facts.selectedId === undefined || facts.selected === undefined || !facts.selected.hasView) return { kind: 'wait' };
  if (facts.shownId === facts.selectedId) return { kind: 'settled' };
  return facts.selected.awaitsFirstPaint ? { kind: 'request-first-paint' } : { kind: 'reveal' };
}
