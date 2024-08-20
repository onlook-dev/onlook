import { makeAutoObservable, runInAction } from 'mobx';
import { AstMap } from './map';
import { EditorAttributes, MainChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { getTemplateNode } from '/common/helpers/template';
import { LayerNode } from '/common/models/element/layers';
import { TemplateNode } from '/common/models/element/templateNode';

const IGNORE_TAGS = ['SCRIPT', 'STYLE'];

export class AstManager {
    private doc: Document | undefined;
    private layersMap: Map<string, LayerNode> = new Map();
    layers: LayerNode[] = [];
    templateNodeMap: AstMap = new AstMap();

    constructor() {
        makeAutoObservable(this);
    }

    updateLayers(layers: LayerNode[]) {
        runInAction(() => {
            this.layers = layers;
        });
    }

    refreshElement(selector: string) {
        const element = this.doc?.querySelector(selector);
        if (!element) {
            return;
        }
        if (!this.templateNodeMap.isProcessed(selector) && !this.layersMap.has(selector)) {
            return;
        }
        this.layersMap.delete(selector);
        this.templateNodeMap.remove(selector);

        // Remove all children
        const children = element.querySelectorAll('*');
        children.forEach((child) => {
            const childSelector = getUniqueSelector(child as HTMLElement, child.ownerDocument.body);
            this.layersMap.delete(childSelector);
            this.templateNodeMap.remove(childSelector);
        });

        // Remove from parent
        const parent = element.parentElement;
        if (!parent) {
            return;
        }
        const parentSelector = getUniqueSelector(parent, parent.ownerDocument.body);
        const parentNode = this.layersMap.get(parentSelector);
        if (!parentNode) {
            return;
        }
        parentNode.children = parentNode.children?.filter((child) => child.id !== selector);
    }

    async getInstance(selector: string): Promise<TemplateNode | undefined> {
        await this.checkForNode(selector);
        return this.templateNodeMap.getInstance(selector);
    }

    async getRoot(selector: string): Promise<TemplateNode | undefined> {
        await this.checkForNode(selector);
        return this.templateNodeMap.getRoot(selector);
    }

    async checkForNode(selector: string) {
        if (this.templateNodeMap.isProcessed(selector)) {
            return;
        }
        const element = this.doc?.querySelector(selector);
        const res = await this.processNode(element as HTMLElement);
        if (res && res.layerNode && res.refreshed) {
            this.updateLayers([res.layerNode]);
        }
    }

    setDoc(doc: Document) {
        this.doc = doc;
    }

    async setMapRoot(rootElement: Element) {
        this.clear();
        this.setDoc(rootElement.ownerDocument);
        const res = await this.processNode(rootElement as HTMLElement);
        if (res && res.layerNode) {
            this.updateLayers([res.layerNode]);
        }
    }

    private isValidElement(element: Element): boolean {
        return (
            element &&
            element instanceof Node &&
            element.nodeType === Node.ELEMENT_NODE &&
            !IGNORE_TAGS.includes(element.tagName) &&
            !element.hasAttribute(EditorAttributes.DATA_ONLOOK_IGNORE)
        );
    }

    private async processNodeForMap(node: HTMLElement) {
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

    private processNode(element: HTMLElement): Promise<{
        layerNode: LayerNode | null;
        refreshed: boolean;
    } | null> {
        return new Promise((resolve) => {
            this.parseElToLayerNodeRecursive(element, null, false, resolve);
        });
    }

    private parseElToLayerNodeRecursive(
        element: HTMLElement,
        child: LayerNode | null,
        refreshed: boolean,
        finalResolve: (result: { layerNode: LayerNode | null; refreshed: boolean } | null) => void,
    ) {
        requestAnimationFrame(async () => {
            if (!this.isValidElement(element)) {
                finalResolve(null);
                return;
            }
            const selector = getUniqueSelector(element, element.ownerDocument.body);
            if (!this.templateNodeMap.isProcessed(selector)) {
                this.processNodeForMap(element);
            }

            let currentNode = this.layersMap.get(selector);
            if (!currentNode) {
                currentNode = this.getLayerNodeFromElement(element, selector);
                this.layersMap.set(selector, currentNode);
                refreshed = true;
            }

            if (child) {
                if (!currentNode.children) {
                    currentNode.children = [];
                }
                if (!currentNode.children.some((c) => c.id === child.id)) {
                    const insertIndex = currentNode.children.findIndex(
                        (c) => c.originalIndex > child.originalIndex,
                    );
                    if (insertIndex === -1) {
                        currentNode.children.push(child);
                    } else {
                        currentNode.children.splice(insertIndex, 0, child);
                    }
                } else {
                    currentNode.children = currentNode.children.map((c) =>
                        c.id === child.id ? child : c,
                    );
                }
            }

            if (element.parentElement && element.tagName.toLowerCase() !== 'body') {
                this.parseElToLayerNodeRecursive(
                    element.parentElement,
                    currentNode,
                    refreshed,
                    finalResolve,
                );
            } else {
                finalResolve({ layerNode: currentNode, refreshed });
            }
        });
    }

    private getLayerNodeFromElement(element: HTMLElement, selector: string): LayerNode {
        const textContent = Array.from(element.childNodes)
            .map((node) => (node.nodeType === Node.TEXT_NODE ? node.textContent : ''))
            .join(' ')
            .trim()
            .slice(0, 50);

        const computedStyle = getComputedStyle(element);
        const originalIndex = Array.from(element.parentElement?.children || []).indexOf(element);
        return {
            id: selector,
            textContent,
            type: element.nodeType,
            tagName: element.tagName,
            style: {
                display: computedStyle.display,
                flexDirection: computedStyle.flexDirection,
            },
            originalIndex,
        };
    }

    clear() {
        this.templateNodeMap = new AstMap();
        this.layers = [];
        this.layersMap = new Map();
    }
}
