import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../dom';
import { removeDuplicateInsertedElement } from '../elements/dom/insert';
import { getOrAssignUuid } from '../elements/helpers';
import { EditorAttributes, WebviewChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import type { LayerNode } from '/common/models/element/layers';

export function listenForDomMutation() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const observer = new MutationObserver((mutationsList, observer) => {
        const added = new Map<string, LayerNode>();
        const removed = new Map<string, LayerNode>();

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
                    const layerNode = buildLayerTree(parent as HTMLElement);
                    if (layerNode) {
                        added.set(parentSelector, layerNode);
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
                    const layerNode = buildLayerTree(parent as HTMLElement);
                    if (layerNode) {
                        removed.set(parentSelector, layerNode);
                    }
                }
            }
        }

        if (added.size > 0 || removed.size > 0) {
            ipcRenderer.sendToHost(WebviewChannels.WINDOW_MUTATED, {
                added: Array.from(added.values()),
                removed: Array.from(removed.values()),
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
