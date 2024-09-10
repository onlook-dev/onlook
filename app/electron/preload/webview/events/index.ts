import { ipcRenderer } from 'electron';
import { CssStyleChange } from '../changes';
import { insertElement, removeElement, removeInsertedElements } from '../elements/insert';
import { clearMovedElements, moveElement } from '../elements/move';
import { listenForDomMutation } from './dom';
import { ActionElement, ActionElementLocation } from '/common/actions';
import { WebviewChannels } from '/common/constants';

export function listenForEvents() {
    listenForWindowEvents();
    listenForDomMutation();
    listenForEditEvents();
}

function listenForWindowEvents() {
    window.addEventListener('resize', () => {
        ipcRenderer.sendToHost(WebviewChannels.WINDOW_RESIZED);
    });
}

function listenForEditEvents() {
    const change = new CssStyleChange();

    ipcRenderer.on(WebviewChannels.UPDATE_STYLE, (_, data) => {
        const { selector, style, value } = data;
        change.updateStyle(selector, style, value);
        ipcRenderer.sendToHost(WebviewChannels.STYLE_UPDATED, selector);
    });

    ipcRenderer.on(WebviewChannels.INSERT_ELEMENT, (_, data) => {
        const { element, location, styles } = data as {
            element: ActionElement;
            location: ActionElementLocation;
            styles: Record<string, string>;
        };
        const insertedElement = insertElement(element, location, styles);
        // TODO: Build parent layer node
        if (insertedElement) {
            ipcRenderer.sendToHost(WebviewChannels.ELEMENT_INSERTED, insertedElement);
        }
    });

    ipcRenderer.on(WebviewChannels.REMOVE_ELEMENT, (_, data) => {
        const { location } = data as { location: ActionElementLocation };
        const removedElement = removeElement(location);
        // TODO: Build parent layer node
        if (removedElement) {
            ipcRenderer.sendToHost(WebviewChannels.ELEMENT_REMOVED, removedElement);
        }
    });

    ipcRenderer.on(WebviewChannels.MOVE_ELEMENT, (_, data) => {
        const { selector, originalIndex, newIndex } = data as {
            selector: string;
            originalIndex: number;
            newIndex: number;
        };
        const movedElement = moveElement(selector, newIndex);
        if (movedElement) {
            ipcRenderer.sendToHost(WebviewChannels.ELEMENT_MOVED, movedElement);
        }
    });

    ipcRenderer.on(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE, () => {
        change.clearStyleSheet();
        removeInsertedElements();
        clearMovedElements();
    });
}
