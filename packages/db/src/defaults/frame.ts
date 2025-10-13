import type { Frame as DbFrame } from '@onlook/db';
import { v4 as uuidv4 } from 'uuid';

export enum DefaultFrameType {
    DESKTOP = 'desktop',
    MOBILE = 'mobile',
}

export const DefaultDesktopFrame = {
    x: '150',
    y: '40',
    width: '1536',
    height: '960',
} as const;

export const DefaultMobileFrame = {
    x: '1600',
    y: '0',
    width: '440',
    height: '956',
} as const;

const DefaultFrame: Record<DefaultFrameType, { x: string; y: string; width: string; height: string }> = {
    [DefaultFrameType.DESKTOP]: DefaultDesktopFrame,
    [DefaultFrameType.MOBILE]: DefaultMobileFrame,
} as const;

export const createDefaultFrame = (
    {
        canvasId,
        branchId,
        url,
        type = DefaultFrameType.DESKTOP,
        overrides,
    }: {
        canvasId: string;
        branchId: string;
        url: string;
        type?: DefaultFrameType;
        overrides?: Partial<DbFrame>
    },
): DbFrame => {
    const defaultFrame = DefaultFrame[type];
    return {
        id: uuidv4(),
        canvasId,
        branchId,
        url,
        x: defaultFrame.x,
        y: defaultFrame.y,
        width: defaultFrame.width,
        height: defaultFrame.height,
        ...overrides,

        // deprecated
        type: null,
    };
};
