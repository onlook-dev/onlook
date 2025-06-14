import { DefaultSettings } from '@onlook/constants';
import type { Frame as DbFrame } from '@onlook/db';
import { FrameType } from '@onlook/models';
import { v4 as uuidv4 } from 'uuid';

export const createDefaultFrame = (canvasId: string, url: string): DbFrame => {
    return {
        id: uuidv4(),
        canvasId: canvasId,
        type: FrameType.WEB,
        url: url,
        x: DefaultSettings.FRAME_POSITION.x.toString(),
        y: DefaultSettings.FRAME_POSITION.y.toString(),
        width: DefaultSettings.FRAME_DIMENSION.width.toString(),
        height: DefaultSettings.FRAME_DIMENSION.height.toString(),
    };
};
