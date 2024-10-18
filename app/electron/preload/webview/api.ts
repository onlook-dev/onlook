import { contextBridge } from 'electron';
import { processDom } from './dom';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { getActionElementBySelector, getActionElementLocation } from './elements/dom/helpers';
import { getInsertLocation } from './elements/dom/insert';
import { getRemoveActionFromSelector } from './elements/dom/remove';
import { isElementInserted } from './elements/helpers';
import { getElementIndex } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import { getComputedStyleBySelector } from './elements/style';
import { editText, startEditingText, stopEditingText } from './elements/text';
import { getTheme, toggleTheme } from './theme';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
        processDom: processDom,
        isElementInserted: isElementInserted,
        getComputedStyleBySelector: getComputedStyleBySelector,
        getActionElementLocation: getActionElementLocation,
        getActionElementBySelector: getActionElementBySelector,

        // Theme
        getTheme: getTheme,
        toggleTheme: toggleTheme,

        // Insert
        getInsertLocation: getInsertLocation,
        getRemoveActionFromSelector: getRemoveActionFromSelector,

        // Drag
        startDrag: startDrag,
        drag: drag,
        endDrag: endDrag,
        getElementIndex: getElementIndex,

        // Edit text
        startEditingText: startEditingText,
        editText: editText,
        stopEditingText: stopEditingText,
    });
}
