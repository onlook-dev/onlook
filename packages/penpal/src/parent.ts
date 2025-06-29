import { type FrameViewEventPayload } from '@onlook/constants';

export type PenpalParentMethods = {
    getFrameId: () => string;
    handleFrameViewEvent: (event: FrameViewEventPayload) => void;
};

// Parent methods should be treated as promises
export type PromisifiedPenpalParentMethods = {
    [K in keyof PenpalParentMethods]: (
        ...args: Parameters<PenpalParentMethods[K]>
    ) => Promise<ReturnType<PenpalParentMethods[K]>>;
};

export const PENPAL_PARENT_CHANNEL = 'PENPAL_PARENT';
