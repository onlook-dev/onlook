import { FrameType, type WebFrame } from '@onlook/models';
import { computeWindowMetadata } from '@onlook/utility';
import type { Frame as DbFrame } from '../schema';

export const toFrame = (dbFrame: DbFrame): WebFrame => {
    return {
        id: dbFrame.id,
        url: dbFrame.url,
        type: dbFrame.type as FrameType,
        position: {
            x: Number(dbFrame.x),
            y: Number(dbFrame.y),
        },
        dimension: {
            width: Number(dbFrame.width),
            height: Number(dbFrame.height),
        },
        windowMetadata: computeWindowMetadata(dbFrame.width, dbFrame.height),
    };
};

export const fromFrame = (canvasId: string, frame: WebFrame): DbFrame => {
    return {
        id: frame.id,
        url: frame.url,
        type: frame.type as FrameType,
        x: frame.position.x.toString(),
        y: frame.position.y.toString(),
        canvasId: canvasId,
        width: frame.dimension.width.toString(),
        height: frame.dimension.height.toString(),
    };
};
