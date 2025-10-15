import { DefaultSettings } from '@onlook/constants';
import type { UserCanvas as DbUserCanvas } from '../schema';

export const createDefaultUserCanvas = (userId: string, canvasId: string, overrides: Partial<DbUserCanvas> = {}): DbUserCanvas => {
    return {
        userId,
        canvasId,
        scale: DefaultSettings.SCALE.toString(),
        x: DefaultSettings.PAN_POSITION.x.toString(),
        y: DefaultSettings.PAN_POSITION.y.toString(),
        ...overrides,
    };
};
