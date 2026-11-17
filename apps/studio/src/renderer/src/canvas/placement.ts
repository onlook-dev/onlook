// The placements themselves live in `@studio/events` so main's canvas tools
// land an agent-created frame where a duplicate lands (ONL-1995); only what
// reads React Flow's projection stays here.

import type { ViewRect } from '@studio/events';

/**
 * The window box is the right screen extent: the canvas is full-bleed beneath
 * the top bar and the panels are overlays, not walls (ONL-1889).
 */
export function windowViewRect(
  screenToFlow: (point: { x: number; y: number }) => { x: number; y: number },
  screen: { innerWidth: number; innerHeight: number },
): ViewRect {
  const topLeft = screenToFlow({ x: 0, y: 0 });
  const bottomRight = screenToFlow({ x: screen.innerWidth, y: screen.innerHeight });
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}
