import { safeScale } from '../frame/geometry.js';

export interface AnchorPress {
  client: { x: number; y: number };
  /** The menu trigger's screen rect origin. */
  origin: { x: number; y: number };
  zoom: number;
  detail: number;
  isTrusted: boolean;
}

// Astryx writes the cursor's screen-px offset as a plain length inside the trigger, which React Flow has already scaled (ONL-2502).
/** The client point whose offset Astryx scales back to the real one, or `null` when its own anchoring already lands. */
export function correctedAnchorPoint(event: AnchorPress): { x: number; y: number } | null {
  // A re-dispatch is untrusted, so this is also what stops the correction recursing.
  if (!event.isTrusted) return null;
  // Astryx reads this shape as `Shift+F10` and anchors to the trigger's own corner.
  if (event.detail === 0 && event.client.x === 0 && event.client.y === 0) return null;
  const scale = safeScale(event.zoom);
  if (scale === 1) return null;
  return {
    x: event.origin.x + (event.client.x - event.origin.x) / scale,
    y: event.origin.y + (event.client.y - event.origin.y) / scale,
  };
}
