import { contextBridge, ipcRenderer } from 'electron';
import { processDom } from './dom';
import {
    getChildrenCount,
    getDomElementByDomId,
    getElementAtLoc,
    getParentElement,
    updateElementInstance,
} from './elements';
import {
    getActionElementByDomId,
    getActionLocation,
    getElementType,
    setElementType,
} from './elements/dom/helpers';
import { getInsertLocation } from './elements/dom/insert';
import { getRemoveActionFromDomId } from './elements/dom/remove';
import { getElementIndex } from './elements/move';
import { drag, endDrag, startDrag } from './elements/move/drag';
import { getComputedStyleByDomId } from './elements/style';
import { editText, startEditingText, stopEditingText } from './elements/text';
import { setWebviewId } from './state';
import { getTheme, setTheme, toggleTheme } from './theme';

export function setApi() {
    // Expose ipcRenderer.invoke for DevTools installation
    contextBridge.exposeInMainWorld('ipcRenderer', {
        invoke: (channel: string, ...args: any[]) => {
            if (channel === 'install-webview-devtools') {
                return ipcRenderer.invoke(channel, ...args);
            }
            return Promise.reject(new Error('Invalid IPC channel'));
        },
    });

    contextBridge.exposeInMainWorld('api', {
        // DevTools moved to renderer process
        // Misc
        processDom,
        getComputedStyleByDomId,
        updateElementInstance,
        setWebviewId,

        // Elements
        getElementAtLoc,
        getDomElementByDomId,
        setElementType,
        getElementType,
        getParentElement,
        getChildrenCount,

        // Actions
        getActionLocation,
        getActionElementByDomId,
        getInsertLocation,
        getRemoveActionFromDomId,

        // Theme
        getTheme,
        toggleTheme,
        setTheme,

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
