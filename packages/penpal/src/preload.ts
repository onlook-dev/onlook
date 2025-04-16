import type { DomElement } from '@onlook/models';

export type PreloadMethods = {
    processDom: () => void;
    setFrameId: (id: string) => void;
    getElementAtLoc: (x: number, y: number, getStyle: boolean) => DomElement;
    getElementByDomId: (domId: string, getStyle: boolean) => DomElement;
    getElementIndex: (domId: string) => number;
};
