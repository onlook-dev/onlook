import { invokeMainChannel } from '@/lib/utils';
import { EditorAttributes, MainChannels } from '@onlook/models/constants';
import type { LayerNode, TemplateNode } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';
import { AstRelationshipManager } from './map';
import { isOnlookInDoc } from '/common/helpers';

export class AstManager {
    private relationshipMap: AstRelationshipManager = new AstRelationshipManager();

    constructor() {
        makeAutoObservable(this);
    }

    get layers() {
        return this.relationshipMap.getRootLayers();
    }

    replaceElement(webviewId: string, newNode: LayerNode) {
        const doc = this.relationshipMap.getDocument(webviewId);
        const element = doc?.querySelector(
            `[${EditorAttributes.DATA_ONLOOK_DOM_ID}='${newNode.domId}']`,
        );
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

        const parentDomId = parent.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) as string;
        const parentNode = this.findInLayersTree(parentDomId, rootNode);
        if (!parentNode || !parentNode.children) {
            console.warn('Failed to replaceElement: Parent node not found');
            return;
        }

        const index = parentNode.children?.findIndex((child) => child.domId === newNode.domId);
        if (index !== -1) {
            parentNode.children[index] = newNode;
        } else {
            parentNode.children = parentNode.children?.filter(
                (child) => child.domId !== newNode.domId,
            );
        }

        this.processNode(webviewId, parent as HTMLElement);
    }

    findInLayersTree(domId: string, node: LayerNode | undefined): LayerNode | undefined {
        if (!node) {
            return;
        }
        if (node.domId === domId) {
            return node;
        }
        if (!node.children) {
            return undefined;
        }
        for (const child of node.children) {
            const found = this.findInLayersTree(domId, child);
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

    getWebviewId(domId: string): string | undefined {
        return this.relationshipMap.getWebviewId(domId);
    }

    setDoc(webviewId: string, doc: Document) {
        this.relationshipMap.setDocument(webviewId, doc);
    }

    setMapRoot(webviewId: string, rootElement: Element, layerRoot: LayerNode) {
        this.setDoc(webviewId, rootElement.ownerDocument);
        this.relationshipMap.setRootLayer(webviewId, layerRoot);

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

    private async processNodeForMap(webviewId: string, node: HTMLElement) {
        const oid = node.getAttribute(EditorAttributes.DATA_ONLOOK_ID) as string;
        if (!oid) {
            console.warn('Failed to processNodeForMap: No oid found');
            return;
        }

        const templateNode = await this.getTemplateNode(node);
        if (!templateNode) {
            console.warn('Failed to processNodeForMap: Template node not found');
            return;
        }

        this.findNodeInstance(webviewId, node, node, templateNode, oid);
    }

    private async findNodeInstance(
        webviewId: string,
        originalNode: HTMLElement,
        node: HTMLElement,
        templateNode: TemplateNode,
        oid: string,
    ) {
        const parent = node.parentElement;
        if (!parent) {
            console.warn('Failed to findNodeInstance: Parent not found');
            return;
        }

        const parentTemplateNode = await this.getTemplateNode(parent);
        if (!parentTemplateNode) {
            console.warn('Failed to findNodeInstance: Parent template node not found');
            return;
        }

        if (parentTemplateNode.component !== templateNode.component) {
            const children = parent.querySelectorAll(
                `[${EditorAttributes.DATA_ONLOOK_ID}='${oid}']`,
            );
            const index = Array.from(children).indexOf(originalNode);
            const instance: TemplateNode = await invokeMainChannel(
                MainChannels.GET_TEMPLATE_NODE_CHILD,
                { parent: parentTemplateNode, child: templateNode, index },
            );
            if (instance) {
                // TODO: We need to figure out the instance here
                console.log('instance', instance);
                // this.relationshipMap.setTemplateInstance(webviewId, selector, instance);
            } else {
                await this.findNodeInstance(webviewId, originalNode, parent, templateNode, oid);
            }
        }
    }

    async getTemplateNode(node: HTMLElement): Promise<TemplateNode | undefined> {
        const oid = node.getAttribute(EditorAttributes.DATA_ONLOOK_ID);
        if (!oid) {
            console.warn('Failed to getTemplateNode: No oid found');
            return;
        }
        return this.getTemplateNodeById(oid);
    }

    getTemplateNodeById(id: string): Promise<TemplateNode | undefined> {
        return invokeMainChannel(MainChannels.GET_TEMPLATE_NODE, { id });
    }

    clear() {
        this.relationshipMap = new AstRelationshipManager();
    }
}
