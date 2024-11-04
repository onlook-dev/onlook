import { EditorAttributes, MainChannels } from '@onlook/models/constants';
import type { LayerNode, TemplateNode } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';
import { AstRelationshipManager } from './map';
import { getUniqueSelector, isOnlookInDoc } from '/common/helpers';
import { getTemplateNode } from '/common/helpers/template';

export class AstManager {
    private relationshipMap: AstRelationshipManager = new AstRelationshipManager();

    constructor() {
        makeAutoObservable(this);
    }

    get layers() {
        return this.relationshipMap.getRootLayers();
    }

    setLayers(webviewId: string, layer: LayerNode) {
        this.relationshipMap.setRootLayer(webviewId, layer);
    }

    replaceElement(webviewId: string, selector: string, newNode: LayerNode) {
        const doc = this.relationshipMap.getDocument(webviewId);
        const element = doc?.querySelector(selector);
        if (!element) {
            console.warn('Failed to replaceElement: Element not found');
            return;
        }

        const parent = element.parentElement;
        if (!parent) {
            console.warn('Failed to replaceElement: Parent not found');
            return;
        }

        const rootNode = this.relationshipMap.getRootLayer(webviewId);
        if (!rootNode) {
            console.warn('Failed to replaceElement: Root node not found');
            return;
        }

        const parentSelector = getUniqueSelector(parent, parent.ownerDocument.body);
        const parentNode = this.findInLayersTree(parentSelector, rootNode);
        if (!parentNode || !parentNode.children) {
            console.warn('Failed to replaceElement: Parent node not found');
            return;
        }

        const index = parentNode.children?.findIndex((child) => child.id === selector);
        if (index !== -1) {
            parentNode.children[index] = newNode;
        } else {
            parentNode.children = parentNode.children?.filter((child) => child.id !== selector);
        }

        this.processNode(webviewId, parent as HTMLElement);
    }

    findInLayersTree(selector: string, node: LayerNode | undefined): LayerNode | undefined {
        if (!node) {
            return;
        }
        if (node.id === selector) {
            return node;
        }
        if (!node.children) {
            return undefined;
        }
        for (const child of node.children) {
            const found = this.findInLayersTree(selector, child);
            if (found) {
                return found;
            }
        }
    }

    getAnyTemplateNode(selector: string): TemplateNode | undefined {
        return this.getInstance(selector) || this.getRoot(selector);
    }

    getInstance(selector: string): TemplateNode | undefined {
        return this.relationshipMap.getTemplateInstance(selector);
    }

    getRoot(selector: string): TemplateNode | undefined {
        return this.relationshipMap.getTemplateRoot(selector);
    }

    getWebviewId(selector: string): string | undefined {
        return this.relationshipMap.getWebviewId(selector);
    }

    setDoc(webviewId: string, doc: Document) {
        this.relationshipMap.setDocument(webviewId, doc);
    }

    setMapRoot(webviewId: string, rootElement: Element) {
        this.setDoc(webviewId, rootElement.ownerDocument);

        if (isOnlookInDoc(rootElement.ownerDocument)) {
            this.processNode(webviewId, rootElement as HTMLElement);
        } else {
            console.warn('Page is not Onlook enabled');
        }
    }

    processNode(webviewId: string, node: HTMLElement) {
        this.dfs(node as HTMLElement, (node) => {
            this.processNodeForMap(webviewId, node as HTMLElement);
        });
    }

    dfs(root: HTMLElement, callback: (node: HTMLElement) => void) {
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (!node) {
                continue;
            }
            callback(node);
            for (let i = 0; i < node.children.length; i++) {
                stack.push(node.children[i] as HTMLElement);
            }
        }
    }

    private processNodeForMap(webviewId: string, node: HTMLElement) {
        const doc = this.relationshipMap.getDocument(webviewId);
        const selector = getUniqueSelector(node, doc?.body);
        if (!selector) {
            return;
        }
        const templateNode = getTemplateNode(node);
        if (!templateNode) {
            return;
        }

        this.relationshipMap.setTemplateRoot(webviewId, selector, templateNode);
        const dataOnlookId = node.getAttribute(EditorAttributes.DATA_ONLOOK_ID) as string;
        this.findNodeInstance(webviewId, node, node, templateNode, selector, dataOnlookId);
    }

    private async findNodeInstance(
        webviewId: string,
        originalNode: HTMLElement,
        node: HTMLElement,
        templateNode: TemplateNode,
        selector: string,
        dataOnlookId: string,
    ) {
        const parent = node.parentElement;
        if (!parent) {
            return;
        }

        const parentTemplateNode = getTemplateNode(parent);
        if (!parentTemplateNode) {
            return;
        }

        if (parentTemplateNode.component !== templateNode.component) {
            const children = parent.querySelectorAll(
                `[${EditorAttributes.DATA_ONLOOK_ID}='${dataOnlookId}']`,
            );
            const index = Array.from(children).indexOf(originalNode);
            const instance: TemplateNode = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CHILD,
                { parent: parentTemplateNode, child: templateNode, index },
            );
            if (instance) {
                this.relationshipMap.setTemplateInstance(webviewId, selector, instance);
            } else {
                await this.findNodeInstance(
                    webviewId,
                    originalNode,
                    parent,
                    templateNode,
                    selector,
                    dataOnlookId,
                );
            }
        }
    }

    clear() {
        this.relationshipMap = new AstRelationshipManager();
    }
}
