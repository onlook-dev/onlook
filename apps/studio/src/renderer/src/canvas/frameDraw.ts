import { frameDrawBox, type FrameDrawGesture } from './model.js';
import type { CanvasTool } from './store.js';

interface FrameDrawReadout {
  id: null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameDrawState {
  frameDraw: FrameDrawGesture | null;
  resizeReadout: FrameDrawReadout | { id: string } | null;
}

export interface FrameDrawPatch {
  frameDraw?: FrameDrawGesture | null;
  resizeReadout?: FrameDrawReadout | null;
}

export type FrameDrawPoint = FrameDrawGesture['anchor'];

/** The tools drawn to a size; the text tool is click-to-place and the image tool arms nothing. */
const DRAWN_TOOLS: readonly CanvasTool[] = ['frame', 'artifact', 'section'];

export const isDrawnTool = (tool: CanvasTool): boolean => DRAWN_TOOLS.includes(tool);

export function beginFrameDrawPatch(
  tool: CanvasTool,
  flow: FrameDrawPoint,
  screen: FrameDrawPoint,
): FrameDrawPatch | null {
  if (!isDrawnTool(tool)) return null;
  return {
    frameDraw: { anchor: flow, cursor: flow, screenAnchor: screen, screenCursor: screen },
  };
}

export function updateFrameDrawPatch(
  state: FrameDrawState,
  flow: FrameDrawPoint,
  screen: FrameDrawPoint,
): FrameDrawPatch | null {
  if (state.frameDraw === null) return null;
  const frameDraw = { ...state.frameDraw, cursor: flow, screenCursor: screen };
  const box = frameDrawBox(frameDraw);
  return {
    frameDraw,
    ...(box !== null
      ? { resizeReadout: { id: null, ...box } }
      : state.resizeReadout?.id === null
        ? { resizeReadout: null }
        : {}),
  };
}

export function clearFrameDrawPatch(state: FrameDrawState): FrameDrawPatch | null {
  if (state.frameDraw === null) return null;
  return {
    frameDraw: null,
    ...(state.resizeReadout?.id === null ? { resizeReadout: null } : {}),
  };
}
