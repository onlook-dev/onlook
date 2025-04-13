// import { processDom } from './dom';
// import {
//     getChildrenCount,
//     getDomElementByDomId,
//     getOffsetParent,
//     getParentElement,
//     updateElementInstance,
// } from './elements';
import {
    getElementAtLoc,
} from './elements';
// import {
//     getActionElementByDomId,
//     getActionLocation,
//     getElementType,
//     getFirstOnlookElement,
//     setElementType,
// } from './elements/dom/helpers';
// import { getInsertLocation } from './elements/dom/insert';
// import { getRemoveActionFromDomId } from './elements/dom/remove';
// import { getElementIndex } from './elements/move';
// import { drag, endAllDrag, endDrag, startDrag } from './elements/move/drag';
// import { getComputedStyleByDomId } from './elements/style';
// import { editText, startEditingText, stopEditingText } from './elements/text';
// import { setWebviewId } from './state';
// import { getTheme, setTheme } from './theme';

export function getMethods() {
    return {
        // Misc
        // processDom,
        // getComputedStyleByDomId,
        // updateElementInstance,
        // setWebviewId,
        // getFirstOnlookElement,

        // // Elements
        getElementAtLoc,
        // getDomElementByDomId,
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
        // getElementIndex,
        // endAllDrag,

        // // Edit text
        // startEditingText,
        // editText,
        // stopEditingText,
    };
}
