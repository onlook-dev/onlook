/** The corner box the designs list scrolls clear of: `--spacing-4` of gutter plus a `--size-element-lg` square. Something floats over the panel's lower-left corner whether or not it is the help control (ONL-2350, ONL-2563). */
export const CORNER_FOOTPRINT = 'calc(var(--spacing-4) + var(--size-element-lg))';
export const CORNER_GUTTER = 'var(--spacing-4)';

interface CornerState {
  chromeHidden: boolean;
  isInteract: boolean;
  /** The icon rail is drawn with the left panel and carries help's other seat, so the left panel's own visibility decides this. */
  isLeftPanelHidden: boolean;
}

/** Preview is the user's app alone; the chord takes the canvas furniture with it (ONL-2593). */
function cornerShows(state: Pick<CornerState, 'chromeHidden' | 'isInteract'>): boolean {
  return !state.chromeHidden && !state.isInteract;
}

/** Shows only when the rail is not there to carry help: two doors at once would stack (ONL-2350, ONL-2563). */
export function helpButtonVisible(state: CornerState): boolean {
  return cornerShows(state) && state.isLeftPanelHidden;
}

/** Steps aside while the inspiration tip holds the Left Rail's foot, its fold included (ONL-2960). */
export function tipsPillVisible(state: Pick<CornerState, 'chromeHidden' | 'isInteract'> & { isInspireTipShown: boolean; isTipsPillHidden?: boolean }): boolean {
  return cornerShows(state) && !state.isInspireTipShown && state.isTipsPillHidden !== true;
}

export const CORNER_YIELDS_BELOW = 480;

export interface CornerPlacement {
  /** Over the left panel's lower corner, clear of the rail; otherwise on the canvas beside the corner's help button (ONL-2593). */
  onPanel: boolean;
  insetInlineStart: string;
  bottom: string;
}

/** `panelFootPx` is what holds the bottom of the left panel, the agent status list today; on the panel the pill stacks above it (ONL-2973). */
export function tipsPillPlacement(state: CornerState, panelFootPx = 0): CornerPlacement {
  if (helpButtonVisible(state)) {
    return {
      onPanel: false,
      insetInlineStart: `calc(${CORNER_GUTTER} + var(--size-element-lg) + var(--spacing-2))`,
      bottom: CORNER_GUTTER,
    };
  }
  const bottom = panelFootPx > 0 ? `calc(${CORNER_GUTTER} + ${String(panelFootPx)}px)` : CORNER_GUTTER;
  return { onPanel: true, insetInlineStart: CORNER_GUTTER, bottom };
}
