import type { ActionElement, ActionLocation, CoreElementType, DomElement, DynamicType, RemoveElementAction, SystemTheme } from '@onlook/models';

export type PreloadMethods = {
    processDom: () => void;
    setFrameId: (id: string) => void;
    getElementAtLoc: (x: number, y: number, getStyle: boolean) => DomElement;
    getElementByDomId: (domId: string, getStyle: boolean) => DomElement;
    getElementIndex: (domId: string) => number;
    getComputedStyleByDomId: (domId: string) => Record<string, string>;
    updateElementInstance: (domId: string, instanceId: string, component: string) => void;
    getFirstOnlookElement: () => DomElement | null;
    setElementType: (domId: string, dynamicType: string, coreElementType: string) => void;
    getElementType: (domId: string) => {
        dynamicType: DynamicType | null;
        coreType: CoreElementType | null;
    };
    getParentElement: (domId: string) => DomElement | null;
    getChildrenCount: (domId: string) => number;
    getOffsetParent: (domId: string) => DomElement | null;
    getActionLocation: (domId: string) => ActionLocation | null;
    getActionElement: (domId: string) => ActionElement | null;
    getInsertLocation: (x: number, y: number) => ActionLocation | null;
    getRemoveAction: (domId: string, frameId: string) => RemoveElementAction | null;
    getTheme: () => SystemTheme;
    setTheme: (theme: SystemTheme) => void;
};
