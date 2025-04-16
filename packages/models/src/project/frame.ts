export enum FrameType {
    WEB = 'web',
}

export interface Frame {
    id: string;
    position: RectPosition;
    dimension: RectDimension;
    type: FrameType;
    device: string;
    orientation: string;
    aspectRatioLocked: boolean;
}

export interface WebFrame extends Frame {
    url: string;
    type: FrameType.WEB;
}

export interface RectPosition {
    x: number;
    y: number;
}

export interface RectDimension {
    width: number;
    height: number;
}
