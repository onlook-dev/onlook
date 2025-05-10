import type { RectDimension, RectPosition } from "./rect";

export enum FrameType {
    WEB = 'web',
}

export interface Frame {
    id: string;
    position: RectPosition;
    dimension: RectDimension;
    type: FrameType;
}

export interface WebFrame extends Frame {
    url: string;
    type: FrameType.WEB;
}
