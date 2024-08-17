import { ipcRenderer } from 'electron';
import { CssStyleChange } from './changes';
import { insertElement, removeElement } from './elements/insert';
import { ActionElement, ActionElementLocation } from '/common/actions';
import { WebviewChannels } from '/common/constants';

export function listenForEvents() {
    listenForWindowEvents();
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
        if (insertedElement) {
            ipcRenderer.sendToHost(WebviewChannels.ELEMENT_INSERTED, insertedElement);
        }
    });

    ipcRenderer.on(WebviewChannels.REMOVE_ELEMENT, (_, data) => {
        const { location } = data as { location: ActionElementLocation };
        const removedElement = removeElement(location);
        if (removedElement) {
            ipcRenderer.sendToHost(WebviewChannels.ELEMENT_REMOVED);
        }
    });

    ipcRenderer.on(WebviewChannels.CLEAR_STYLE_SHEET, () => {
        change.clearStyleSheet();
    });
}
