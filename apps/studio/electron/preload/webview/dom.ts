import { ipcRenderer } from 'electron';
import { EditorAttributes } from '@onlook/models/constants';
import { getOrAssignUuid } from './elements/helpers';
import { WebviewChannels } from '@onlook/models/constants';
import { getUniqueSelector, isValidHtmlElement } from '/common/helpers';
import type { DynamicType, LayerNode } from '@onlook/models/element';

function markDynamicElements(root: HTMLElement) {
    const containers = root.querySelectorAll(`[${EditorAttributes.DATA_ONLOOK_ID}]`);

    containers.forEach((container) => {
        const children = Array.from(container.children);
        if (children.length < 2) {
            return;
        }

        const groups = children.reduce(
            (acc, child) => {
                if (!isValidHtmlElement(child)) {
                    return acc;
                }

                const signature = [
                    child.tagName,
                    child.className,
                    child.getAttribute(EditorAttributes.DATA_ONLOOK_ID),
                    Array.from(child.attributes)
                        .filter((attr) => attr.name.startsWith('data-') || attr.name === 'key')
                        .map((attr) => attr.name)
                        .sort()
                        .join(','),
                ].join('|');

                if (!acc[signature]) {
                    acc[signature] = [];
                }
                acc[signature].push(child);
                return acc;
            },
            {} as Record<string, Element[]>,
        );

        // Mark elements that is part of a map/iteration, dynamic
        Object.values(groups).forEach((group) => {
            if (group.length > 1) {
                group.forEach((element) => {
                    if (element instanceof HTMLElement) {
                        element.setAttribute(EditorAttributes.DATA_ONLOOK_DYNAMIC_TYPE, 'map');
                    }
                });
            }
        });
    });
}

export function processDom(root: HTMLElement = document.body) {
    markDynamicElements(root);

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

    const dynamicType = node.getAttribute(EditorAttributes.DATA_ONLOOK_DYNAMIC_TYPE) as
        | DynamicType
        | undefined;

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
        dynamicType,
    };
}
