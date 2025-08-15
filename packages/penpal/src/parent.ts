import type { LayerNode } from '@onlook/models';

export type PenpalParentMethods = {
    getFrameId: () => string;
    onWindowMutated: (data: {
        added: Record<string, LayerNode>;
        removed: Record<string, LayerNode>;
    }) => void;
    onWindowResized: () => void;
    onDomProcessed: (data: { layerMap: Record<string, LayerNode>; rootNode: LayerNode }) => void;
    onFrameWheel: (data: {
        deltaY: number;
        clientX: number;
        clientY: number;
        ctrlKey: boolean;
        metaKey: boolean;
    }) => void;
};

// Parent methods should be treated as promises
export type PromisifiedPenpalParentMethods = {
    [K in keyof PenpalParentMethods]: (
        ...args: Parameters<PenpalParentMethods[K]>
    ) => Promise<ReturnType<PenpalParentMethods[K]>>;
};

export const PENPAL_PARENT_CHANNEL = 'PENPAL_PARENT';
