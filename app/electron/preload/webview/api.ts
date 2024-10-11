import { contextBridge } from 'electron';
import { processDom } from './dom';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { copyElementBySelector } from './elements/copy';
import { isElementInserted } from './elements/helpers';
import { getInsertLocation } from './elements/insert';
import { getElementIndex } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import { getRemoveActionFromSelector } from './elements/remove';
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
        copyElementBySelector: copyElementBySelector,

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
