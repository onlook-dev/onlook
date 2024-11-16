import { EditorAttributes, WebviewChannels } from '@onlook/models/constants';
import type { LayerNode } from '@onlook/models/element';
import { ipcRenderer } from 'electron';
import { uuid } from './bundles';
import { isValidHtmlElement } from '/common/helpers';

export function processDom(root: HTMLElement = document.body) {
    const layerTree = buildLayerTree(root);
    if (!layerTree) {
        console.error('Error building layer tree, root element is null');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.DOM_READY, layerTree);
}

export function buildLayerTree(root: HTMLElement): LayerNode | null {
    if (!isValidHtmlElement(root)) {
        return null;
    }

    const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node: Node) =>
            isValidHtmlElement(node as HTMLElement)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP,
    });

    const layerTree: LayerNode = processNode(root);
    const nodeStack: LayerNode[] = [layerTree];
    let currentDepth = 0;
    let previousNode: Node | null = root;

    let currentNode: Node | null = treeWalker.nextNode();

    while (currentNode) {
        if (previousNode && previousNode.contains(currentNode)) {
            currentDepth++;
        } else {
            while (previousNode && !previousNode.contains(currentNode)) {
                currentDepth--;
                previousNode = previousNode.parentNode;
            }
            currentDepth++;
        }

        const layerNode = processNode(currentNode as HTMLElement);

        while (nodeStack.length > currentDepth) {
            nodeStack.pop();
        }

        const parentLayerNode = nodeStack[nodeStack.length - 1];
        if (!parentLayerNode.children) {
            parentLayerNode.children = [];
        }
        parentLayerNode.children.push(layerNode);
        nodeStack.push(layerNode);

        previousNode = currentNode;
        currentNode = treeWalker.nextNode();
    }
    return layerTree;
}

function processNode(node: HTMLElement): LayerNode {
    const layerId = getOrAssignLayerId(node);
    const oid = getOnlookId(node);
    const instanceId = getInstanceId(node);
    const textContent = Array.from(node.childNodes)
        .map((node) => (node.nodeType === Node.TEXT_NODE ? node.textContent : ''))
        .join(' ')
        .trim()
        .slice(0, 500);

    const style = window.getComputedStyle(node);

    return {
        layerId,
        oid,
        instanceId,
        textContent: textContent || '',
        tagName: node.tagName.toLowerCase(),
        isVisible: style.visibility !== 'hidden',
    };
}

function getOrAssignLayerId(node: HTMLElement): string {
    let layerId = node.getAttribute(EditorAttributes.DATA_ONLOOK_LAYER_ID) as string;
    if (!layerId) {
        layerId = uuid();
        node.setAttribute(EditorAttributes.DATA_ONLOOK_LAYER_ID, layerId);
    }
    return layerId;
}

function getOnlookId(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_ID) as string;
}

function getInstanceId(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_INSTANCE_ID) as string;
}
