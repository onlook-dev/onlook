import { contextBridge } from 'electron';
import { processDom } from './dom';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { getInsertedElements, getInsertLocation } from './elements/insert';
import { getMovedElements } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import {
    editText,
    getTextEditedElements,
    startEditingText,
    stopEditingText,
} from './elements/text';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
        processDom: processDom,

        // Insert
        getInsertLocation: getInsertLocation,
        getInsertedElements: getInsertedElements,

        // Drag
        startDrag: startDrag,
        drag: drag,
        endDrag: endDrag,
        getMovedElements: getMovedElements,

        // Edit text
        startEditingText: startEditingText,
        editText: editText,
        stopEditingText: stopEditingText,
        getTextEditedElements: getTextEditedElements,
    });
}
