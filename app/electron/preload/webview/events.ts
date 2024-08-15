import { ipcRenderer } from 'electron';
import { CssStyleChange } from './changes';
import { insertElement } from './elements/insert';
import { ElementLocation, ElementObject } from '/common/actions';
import { WebviewChannels } from '/common/constants';

export function listenForEvents() {
    listenForWindowEvents();
    listenForEditEvents();
    listenForDomMutation();
}

function listenForWindowEvents() {
    window.addEventListener('resize', () => {
        ipcRenderer.sendToHost(WebviewChannels.WINDOW_RESIZE);
    });
}

function listenForDomMutation() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (
                mutation.type === 'childList' &&
                (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
            ) {
                ipcRenderer.sendToHost(WebviewChannels.WINDOW_MUTATE);
                return;
            }
        }
    });
    observer.observe(targetNode, config);
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
            element: ElementObject;
            location: ElementLocation;
            styles: Record<string, string>;
        };
        insertElement(element, location, styles);
    });

    ipcRenderer.on(WebviewChannels.CLEAR_STYLE_SHEET, () => {
        change.clearStyleSheet();
    });
}
