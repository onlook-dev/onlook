import { FrameType, type WebFrame } from '@onlook/models';
import type { Frame as DbFrame } from '../schema';

export const toFrame = (dbFrame: DbFrame): WebFrame => {
    return {
        id: dbFrame.id,
        url: dbFrame.url,
        type: dbFrame.type as FrameType,
        canvasId: dbFrame.canvasId,
        position: {
            x: Number(dbFrame.x),
            y: Number(dbFrame.y),
        },
        dimension: {
            width: Number(dbFrame.width),
            height: Number(dbFrame.height),
        },
    };
};

export const fromFrame = (frame: WebFrame): DbFrame => {
    return {
        id: frame.id,
        url: frame.url,
        type: frame.type as FrameType,
        x: frame.position.x.toString(),
        y: frame.position.y.toString(),
        canvasId: frame.canvasId,
        width: frame.dimension.width.toString(),
        height: frame.dimension.height.toString(),
    };
};

export const fromPartialFrame = (frame: Partial<WebFrame>): Partial<DbFrame> => {
    return {
        id: frame.id,
        url: frame.url,
        type: frame.type as FrameType,
        x: frame.position?.x.toString(),
        y: frame.position?.y.toString(),
        canvasId: frame.canvasId,
        width: frame.dimension?.width.toString(),
        height: frame.dimension?.height.toString(),
    };
};