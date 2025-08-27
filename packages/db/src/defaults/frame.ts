import { DefaultSettings } from '@onlook/constants';
import type { Frame as DbFrame } from '@onlook/db';
import { v4 as uuidv4 } from 'uuid';

export const createDefaultFrame = (
    {
        canvasId,
        branchId,
        url,
        overrides,
    }: {
        canvasId: string; branchId: string; url: string; overrides?: Partial<DbFrame>
    },
): DbFrame => {
    return {
        id: uuidv4(),
        canvasId,
        branchId,
        url,
        x: DefaultSettings.FRAME_POSITION.x.toString(),
        y: DefaultSettings.FRAME_POSITION.y.toString(),
        width: DefaultSettings.FRAME_DIMENSION.width.toString(),
        height: DefaultSettings.FRAME_DIMENSION.height.toString(),
        ...overrides,
    };
};
