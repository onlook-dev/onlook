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
    layerTree: LayerNode[] = [];

    async getInstance(selector: string): Promise<TemplateNode | undefined> {
        await this.checkForNode(selector);
        return this.map.getInstance(selector);
    }

    async getRoot(selector: string): Promise<TemplateNode | undefined> {
        await this.checkForNode(selector);
        return this.map.getRoot(selector);
    }

    async checkForNode(selector: string) {
        // Build node first
        if (!this.map.getRoot(selector)) {
            const element = this.doc?.querySelector(selector);
            if (element instanceof HTMLElement) {
                await this.processNode(element);
            }
        }
    }

    async setMapRoot(rootElement: Element) {
        this.clearMap();
        this.doc = rootElement.ownerDocument;
        const rootLayerNode = await this.processNode(rootElement as HTMLElement);
        this.layerTree = rootLayerNode ? [rootLayerNode] : [];
    }

    private async processNode(node: HTMLElement): Promise<LayerNode | null> {
        const templateNode = getTemplateNode(node);
        if (templateNode) {
            await this.processNodeForMap(node, templateNode);
        }

        return this.parseElToLayerNode(node);
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

    private async processNodeForMap(node: HTMLElement, templateNode: TemplateNode) {
        const selector = getUniqueSelector(node, this.doc?.body);
        this.map.setRoot(selector, templateNode);
        this.findNodeInstance(node, templateNode, selector);
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

    private parseElToLayerNode(element: HTMLElement): LayerNode | null {
        const selector =
            element.tagName.toLowerCase() === 'body'
                ? 'body'
                : getUniqueSelector(element, element.ownerDocument.body);

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

    clearMap() {
        this.map = new AstMap();
        this.layerTree = [];
    }

    getLayerTree(): LayerNode[] {
        return this.layerTree;
    }
}
