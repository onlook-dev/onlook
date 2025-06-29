import type { LayerNode } from '@onlook/models';

import type { DomElement } from '@onlook/models';

export enum FrameViewEvents {
    UPDATE_STYLE = 'update-style',
    INSERT_ELEMENT = 'insert-element',
    REMOVE_ELEMENT = 'remove-element',
    MOVE_ELEMENT = 'move-element',
    EDIT_ELEMENT_TEXT = 'edit-element-text',
    CLEAN_AFTER_WRITE_TO_CODE = 'clean-after-write',
    GROUP_ELEMENTS = 'group-elements',
    UNGROUP_ELEMENTS = 'ungroup-elements',
    INSERT_IMAGE = 'insert-image',
    REMOVE_IMAGE = 'remove-image',
    DOM_PROCESSED = 'dom-processed',
    WINDOW_MUTATED = 'window-mutated',
    // WINDOW_RESIZED = 'window-resized',
}

export interface FrameViewEventHandler {
    [FrameViewEvents.DOM_PROCESSED]: {
        frameId: string;
        layerMap: Record<string, LayerNode>;
        rootNode: LayerNode;
    };
    [FrameViewEvents.UPDATE_STYLE]: { domEl: DomElement };
    [FrameViewEvents.MOVE_ELEMENT]: { domEl: DomElement; layerMap: Map<string, LayerNode> };
    [FrameViewEvents.EDIT_ELEMENT_TEXT]: { domEl: DomElement; layerMap: Map<string, LayerNode> };
    [FrameViewEvents.GROUP_ELEMENTS]: { domEl: DomElement; layerMap: Map<string, LayerNode> };
    [FrameViewEvents.UNGROUP_ELEMENTS]: { parentEl: DomElement; layerMap: Map<string, LayerNode> };
    [FrameViewEvents.INSERT_ELEMENT]: {
        domEl: DomElement;
        layerMap: Map<string, LayerNode>;
        editText: boolean;
    };
    [FrameViewEvents.REMOVE_ELEMENT]: { parentDomEl: DomElement; layerMap: Map<string, LayerNode> };
    [FrameViewEvents.WINDOW_MUTATED]: {
        frameId: string;
        added: Record<string, LayerNode>;
        removed: Record<string, LayerNode>;
    };
}

export type FrameViewEventPayload = {
    [K in keyof FrameViewEventHandler]: {
        action: K;
        args: FrameViewEventHandler[K];
    };
}[keyof FrameViewEventHandler];
