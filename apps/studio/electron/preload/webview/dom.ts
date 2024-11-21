import { EditorAttributes, WebviewChannels } from '@onlook/models/constants';
import type { LayerNode } from '@onlook/models/element';
import { ipcRenderer } from 'electron';
import { getOrAssignDomId } from './ids';
import { isValidHtmlElement } from '/common/helpers';
import { getInstanceId, getOid } from '/common/helpers/ids';

export function saveWebviewId(webviewId: string) {
    (window as any).webviewId = webviewId;
}

export function getWebviewId(): string {
    const webviewId = (window as any).webviewId;
    if (!webviewId) {
        console.error('Webview id not found');
    }
    return webviewId;
}

export function processDom(root: HTMLElement = document.body) {
    const layerMap = buildLayerTree(root);
    if (!layerMap) {
        console.error('Error building layer tree, root element is null');
        return;
    }
    ipcRenderer.sendToHost(WebviewChannels.DOM_READY, Object.fromEntries(layerMap));
}

export function buildLayerTree(root: HTMLElement): Map<string, LayerNode> | null {
    if (!isValidHtmlElement(root)) {
        return null;
    }

    const layerMap = new Map<string, LayerNode>();
    const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node: Node) =>
            isValidHtmlElement(node as HTMLElement)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP,
    });

    // Process root node
    const rootLayerNode = processNode(root);
    rootLayerNode.children = [];
    layerMap.set(rootLayerNode.domId, rootLayerNode);

    let currentNode: Node | null = treeWalker.nextNode();

    while (currentNode) {
        const layerNode = processNode(currentNode as HTMLElement);
        layerNode.children = [];

        // Get parent's domId
        const parentElement = (currentNode as HTMLElement).parentElement;
        if (parentElement) {
            const parentDomId = parentElement.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID);
            if (parentDomId) {
                layerNode.parent = parentDomId;

                // Add this node's domId to parent's children array
                const parentNode = layerMap.get(parentDomId);
                if (parentNode && parentNode.children) {
                    parentNode.children.push(layerNode.domId);
                }
            }
        }

        layerMap.set(layerNode.domId, layerNode);
        currentNode = treeWalker.nextNode();
    }

    return layerMap;
}

function processNode(node: HTMLElement): LayerNode {
    const domId = getOrAssignDomId(node);
    const oid = getOid(node);
    const instanceId = getInstanceId(node);
    const textContent = Array.from(node.childNodes)
        .map((node) => (node.nodeType === Node.TEXT_NODE ? node.textContent : ''))
        .join(' ')
        .trim()
        .slice(0, 500);
    const style = window.getComputedStyle(node);
    const component = node.getAttribute(EditorAttributes.DATA_ONLOOK_COMPONENT_NAME) as
        | string
        | null;

    const layerNode: LayerNode = {
        domId,
        oid: oid || null,
        instanceId: instanceId || null,
        textContent: textContent || '',
        tagName: node.tagName.toLowerCase(),
        isVisible: style.visibility !== 'hidden',
        component: component || null,
        webviewId: getWebviewId(),
        children: null,
        parent: null,
    };
    return layerNode;
}
