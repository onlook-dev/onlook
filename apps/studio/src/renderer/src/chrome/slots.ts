import type { ChromeSlotAction } from '@studio/events';

export interface BandSelection {
  /** The Tab the strip highlights. */
  activeId: string;
  /** The Tab the slots now on screen were published for. */
  projectedTabId: string;
}

/** Projects answers from the strip's own selection, so it works while a selected Tab is still coming on screen (ONL-3121); every other slot control waits until the slots on screen belong to the highlighted Tab. */
export function sendsSlotAction(action: ChromeSlotAction, selection: BandSelection): boolean {
  if (action.slot === 'folder') return true;
  return selection.activeId !== '' && selection.projectedTabId === selection.activeId;
}
