import { contextBridge } from 'electron';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { drag, endDrag, startDrag } from './elements/drag';
import { getInsertedElements, getInsertLocation } from './elements/insert';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
        getInsertLocation: getInsertLocation,
        getInsertedElements: getInsertedElements,
        startDrag: startDrag,
        drag: drag,
        endDrag: endDrag,
    });
}
