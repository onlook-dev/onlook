import { EditorAttributes, WebviewChannels } from '@onlook/models/constants';
import type { LayerNode } from '@onlook/models/element';
import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../dom';
import { removeDuplicateInsertedElement } from '../elements/dom/insert';

export function listenForDomMutation() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const observer = new MutationObserver((mutationsList, observer) => {
        let added = new Map<string, LayerNode>();
        let removed = new Map<string, LayerNode>();

        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const parent = mutation.target as HTMLElement;

                for (const node of mutation.addedNodes) {
                    if (
                        node.nodeType === Node.TEXT_NODE ||
                        shouldIgnoreMutatedNode(node as HTMLElement)
                    ) {
                        continue;
                    }
                    const element = node as HTMLElement;
                    deduplicateInsertedElement(element);
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

    if (node.getAttribute(EditorAttributes.DATA_ONLOOK_INSERTED)) {
        return true;
    }

    return false;
}

function deduplicateInsertedElement(insertedEl: HTMLElement) {
    // If the element has a temp id, it means it was inserted by the editor in code.
    // In this case, we remove the existing DOM version and use the temp ID as the unique ID
    const oid = insertedEl.getAttribute(EditorAttributes.DATA_ONLOOK_ID);
    if (oid) {
        removeDuplicateInsertedElement(oid);
        // TODO: Emit a dedup event
    }
}
