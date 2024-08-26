import { contextBridge } from 'electron';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { getInsertedElements, getInsertLocation } from './elements/insert';
import { drag, endDrag, startDrag } from './elements/move';

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
