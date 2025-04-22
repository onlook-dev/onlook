import type { Frame, RectPosition } from "./frame";

export interface CanvasSettings {
    scale: number | null;
    frames: Frame[] | null;
    position: RectPosition | null;
}
