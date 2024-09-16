import { contextBridge } from 'electron';
import { processDom } from './dom';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { isElementInserted } from './elements/helpers';
import { getInsertedElements, getInsertLocation } from './elements/insert';
import { getMovedElements } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import { getRemoveActionFromSelector } from './elements/remove';
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
        isElementInserted: isElementInserted,

        // Insert
        getInsertLocation: getInsertLocation,
        getInsertedElements: getInsertedElements,
        getRemoveActionFromSelector: getRemoveActionFromSelector,

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
