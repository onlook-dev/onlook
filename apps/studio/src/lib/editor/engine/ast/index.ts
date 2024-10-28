import { makeAutoObservable } from 'mobx';
import { TemplateNodeMap } from './map';
import { EditorAttributes, MainChannels } from '/common/constants';
import { getUniqueSelector, isOnlookInDoc } from '/common/helpers';
import { getTemplateNode } from '/common/helpers/template';
import { LayerNode } from '/common/models/element/layers';
import { TemplateNode } from '/common/models/element/templateNode';

export class AstManager {
    private doc: Document | undefined;
    private displayLayers: LayerNode[] = [];
    templateNodeMap: TemplateNodeMap = new TemplateNodeMap();

    constructor() {
        makeAutoObservable(this);
    }

    get layers() {
        return this.displayLayers;
    }

    set layers(layers: LayerNode[]) {
        this.displayLayers = layers;
    }

    replaceElement(selector: string, newNode: LayerNode) {
        const element = this.doc?.querySelector(selector);
        if (!element) {
            console.warn('Failed to replaceElement: Element not found');
            return;
        }
        const parent = element.parentElement;
        if (!parent) {
            console.warn('Failed to replaceElement: Parent not found');
            return;
        }
        const parentSelector = getUniqueSelector(parent, parent.ownerDocument.body);
        const parentNode = this.findInLayersTree(parentSelector, this.displayLayers[0]);
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

        this.processNode(parent as HTMLElement);
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
        return this.templateNodeMap.getInstance(selector);
    }

    getRoot(selector: string): TemplateNode | undefined {
        return this.templateNodeMap.getRoot(selector);
    }

    setDoc(doc: Document) {
        this.doc = doc;
    }

    setMapRoot(rootElement: Element) {
        this.setDoc(rootElement.ownerDocument);

        if (isOnlookInDoc(rootElement.ownerDocument)) {
            this.processNode(rootElement as HTMLElement);
        } else {
            console.warn('Page is not Onlook enabled');
        }
    }

    processNode(node: HTMLElement) {
        this.dfs(node as HTMLElement, (node) => {
            this.processNodeForMap(node as HTMLElement);
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

    private processNodeForMap(node: HTMLElement) {
        const selector = getUniqueSelector(node, this.doc?.body);
        if (!selector) {
            return;
        }
        const templateNode = getTemplateNode(node);
        if (!templateNode) {
            return;
        }

        this.templateNodeMap.setRoot(selector, templateNode);
        const dataOnlookId = node.getAttribute(EditorAttributes.DATA_ONLOOK_ID) as string;
        this.findNodeInstance(node, node, templateNode, selector, dataOnlookId);
    }

    private async findNodeInstance(
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
                this.templateNodeMap.setInstance(selector, instance);
            } else {
                await this.findNodeInstance(
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
        this.templateNodeMap = new TemplateNodeMap();
        this.displayLayers = [];
    }
}
