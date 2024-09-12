import { contextBridge } from 'electron';
import { processDom } from './dom';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { getInsertedElements, getInsertLocation } from './elements/insert';
import { getMovedElements } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import { startEditingText } from './elements/text';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
        getInsertLocation: getInsertLocation,
        getInsertedElements: getInsertedElements,
        startDrag: startDrag,
        drag: drag,
        endDrag: endDrag,
        getMovedElements: getMovedElements,
        processDom: processDom,
        startEditingText: startEditingText,
    });
}
