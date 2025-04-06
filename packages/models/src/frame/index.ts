export enum FrameType {
    WEB = 'web',
}

export interface Frame {
    id: string;
    position: { x: number; y: number };
    dimension: { width: number; height: number };
    type: FrameType;
}

export interface WebFrame extends Frame {
    url: string;
    type: FrameType.WEB;
}
