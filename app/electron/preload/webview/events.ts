import { ipcRenderer } from 'electron';
import { CssStyleChange } from './changes';
import { buildLayerTree } from './dom';
import { assignUniqueId } from './elements/helpers';
import { insertElement, removeElement, removeInsertedElements } from './elements/insert';
import { clearMovedElements, moveElement } from './elements/move';
import { ActionElement, ActionElementLocation } from '/common/actions';
import { EditorAttributes, WebviewChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { LayerNode } from '/common/models/element/layers';

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
        const addedLayerNodes: LayerNode[] = [];
        const removedSelectors: string[] = [];

        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (shouldIgnoreMutatedNode(node as HTMLElement)) {
                        continue;
                    }
                    assignUniqueId(node as HTMLElement);
                    const layerNode = buildLayerTree(node as HTMLElement);
                    if (layerNode) {
                        addedLayerNodes.push(layerNode);
                    }
                }

                for (const node of mutation.removedNodes) {
                    if (shouldIgnoreMutatedNode(node as HTMLElement)) {
                        continue;
                    }
                    assignUniqueId(node as HTMLElement);
                    removedSelectors.push(getUniqueSelector(node as HTMLElement));
                }
            }
        }

        if (addedLayerNodes.length > 0 || removedSelectors.length > 0) {
            ipcRenderer.sendToHost(WebviewChannels.WINDOW_MUTATED, {
                addedLayerNodes,
                removedSelectors,
            });
        }
    });

    observer.observe(targetNode, config);
}

function shouldIgnoreMutatedNode(node: HTMLElement): boolean {
    if (node.id === EditorAttributes.ONLOOK_STUB_ID) {
        return true;
    }

    if (node.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX) !== null) {
        return true;
    }

    return false;
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
