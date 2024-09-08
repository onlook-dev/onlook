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
    const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node: HTMLElement) =>
            isValidHtmlElement(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });

    function processNode(node: HTMLElement): WebviewLayerNode {
        // Set unique ID
        const uniqueId = uuid();
        node.setAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID, uniqueId);

        const textContent = Array.from(node.childNodes)
            .map((node) => (node.nodeType === Node.TEXT_NODE ? node.textContent : ''))
            .join(' ')
            .trim()
            .slice(0, 500);

        // Build the layer node
        const layerNode: WebviewLayerNode = {
            id: getUniqueSelector(node),
            textContent: textContent || '',
            tagName: node.tagName.toLowerCase(),
            encodedTemplateNode: node.getAttribute(EditorAttributes.DATA_ONLOOK_ID),
            children: [],
        };

        // Process children
        let child = treeWalker.firstChild();
        while (child) {
            const childNode = processNode(child as HTMLElement);
            if (childNode) {
                layerNode.children!.push(childNode);
            }
            child = treeWalker.nextSibling();
        }

        // Move back up to the parent for the next iteration
        treeWalker.parentNode();

        return layerNode;
    }

    return isValidHtmlElement(root) ? processNode(root) : null;
}
