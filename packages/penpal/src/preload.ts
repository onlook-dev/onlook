import type { DomElement } from '@onlook/models';

export type PreloadMethods = {
    processDom: () => void;
    setFrameId: (id: string) => void;
    getElementAtLoc: (x: number, y: number, getStyle: boolean) => DomElement;
    getDomElementByDomId: (domId: string, style: boolean) => DomElement;
};
