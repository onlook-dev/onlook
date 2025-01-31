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
import { drag, endAllDrag, endDrag, startDrag } from './elements/move/drag';
import { getComputedStyleByDomId } from './elements/style';
import { editText, startEditingText, stopEditingText } from './elements/text';
import { setWebviewId } from './state';
import { getTheme, setTheme } from './theme';

const onlookApi = {
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
};

export type TOnlookWindow = typeof window & {
    _onlookWebviewId: string;
    onlook: {
        api: typeof onlookApi;
        bridge: {
            send: (channel: string, data?: any, transfer?: Transferable[]) => void;
            receive: (handler: (event: MessageEvent, data?: any) => void) => void;
        };
    };
};

export function setApi() {
    (window as TOnlookWindow).onlook = {
        api: onlookApi,
        bridge: {
            send: (channel: string, data?: any, transfer?: Transferable[]) => {
                window.parent.postMessage({ type: channel, data }, '*', transfer);
            },
            receive: (handler: (event: MessageEvent, data?: any) => void) => {
                window.addEventListener('message', (event) => {
                    handler(event, event.data);
                });
            },
        },
    };
}
