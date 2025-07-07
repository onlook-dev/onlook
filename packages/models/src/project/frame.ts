import { Orientation, Theme } from '@onlook/constants';
import type { RectDimension, RectPosition } from './rect';

export enum FrameType {
    WEB = 'web',
}

export interface Frame {
    id: string;
    position: RectPosition;
    type: FrameType;
    dimension: RectDimension;
    canvasId: string;
}

export interface WebFrame extends Frame {
    url: string;
    type: FrameType.WEB;
}

export interface WindowMetadata {
    orientation: Orientation;
    aspectRatioLocked: boolean;
    device: string;
    theme: Theme;
    width: number;
    height: number;
}
