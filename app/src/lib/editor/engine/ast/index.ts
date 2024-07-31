import { AstMap } from './map';
import { MainChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { decode } from '/common/helpers/template';
import { TemplateNode } from '/common/models/element/templateNode';

export class AstManager {
    map: AstMap = new AstMap();

    getInstance(selector: string): TemplateNode | undefined {
        return this.map.getInstance(selector);
    }

    getRoot(selector: string): TemplateNode | undefined {
        return this.map.getRoot(selector);
    }

    private decodeTemplateNode(currentNode: Element): TemplateNode | undefined {
        const encoded = currentNode.getAttribute('data-onlook-id');
        if (!encoded) {
            return;
        }
        const templateNode = decode(encoded);
        return templateNode;
    }

    private async processNodeForMap(node: Element, templateNode: TemplateNode, doc: Document) {
        const selector = getUniqueSelector(node as HTMLElement, doc.body);
        this.map.setRoot(selector, templateNode);

        const parent = node.parentElement;
        if (!parent) {
            return;
        }

        const parentTemplateNode = this.decodeTemplateNode(parent);
        if (!parentTemplateNode) {
            return;
        }

        console.log(
            templateNode.path,
            templateNode.startTag.start.line,
            parentTemplateNode.component,
            templateNode.component,
        );
        if (parentTemplateNode.component !== templateNode.component) {
            const index = Array.from(parent.children).indexOf(node);
            const instanceTemplateNode: TemplateNode = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CHILD,
                { templateNode, index },
            );
            if (!instanceTemplateNode) {
                return;
            }
            this.map.setInstance(selector, instanceTemplateNode);
        }
    }

    async processDom(element: Element): Promise<TemplateNode | undefined> {
        const doc = element.ownerDocument;
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
        let scope: TemplateNode | undefined;

        walker.currentNode = doc.body;
        let node: Element;
        while (walker.nextNode() as Element) {
            node = walker.currentNode as Element;
            const templateNode = this.decodeTemplateNode(node);
            if (!templateNode) {
                continue;
            }
            if (!scope && templateNode && templateNode.component) {
                scope = templateNode;
            }
            await this.processNodeForMap(node, templateNode, doc);
        }
        console.log(this.map);
        return scope;
    }

    async getAstForTemplateNode(templateNode: TemplateNode): Promise<any> {
        const ast = await window.api.invoke(MainChannels.GET_TEMPLATE_NODE_AST, templateNode);
        return ast;
    }
}
