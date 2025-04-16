import type { PreloadMethods } from '@onlook/penpal';
import { processDom } from './dom';
import { getElementAtLoc, getElementByDomId } from './elements';
import { getElementIndex } from './elements/move';
import { setFrameId } from './state';

// import {
//     getActionElementByDomId,
//     getActionLocation,
//     getElementType,
//     getFirstOnlookElement,
//     setElementType,
// } from './elements/dom/helpers';
// import { getInsertLocation } from './elements/dom/insert';
// import { getRemoveActionFromDomId } from './elements/dom/remove';
// import { drag, endAllDrag, endDrag, startDrag } from './elements/move/drag';
// import { getComputedStyleByDomId } from './elements/style';
// import { editText, startEditingText, stopEditingText } from './elements/text';
// import {
//     getChildrenCount,
//     getElementByDomId,
//     getOffsetParent,
//     getParentElement,
//     updateElementInstance,
// } from './elements';
// import { getTheme, setTheme } from './theme';

export const preloadMethods: PreloadMethods = {
    // Misc
    processDom,
    setFrameId,
    // getComputedStyleByDomId,
    // updateElementInstance,
    // getFirstOnlookElement,

    // Elements
    getElementAtLoc,
    getElementByDomId,
    getElementIndex,

    // setElementType,
    // getElementType,
    // getParentElement,
    // getChildrenCount,
    // getOffsetParent,

    // // Actions
    // getActionLocation,
    // getActionElementByDomId,
    // getInsertLocation,
    // getRemoveActionFromDomId,

    // // Theme
    // getTheme,
    // setTheme,

    // // Drag
    // startDrag,
    // drag,
    // endDrag,
    // endAllDrag,

    // // Edit text
    // startEditingText,
    // editText,
    // stopEditingText,
} satisfies PreloadMethods;
