import { contextBridge } from 'electron';
import { processDom } from './dom';
import { getDomElementByDomId, getElementAtLoc, updateElementInstance } from './elements';
import { elementFromDomId } from '/common/helpers';
import { getDomElement } from './elements/helpers';
import {
    getActionElementByDomId,
    getActionLocation,
    setDynamicElementType,
    getDynamicElementType,
} from './elements/dom/helpers';
import { getInsertLocation } from './elements/dom/insert';
import { getRemoveActionFromDomId } from './elements/dom/remove';
import { getElementIndex } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import { getComputedStyleByDomId } from './elements/style';
import { editText, startEditingText, stopEditingText } from './elements/text';
import { setWebviewId } from './state';
import { getTheme, toggleTheme } from './theme';
import { getDisplayDirection } from './elements/move/helpers';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        // Misc
        processDom,
        getComputedStyleByDomId,
        updateElementInstance,
        setWebviewId,

        // Elements
        getElementAtLoc,
        getDomElementByDomId,
        setDynamicElementType,
        getDynamicElementType,

        // Actions
        getActionLocation,
        getActionElementByDomId,
        getInsertLocation,
        getRemoveActionFromDomId,

        // Theme
        getTheme,
        toggleTheme,

        // Drag
        startDrag,
        drag,
        endDrag,
        getElementIndex,
        getParentElement: (domId: string) => {
            const el = elementFromDomId(domId);
            if (!el?.parentElement) {
                return null;
            }
            return getDomElement(el.parentElement, false);
        },
        getDisplayDirection,

        // Edit text
        startEditingText,
        editText,
        stopEditingText,
    });
}
