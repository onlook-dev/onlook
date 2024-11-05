import { EditorAttributes, WebviewChannels } from '@onlook/models/constants';
import type { LayerNode } from '@onlook/models/element';
import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../dom';
import { removeDuplicateInsertedElement } from '../elements/dom/insert';
import { getOrAssignUuid } from '../elements/helpers';
import { getUniqueSelector } from '/common/helpers';

interface MutationData {
    added: LayerNode[];
    removed: LayerNode[];
    classChanges: ClassChangeInfo[];
}

interface ClassChangeInfo {
    selector: string;
    oldClasses: string[];
    newClasses: string[];
    uniqueId: string;
}

export function listenForDomMutation() {
    const targetNode = document.body;
    const config = {
        childList: true,
        subtree: true,
        attributes: false,
        attributeFilter: [],
    };

    const observer = new MutationObserver((mutationsList, observer) => {
        const added = new Map<string, LayerNode>();
        const removed = new Map<string, LayerNode>();

        for (const mutation of mutationsList) {
            const target = mutation.target as HTMLElement;
            const parentSelector = getUniqueSelector(target, targetNode);
            if (mutation.type === 'attributes') {
                // TODO: Handle attribute mutation w2c
            } else if (mutation.type === 'childList') {
                handleChildListMutation(mutation, target, parentSelector, added, removed);
            }
        }

        const hasChanges = added.size > 0 || removed.size > 0;

        if (hasChanges) {
            ipcRenderer.sendToHost(WebviewChannels.WINDOW_MUTATED, {
                added: Array.from(added.values()),
                removed: Array.from(removed.values()),
            } as MutationData);
        }
    });

    observer.observe(targetNode, config);
    return observer;
}

function handleChildListMutation(
    mutation: MutationRecord,
    parent: HTMLElement,
    parentSelector: string,
    added: Map<string, LayerNode>,
    removed: Map<string, LayerNode>,
) {
    for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE || shouldIgnoreMutatedNode(node as HTMLElement)) {
            continue;
        }
        const element = node as HTMLElement;
        deduplicateInsertedElement(element);
        getOrAssignUuid(element);
        const layerNode = buildLayerTree(parent);
        if (layerNode) {
            added.set(parentSelector, layerNode);
        }
    }

    for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.TEXT_NODE || shouldIgnoreMutatedNode(node as HTMLElement)) {
            continue;
        }
        getOrAssignUuid(node as HTMLElement);
        const layerNode = buildLayerTree(parent);
        if (layerNode) {
            removed.set(parentSelector, layerNode);
        }
    }
}

function shouldIgnoreMutatedNode(node: HTMLElement): boolean {
    if (node.id === EditorAttributes.ONLOOK_STUB_ID) {
        return true;
    }
    return false;
}

function deduplicateInsertedElement(element: HTMLElement) {
    const tempId = element.getAttribute(EditorAttributes.DATA_ONLOOK_TEMP_ID);
    if (tempId) {
        removeDuplicateInsertedElement(tempId);
        element.setAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID, tempId);
        element.removeAttribute(EditorAttributes.DATA_ONLOOK_TEMP_ID);
    }
}
