import { ipcRenderer } from 'electron';
import { CssStyleChange } from '../changes';
import { processDom } from '../dom';
import { insertElement, removeElement, removeInsertedElements } from '../elements/insert';
import { clearMovedElements, moveElement } from '../elements/move';
import { editTextBySelector } from '../elements/text';
import { listenForDomMutation } from './dom';
import {
    publishEditText,
    publishInsertElement,
    publishMoveElement,
    publishRemoveElement,
} from './publish';
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
        const domEl = insertElement(element, location, styles);
        if (domEl) {
            publishInsertElement(location, domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.REMOVE_ELEMENT, (_, data) => {
        const { location } = data as { location: ActionElementLocation };
        removeElement(location);
        publishRemoveElement(location);
    });

    ipcRenderer.on(WebviewChannels.MOVE_ELEMENT, (_, data) => {
        const { selector, newIndex } = data as {
            selector: string;
            newIndex: number;
        };
        const domEl = moveElement(selector, newIndex);
        if (domEl) {
            publishMoveElement(domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.EDIT_ELEMENT_TEXT, (_, data) => {
        const { selector, content } = data as {
            selector: string;
            content: string;
        };
        const domEl = editTextBySelector(selector, content);
        if (domEl) {
            publishEditText(domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE, () => {
        change.clearStyleSheet();
        removeInsertedElements();
        clearMovedElements();
        setTimeout(processDom, 500);
    });
}
