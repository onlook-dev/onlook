import { processDom } from './dom';
import {
    getChildrenCount,
    getElementAtLoc,
    getElementByDomId,
    getOffsetParent,
    getParentElement,
    updateElementInstance
} from './elements';
import { groupElements, ungroupElements } from './elements/dom/group';
import {
    getActionElement,
    getActionLocation,
    getElementType,
    getFirstOnlookElement,
    setElementType,
} from './elements/dom/helpers';
import { insertImage, removeImage } from './elements/dom/image';
import { getInsertLocation, insertElement, removeElement } from './elements/dom/insert';
import { getRemoveAction } from './elements/dom/remove';
import { getElementIndex, moveElement } from './elements/move';
import { drag, endAllDrag, endDrag, startDrag } from './elements/move/drag';
import { getComputedStyleByDomId } from './elements/style';
import { editText, startEditingText, stopEditingText } from './elements/text';
import { setFrameId } from './state';
import { updateStyle } from './style';
import { getTheme, setTheme } from './theme';

export const preloadMethods = {
    // Misc
    processDom,
    setFrameId,
    getComputedStyleByDomId,
    updateElementInstance,
    getFirstOnlookElement,

    // Elements
    getElementAtLoc,
    getElementByDomId,
    getElementIndex,
    setElementType,
    getElementType,
    getParentElement,
    getChildrenCount,
    getOffsetParent,

    // Actions
    getActionLocation,
    getActionElement,
    getInsertLocation,
    getRemoveAction,

    // Theme
    getTheme,
    setTheme,

    // Drag
    startDrag,
    drag,
    endDrag,
    endAllDrag,

    // Edit text
    startEditingText,
    editText,
    stopEditingText,

    // Edit elements
    updateStyle,
    insertElement,
    removeElement,
    moveElement,
    groupElements,
    ungroupElements,
    insertImage,
    removeImage,
}

export type PreloadMethods = typeof preloadMethods;
