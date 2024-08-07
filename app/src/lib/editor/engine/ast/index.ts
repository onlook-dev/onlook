import { LayerNode } from '@/routes/project/LayersPanel/LayersTab';
import { AstMap } from './map';
import { EditorAttributes, MainChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { getTemplateNode } from '/common/helpers/template';
import { TemplateNode } from '/common/models/element/templateNode';

const IGNORE_TAGS = ['SCRIPT', 'STYLE'];

export class AstManager {
    private map: AstMap = new AstMap();
    private doc: Document | undefined;
    private layersMap: Map<string, LayerNode> = new Map();
    layers: LayerNode[] = [];

    async getInstance(selector: string): Promise<TemplateNode | undefined> {
        await this.checkForNode(selector);
        return this.map.getInstance(selector);
    }

    async getRoot(selector: string): Promise<TemplateNode | undefined> {
        await this.checkForNode(selector);
        return this.map.getRoot(selector);
    }

    async checkForNode(selector: string) {
        if (!this.isProcessed(selector)) {
            const element = this.doc?.querySelector(selector);
            if (element instanceof HTMLElement) {
                await this.processNode(element);
            }
        }
    }

    private isProcessed(selector: string): boolean {
        return this.map.getRoot(selector) !== undefined;
    }

    async setMapRoot(rootElement: Element) {
        this.clearMap();
        this.doc = rootElement.ownerDocument;
        const rootLayerNode = await this.processNode(rootElement as HTMLElement);
        this.layers = rootLayerNode ? [rootLayerNode] : [];
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
        const templateNode = getTemplateNode(node);
        if (!templateNode) {
            return;
        }
        await this.map.setRoot(selector, templateNode);
        await this.findNodeInstance(node, templateNode, selector);
    }

    private async findNodeInstance(
        node: HTMLElement,
        templateNode: TemplateNode,
        selector: string,
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
            const instance: TemplateNode = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CHILD,
                { parent: parentTemplateNode, child: templateNode },
            );
            if (!instance) {
                await this.findNodeInstance(parent, templateNode, selector);
                return;
            }
            this.map.setInstance(selector, instance);
            return;
        }
    }

    private processNode(element: HTMLElement): Promise<LayerNode | null> {
        return new Promise((resolve) => {
            this.parseElToLayerNodeRecursive(element, null, resolve);
        });
    }

    private getLayerNodeFromElement(element: HTMLElement, selector: string): LayerNode {
        const textContent = Array.from(element.childNodes)
            .map((node) => (node.nodeType === Node.TEXT_NODE ? node.textContent : ''))
            .join(' ')
            .trim()
            .slice(0, 50);

        const instanceTemplate = this.map.getInstance(selector);
        const name = instanceTemplate?.component || element.tagName.toLowerCase();
        const displayName = textContent ? `${name}  ${textContent}` : name;
        const computedStyle = getComputedStyle(element);

        return {
            id: selector,
            name: displayName,
            children: [],
            type: element.nodeType,
            component: instanceTemplate !== undefined,
            tagName: element.tagName,
            style: {
                display: computedStyle.display,
                flexDirection: computedStyle.flexDirection,
            },
        };
    }

    private parseElToLayerNodeRecursive(
        element: HTMLElement,
        child: LayerNode | null,
        finalResolve: (result: LayerNode | null) => void,
    ) {
        requestAnimationFrame(async () => {
            if (!this.isValidElement(element)) {
                finalResolve(null);
                return;
            }

            const selector = getUniqueSelector(element, element.ownerDocument.body);

            if (!this.isProcessed(selector)) {
                await this.processNodeForMap(element);
            }

            let currentNode = this.layersMap.get(selector);
            if (!currentNode) {
                currentNode = this.getLayerNodeFromElement(element, selector);
                this.layersMap.set(selector, currentNode);
            }

            if (selector) {
                if (child) {
                    if (!currentNode.children) {
                        currentNode.children = [];
                    }
                    if (!currentNode.children.includes(child)) {
                        currentNode.children.push(child);
                    }
                }
            }

            if (element.parentElement && element.tagName.toLowerCase() !== 'body') {
                this.parseElToLayerNodeRecursive(element.parentElement, currentNode, finalResolve);
            } else {
                finalResolve(currentNode);
            }
        });
    }

    clearMap() {
        this.map = new AstMap();
        this.layers = [];
        this.layersMap = new Map();
    }
}
