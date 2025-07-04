import { buildLayerTree, processDom, type ProcessDomResult } from './dom';
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

function withTryCatch<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
        try {
            return fn(...args);
        } catch (error) {
            console.error(`Error in ${fn.name}:`, error);
            return null;
        }
    }) as T;
}

const rawMethods = {
    // Misc
    processDom,
    setFrameId,
    getComputedStyleByDomId,
    updateElementInstance,
    getFirstOnlookElement,
    captureScreenshot,
    buildLayerTree,

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

// Wrap all methods in a try/catch to prevent the preload script from crashing
export const preloadMethods = Object.fromEntries(
    Object.entries(rawMethods).map(([key, fn]) => [key, withTryCatch(fn)])
) as typeof rawMethods;

export type PenpalChildMethods = typeof preloadMethods;
export type { ProcessDomResult };
