import type { Frame, RectPosition } from "./frame";

export interface Canvas {
    id: string;
    scale: number | null;
    frames: Frame[] | null;
    position: RectPosition | null;
}
