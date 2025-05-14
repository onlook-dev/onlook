import { DefaultSettings } from '@onlook/constants';
import type { Canvas as DbCanvas } from '@onlook/db';
import { v4 as uuidv4 } from 'uuid';

export const createDefaultCanvas = (projectId: string): DbCanvas => {
    return {
        id: uuidv4(),
        scale: DefaultSettings.SCALE.toString(),
        x: DefaultSettings.PAN_POSITION.x.toString(),
        y: DefaultSettings.PAN_POSITION.y.toString(),
        projectId: projectId,
    };
};
