import { AstMap } from './map';
import { MainChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { getTemplateNode } from '/common/helpers/template';
import { TemplateNode } from '/common/models/element/templateNode';

export class AstManager {
    map: AstMap = new AstMap();

    async mapDom(element: Element) {
        const doc = element.ownerDocument;
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
        walker.currentNode = doc.body;
        let node: HTMLElement;
        while (walker.nextNode() as HTMLElement) {
            node = walker.currentNode as HTMLElement;
            const templateNode = getTemplateNode(node);
            if (!templateNode) {
                continue;
            }
            await this.processNodeForMap(node, templateNode, doc);
        }
    }

    private async processNodeForMap(node: HTMLElement, templateNode: TemplateNode, doc: Document) {
        const selector = getUniqueSelector(node as HTMLElement, doc.body);
        this.map.setRoot(selector, templateNode);
        await this.findInstance(node, templateNode, selector);
    }

    private async findInstance(node: HTMLElement, templateNode: TemplateNode, selector: string) {
        const parent = node.parentElement;
        if (!parent) {
            return;
        }

        const parentTemplateNode = getTemplateNode(parent);
        if (!parentTemplateNode) {
            return;
        }

        if (parentTemplateNode.component !== templateNode.component) {
            // Filter for only htmlelement
            const index = Array.from(parent.children).indexOf(node);
            const instance: TemplateNode = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CHILD,
                { parent: parentTemplateNode, child: templateNode, index },
            );
            if (!instance) {
                await this.findInstance(parent, templateNode, selector);
                return;
            }
            this.map.setInstance(selector, instance);
        }
    }
}
