import { EditorAttributes } from '@onlook/constants';
import { penpalParent } from '../..';
import { buildLayerTree } from '../dom';

export function listenForDomMutation() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const observer = new MutationObserver((mutationsList) => {
        let added = new Map();
        let removed = new Map();

        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const parent = mutation.target as HTMLElement;
                // Handle added nodes
                mutation.addedNodes.forEach((node) => {
                    const el = node as HTMLElement;
                    if (
                        node.nodeType === Node.ELEMENT_NODE &&
                        el.hasAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) &&
                        !shouldIgnoreMutatedNode(el)
                    ) {
                        dedupNewElement(el);
                        if (parent) {
                            const layerMap = buildLayerTree(parent);
                            if (layerMap) {
                                added = new Map([...added, ...layerMap]);
                            }
                        }
                    }
                });

                // Handle removed nodes
                mutation.removedNodes.forEach((node) => {
                    const el = node as HTMLElement;
                    if (
                        node.nodeType === Node.ELEMENT_NODE &&
                        el.hasAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) &&
                        !shouldIgnoreMutatedNode(el)
                    ) {
                        if (parent) {
                            const layerMap = buildLayerTree(parent);
                            if (layerMap) {
                                removed = new Map([...removed, ...layerMap]);
                            }
                        }
                    }
                });
            }
        }

        if (added.size > 0 || removed.size > 0) {
            if (penpalParent) {
                penpalParent.onWindowMutated({
                    added: Object.fromEntries(added),
                    removed: Object.fromEntries(removed)
                }).catch((error: Error) => {
                    console.error('Failed to send window mutation event:', error);
                });
            }
        }
    });

    observer.observe(targetNode, config);
}

export function listenForResize() {
    function notifyResize() {
        if (penpalParent) {
            penpalParent.onWindowResized().catch((error: Error) => {
                console.error('Failed to send window resize event:', error);
            });
        }
    }

    window.addEventListener('resize', notifyResize);
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

function dedupNewElement(newEl: HTMLElement) {
    // If the element has an oid and there's an inserted element with the same oid,
    // replace the existing element with the new one and restore the attributes
    const oid = newEl.getAttribute(EditorAttributes.DATA_ONLOOK_ID);
    if (!oid) {
        return;
    }
    document
        .querySelectorAll(
            `[${EditorAttributes.DATA_ONLOOK_ID}="${oid}"][${EditorAttributes.DATA_ONLOOK_INSERTED}]`,
        )
        .forEach((targetEl) => {
            const ATTRIBUTES_TO_REPLACE = [
                EditorAttributes.DATA_ONLOOK_DOM_ID,
                EditorAttributes.DATA_ONLOOK_DRAG_SAVED_STYLE,
                EditorAttributes.DATA_ONLOOK_EDITING_TEXT,
                EditorAttributes.DATA_ONLOOK_INSTANCE_ID,
            ];

            ATTRIBUTES_TO_REPLACE.forEach((attr) => {
                const targetAttr = targetEl.getAttribute(attr);
                if (targetAttr) {
                    newEl.setAttribute(attr, targetAttr);
                }
            });
            targetEl.remove();
        });
}