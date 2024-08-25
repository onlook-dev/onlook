import { ipcRenderer } from 'electron';
import { CssStyleChange } from './changes';
import { insertElement, removeElement } from './elements/insert';
import { ActionElement, ActionElementLocation } from '/common/actions';
import { WebviewChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';

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

function listenForDomMutation() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const observer = new MutationObserver((mutationsList, observer) => {
        const added = new Set<string>();
        const removed = new Set<string>();

        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const parent = mutation.target as HTMLElement;
                const parentSelector = getUniqueSelector(parent, targetNode);
                for (const node of mutation.addedNodes) {
                    added.add(parentSelector);
                }

                for (const node of mutation.removedNodes) {
                    removed.add(parentSelector);
                }
            }
        }

        if (added.size > 0 || removed.size > 0) {
            ipcRenderer.sendToHost(WebviewChannels.WINDOW_MUTATED, {
                added: Array.from(added),
                removed: Array.from(removed),
            });
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
