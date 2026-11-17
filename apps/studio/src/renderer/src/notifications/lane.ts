/** Lower left, clear of the chat input (ONL-3182). */
const TOAST_LANE_POSITION = 'bottomStart';

/** How much of the window's lower-left corner is taken, in pixels, written by `foot.ts`; absent, the floor below stands (ONL-3182). */
export const TOAST_FOOT_PROPERTY = '--studio-toast-foot';

/* The `--size-element-lg` floor is the box `cornerPlacement.ts` keeps clear, which a
   shorter measurement must not lower the lane into. */
export const TOAST_LANE_BOTTOM = `calc(var(--spacing-4) + var(--spacing-2) + max(var(--size-element-lg), var(${TOAST_FOOT_PROPERTY}, 0px)))`;
export const TOAST_LANE_START = 'var(--spacing-4)';

/* The library types an inset as pixels and writes whatever it is given straight onto the
   element, so the tokens reach the lane and a token change carries it. */
export const TOAST_LANE = {
  position: TOAST_LANE_POSITION,
  inset: { bottom: TOAST_LANE_BOTTOM as unknown as number, start: TOAST_LANE_START as unknown as number },
} as const;
