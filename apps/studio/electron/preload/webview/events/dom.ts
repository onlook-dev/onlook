import { EditorAttributes, WebviewChannels } from '@onlook/models/constants';
import type { LayerNode } from '@onlook/models/element';
import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../dom';
import { removeDuplicateInsertedElement } from '../elements/dom/insert';
import { getOrAssignUuid } from '../elements/helpers';
import { getUniqueSelector } from '/common/helpers';

export function listenForDomMutation() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const observer = new MutationObserver((mutationsList, observer) => {
        let added = new Map<string, LayerNode>();
        let removed = new Map<string, LayerNode>();

        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const parent = mutation.target as HTMLElement;
                const parentSelector = getUniqueSelector(parent, targetNode);

                for (const node of mutation.addedNodes) {
                    if (
                        node.nodeType === Node.TEXT_NODE ||
                        shouldIgnoreMutatedNode(node as HTMLElement)
                    ) {
                        continue;
                    }
                    const element = node as HTMLElement;
                    deduplicateInsertedElement(element);
                    getOrAssignUuid(element);
                    const layerMap = buildLayerTree(parent as HTMLElement);
                    if (layerMap) {
                        added = new Map([...added, ...layerMap]);
                    }
                }

                for (const node of mutation.removedNodes) {
                    if (
                        node.nodeType === Node.TEXT_NODE ||
                        shouldIgnoreMutatedNode(node as HTMLElement)
                    ) {
                        continue;
                    }
                    getOrAssignUuid(node as HTMLElement);
                    const layerMap = buildLayerTree(parent as HTMLElement);
                    if (layerMap) {
                        removed = new Map([...removed, ...layerMap]);
                    }
                }
            }
        }

        if (added.size > 0 || removed.size > 0) {
            ipcRenderer.sendToHost(WebviewChannels.WINDOW_MUTATED, {
                added: Object.fromEntries(added),
                removed: Object.fromEntries(removed),
            });
        }
    });

    observer.observe(targetNode, config);
}

function shouldIgnoreMutatedNode(node: HTMLElement): boolean {
    if (node.id === EditorAttributes.ONLOOK_STUB_ID) {
        return true;
    }

    return false;
}

function deduplicateInsertedElement(element: HTMLElement) {
    // If the element has a temp id, it means it was inserted by the editor in code.
    // In this case, we remove the existing DOM version and use the temp ID as the unique ID
    const tempId = element.getAttribute(EditorAttributes.DATA_ONLOOK_TEMP_ID);
    if (tempId) {
        removeDuplicateInsertedElement(tempId);
        element.setAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID, tempId);
        element.removeAttribute(EditorAttributes.DATA_ONLOOK_TEMP_ID);
    }
}
