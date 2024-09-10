import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../dom';
import { assignUniqueId } from '../elements/helpers';
import { EditorAttributes, WebviewChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { LayerNode } from '/common/models/element/layers';

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
                    if (shouldIgnoreMutatedNode(node as HTMLElement)) {
                        continue;
                    }
                    assignUniqueId(node as HTMLElement);
                    const layerNode = buildLayerTree(parent as HTMLElement);
                    if (layerNode) {
                        added.set(parentSelector, layerNode);
                    }
                }

                for (const node of mutation.removedNodes) {
                    if (shouldIgnoreMutatedNode(node as HTMLElement)) {
                        continue;
                    }
                    assignUniqueId(node as HTMLElement);
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

    if (node.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX) !== null) {
        return true;
    }

    return false;
}
