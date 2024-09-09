import { makeAutoObservable, runInAction } from 'mobx';
import { TemplateNodeMap } from './map';
import { EditorAttributes, MainChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { getTemplateNode } from '/common/helpers/template';
import { LayerNode } from '/common/models/element/layers';
import { TemplateNode } from '/common/models/element/templateNode';

export class AstManager {
    private doc: Document | undefined;
    private selectorToLayer: Map<string, LayerNode> = new Map();
    private displayLayers: LayerNode[] = [];
    templateNodeMap: TemplateNodeMap = new TemplateNodeMap();

    constructor() {
        makeAutoObservable(this);
    }

    get layers() {
        return this.displayLayers;
    }

    set layers(layers: LayerNode[]) {
        runInAction(() => {
            this.displayLayers = layers;
        });
    }

    refreshElement(selector: string) {
        const element = this.doc?.querySelector(selector);
        if (!element) {
            return;
        }
        if (!this.templateNodeMap.isProcessed(selector) && !this.selectorToLayer.has(selector)) {
            return;
        }
        this.selectorToLayer.delete(selector);
        this.templateNodeMap.remove(selector);

        // Remove all children
        const children = element.querySelectorAll('*');
        children.forEach((child) => {
            const childSelector = getUniqueSelector(child as HTMLElement, child.ownerDocument.body);
            this.selectorToLayer.delete(childSelector);
            this.templateNodeMap.remove(childSelector);
        });

        // Remove from parent
        const parent = element.parentElement;
        if (!parent) {
            return;
        }
        const parentSelector = getUniqueSelector(parent, parent.ownerDocument.body);
        const parentNode = this.selectorToLayer.get(parentSelector);
        if (!parentNode) {
            return;
        }
        parentNode.children = parentNode.children?.filter((child) => child.id !== selector);
    }

    getInstanceSync(selector: string): TemplateNode | undefined {
        return this.templateNodeMap.getInstance(selector);
    }

    async getInstance(selector: string): Promise<TemplateNode | undefined> {
        return this.templateNodeMap.getInstance(selector);
    }

    async getRoot(selector: string): Promise<TemplateNode | undefined> {
        return this.templateNodeMap.getRoot(selector);
    }

    setDoc(doc: Document) {
        this.doc = doc;
    }

    async setMapRoot(rootElement: Element) {
        this.clear();
        this.setDoc(rootElement.ownerDocument);
        this.dfs(rootElement as HTMLElement, (node) => {
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

    clear() {
        this.templateNodeMap = new TemplateNodeMap();
        this.displayLayers = [];
        this.selectorToLayer = new Map();
    }
}
