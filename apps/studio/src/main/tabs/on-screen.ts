export interface OnScreenFacts {
  isActive: boolean;
  isWindowFocused: boolean;
  isPinned: boolean;
}

/** In front of the person: the active tab of the focused window. A visible but unfocused window does not count (ONL-2960). */
export function tabOnScreen({ isActive, isWindowFocused, isPinned }: OnScreenFacts): boolean {
  return isPinned || (isActive && isWindowFocused);
}
