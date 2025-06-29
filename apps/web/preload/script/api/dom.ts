import { EditorAttributes, FrameViewEvents } from '@onlook/constants';
import type { LayerNode } from '@onlook/models';
import debounce from 'lodash/debounce';
import { penpalParent } from '../index';
import { isValidHtmlElement } from '../helpers/dom';
import { getInstanceId, getOid, getOrAssignDomId } from '../helpers/ids';
import { getFrameId } from './state';


const processDebounced = debounce(async (root: HTMLElement = document.body): Promise<boolean> => {
    const frameId = getFrameId();
    if (!frameId) {
        console.warn('frameView id not found, skipping dom processing');
        return false;
    }
    const layerMap = buildLayerTree(root);
    if (!layerMap) {
        console.warn('Error building layer tree, root element is null');
        return false;
    }

    const rootDomId = root.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID);
    if (!rootDomId) {
        console.warn('Root dom id not found');
        return false;
    }
    const rootNode = layerMap.get(rootDomId);
    if (!rootNode) {
        console.warn('Root node not found');
        return false;
    }
    if (penpalParent) {
        try {
            await penpalParent.handleFrameViewEvent({
                action: FrameViewEvents.DOM_PROCESSED,
                args: {
                    frameId,
                    layerMap: Object.fromEntries(layerMap),
                    rootNode
                }
            });
        } catch (error) {
            console.error('Failed to send DOM processed data to parent:', error);
        }
    } else {
        console.warn('penpalParent not available, cannot send DOM processed data');
    }

    return true;
}, 500);

export async function processDom(root: HTMLElement = document.body): Promise<boolean> {
    if (!getFrameId()) {
        console.warn('frameView id not found, skipping dom processing');
        return false;
    }
    await processDebounced(root);
    return true;
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
        frameId: getFrameId(),
        children: null,
        parent: null,
        dynamicType: null,
        coreElementType: null,
    };
    return layerNode;
}
