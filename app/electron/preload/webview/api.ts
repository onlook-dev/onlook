import { contextBridge } from 'electron';
import { processDom } from './dom';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { getLocationFromSelector, isElementInserted } from './elements/helpers';
import {
    getInsertedElementFromSelector,
    getInsertedElements,
    getInsertLocation,
} from './elements/insert';
import { getMovedElements } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import {
    editText,
    getTextEditedElements,
    startEditingText,
    stopEditingText,
} from './elements/text';
import { getRemoveActionFromSelector } from './elements/remove';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
        processDom: processDom,
        isElementInserted: isElementInserted,

        // Insert
        getInsertLocation: getInsertLocation,
        getInsertedElements: getInsertedElements,
        getLocationFromSelector: getLocationFromSelector,
        getInsertedElementFromSelector: getInsertedElementFromSelector,
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
