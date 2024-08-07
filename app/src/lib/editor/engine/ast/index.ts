import { LayerNode } from '@/routes/project/LayersPanel/LayersTab';
import { AstMap } from './map';
import { EditorAttributes, MainChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { getTemplateNode } from '/common/helpers/template';
import { TemplateNode } from '/common/models/element/templateNode';

const IGNORE_TAGS = ['SCRIPT', 'STYLE'];

export class AstManager {
    map: AstMap = new AstMap();
    layerTree: LayerNode[] = [];

    async mapDom(rootElement: Element) {
        this.clearMap();
        this.layerTree = [];

        const doc = rootElement.ownerDocument;
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node: Node) => {
                return this.isValidElement(node as Element)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_SKIP;
            },
        });

        this.layerTree = await this.traverseDOM(walker);
    }

    private async traverseDOM(walker: TreeWalker): Promise<LayerNode[]> {
        const children: LayerNode[] = [];

        const node = walker.currentNode as HTMLElement;
        const layerNode = await this.processNode(node);

        if (layerNode) {
            children.push(layerNode);

            if (walker.firstChild()) {
                layerNode.children = await this.traverseDOM(walker);
                walker.parentNode();
            }

            while (walker.nextSibling()) {
                const siblings = await this.traverseDOM(walker);
                children.push(...siblings);
            }
        }

        return children;
    }

    private async processNode(node: HTMLElement): Promise<LayerNode | null> {
        const templateNode = getTemplateNode(node);
        if (templateNode) {
            await this.processNodeForMap(node, templateNode, node.ownerDocument);
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

    private async processNodeForMap(node: HTMLElement, templateNode: TemplateNode, doc: Document) {
        const selector = getUniqueSelector(node, doc.body);
        this.map.setRoot(selector, templateNode);
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
            children: [], // Will be populated during traversal
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
