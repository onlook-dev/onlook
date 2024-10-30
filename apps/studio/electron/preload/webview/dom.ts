import { ipcRenderer } from 'electron';
import { getOrAssignUuid } from './elements/helpers';
import { WebviewChannels } from '@onlook/models/constants';
import { getUniqueSelector, isValidHtmlElement } from '/common/helpers';
import type { LayerNode } from '@onlook/models/element';

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
    getOrAssignUuid(node);

    const textContent = Array.from(node.childNodes)
        .map((node) => (node.nodeType === Node.TEXT_NODE ? node.textContent : ''))
        .join(' ')
        .trim()
        .slice(0, 500);

    const style = window.getComputedStyle(node);

    return {
        id: getUniqueSelector(node),
        textContent: textContent || '',
        tagName: node.tagName.toLowerCase(),
        isVisible: style.visibility !== 'hidden',
    };
}
