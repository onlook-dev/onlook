import { contextBridge } from 'electron';
import { processDom, saveWebviewId } from './dom';
import { getDomElementWithDomId, getElementAtLoc, updateElementInstance } from './elements';
import { getActionElementByDomId, getActionLocation } from './elements/dom/helpers';
import { getInsertLocation } from './elements/dom/insert';
import { getRemoveActionFromDomId } from './elements/dom/remove';
import { getElementIndex } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import { getComputedStyleByDomId } from './elements/style';
import { editText, startEditingText, stopEditingText } from './elements/text';
import { getTheme, toggleTheme } from './theme';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc,
        getDomElementWithDomId,
        processDom,
        getComputedStyleByDomId,
        getActionLocation,
        getActionElementByDomId,
        updateElementInstance,
        saveWebviewId,

        // Theme
        getTheme,
        toggleTheme,

        // Insert
        getInsertLocation,
        getRemoveActionFromDomId,

        // Drag
        startDrag,
        drag,
        endDrag,
        getElementIndex,

        // Edit text
        startEditingText,
        editText,
        stopEditingText,
    });
}
