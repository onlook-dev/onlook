import type { ChromeSlotAction } from '@studio/events';

export type FolderDecision = 'exit' | 'ignore' | 'abandon-then-exit';

/**
 * A press mid-switch is ignored: leaving would start a second landing. A close abandons whether or not
 * `isSwitching` is up: the create machine's landing raises no flag, and only a stale token stops it announcing for a closed tab (ONL-2265).
 */
export function folderDecision(
  action: Extract<ChromeSlotAction, { slot: 'folder' }>,
  isSwitching: boolean,
): FolderDecision {
  if (action.closing === true) return 'abandon-then-exit';
  return isSwitching ? 'ignore' : 'exit';
}
