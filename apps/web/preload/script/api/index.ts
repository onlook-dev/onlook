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
import { drag, dragAbsolute, endAllDrag, endDrag, endDragAbsolute, startDrag } from './elements/move/drag';
import { getComputedStyleByDomId } from './elements/style';
import { editText, isChildTextEditable, startEditingText, stopEditingText } from './elements/text';
import { handleBodyReady } from './ready';
import { captureScreenshot } from './screenshot';
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
    captureScreenshot,

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
    dragAbsolute,
    endDrag,
    endDragAbsolute,
    endAllDrag,

    // Edit text
    startEditingText,
    editText,
    stopEditingText,
    isChildTextEditable,

    // Edit elements
    updateStyle,
    insertElement,
    removeElement,
    moveElement,
    groupElements,
    ungroupElements,
    insertImage,
    removeImage,
    handleBodyReady,
}

export type PenpalChildMethods = typeof preloadMethods;
