import { ipcRenderer } from 'electron';
import { uuid } from './bundles';
import { EditorAttributes, WebviewChannels } from '/common/constants';
import { getUniqueSelector, isValidHtmlElement } from '/common/helpers';
import { WebviewLayerNode } from '/common/models/element/layers';

export function processDom(root: HTMLElement = document.body) {
    const layerTree = buildLayerTree(root);
    ipcRenderer.sendToHost(WebviewChannels.DOM_READY, layerTree);
}

function buildLayerTree(root: HTMLElement): WebviewLayerNode | null {
    if (!isValidHtmlElement(root)) {
        return null;
    }

    const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node: Node) =>
            isValidHtmlElement(node as HTMLElement)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP,
    });

    const layerTree: WebviewLayerNode = processNode(root);
    const nodeStack: WebviewLayerNode[] = [layerTree];

    let currentNode: Node | null = treeWalker.nextNode();

    while (currentNode) {
        const layerNode = processNode(currentNode as HTMLElement);

        while (
            nodeStack.length > 0 &&
            !nodeStack[nodeStack.length - 1].element?.contains(currentNode)
        ) {
            nodeStack.pop();
        }

        const parentLayerNode = nodeStack[nodeStack.length - 1];
        if (!parentLayerNode.children) {
            parentLayerNode.children = [];
        }
        parentLayerNode.children.push(layerNode);
        nodeStack.push(layerNode);

        currentNode = treeWalker.nextNode();
    }

    return layerTree;
}

function processNode(node: HTMLElement): WebviewLayerNode {
    const uniqueId = uuid();
    node.setAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID, uniqueId);

    const textContent = Array.from(node.childNodes)
        .map((node) => (node.nodeType === Node.TEXT_NODE ? node.textContent : ''))
        .join(' ')
        .trim()
        .slice(0, 500);

    return {
        id: getUniqueSelector(node),
        textContent: textContent || '',
        tagName: node.tagName.toLowerCase(),
        encodedTemplateNode: node.getAttribute(EditorAttributes.DATA_ONLOOK_ID),
        element: node, // We'll remove this before returning the final result
    };
}
