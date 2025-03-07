import { contextBridge } from 'electron';
import { processDom } from './dom';
import {
    getChildrenCount,
    getDomElementByDomId,
    getElementAtLoc,
    getOffsetParent,
    getParentElement,
    updateElementInstance,
} from './elements';
import {
    getActionElementByDomId,
    getActionLocation,
    getElementType,
    getFirstOnlookElement,
    setElementType,
} from './elements/dom/helpers';
import { getInsertLocation } from './elements/dom/insert';
import { getRemoveActionFromDomId } from './elements/dom/remove';
import { getElementIndex } from './elements/move';
import { drag, endAllDrag, endDrag, startDrag } from './elements/move/drag';
import { copyElementWithStyles, getComputedStyleByDomId } from './elements/style';
import { editText, startEditingText, stopEditingText } from './elements/text';
import { setWebviewId } from './state';
import { getTheme, setTheme } from './theme';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        // Misc
        processDom,
        getComputedStyleByDomId,
        copyElementWithStyles,
        updateElementInstance,
        setWebviewId,
        getFirstOnlookElement,

        // Elements
        getElementAtLoc,
        getDomElementByDomId,
        setElementType,
        getElementType,
        getParentElement,
        getChildrenCount,
        getOffsetParent,

        // Actions
        getActionLocation,
        getActionElementByDomId,
        getInsertLocation,
        getRemoveActionFromDomId,

        // Theme
        getTheme,
        setTheme,

        // Drag
        startDrag,
        drag,
        endDrag,
        getElementIndex,
        endAllDrag,

        // Edit text
        startEditingText,
        editText,
        stopEditingText,
    });
}
