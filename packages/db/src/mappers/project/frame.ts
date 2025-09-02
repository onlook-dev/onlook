import { type Frame } from '@onlook/models';
import type { Frame as DbFrame } from '../../schema';

export const fromDbFrame = (dbFrame: DbFrame): Frame => {
    if (dbFrame.branchId === null) {
        throw new Error('Frame branchId should not be null');
    }
    return {
        id: dbFrame.id,
        canvasId: dbFrame.canvasId,
        branchId: dbFrame.branchId,
        url: dbFrame.url,
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

export const toDbFrame = (frame: Frame): DbFrame => {
    return {
        id: frame.id,
        branchId: frame.branchId,
        canvasId: frame.canvasId,
        url: frame.url,
        x: frame.position.x.toString(),
        y: frame.position.y.toString(),
        width: frame.dimension.width.toString(),
        height: frame.dimension.height.toString(),

        // deprecated
        type: null,
    };
};

export const toDbPartialFrame = (frame: Partial<Frame>): Partial<DbFrame> => {
    return {
        id: frame.id,
        url: frame.url,
        x: frame.position?.x.toString(),
        y: frame.position?.y.toString(),
        canvasId: frame.canvasId,
        width: frame.dimension?.width.toString(),
        height: frame.dimension?.height.toString(),
    };
};