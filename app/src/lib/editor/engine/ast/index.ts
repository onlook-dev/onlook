import { MainChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { decode } from '/common/helpers/template';
import { TemplateNode } from '/common/models/element/templateNode';

interface MappedTemplate {
    root: TemplateNode;
    instance?: TemplateNode;
}

class AstMap {
    selectors: Map<TemplateNode, string[]> = new Map();
    instanceMap: Map<string, TemplateNode> = new Map();
    rootMap: Map<string, TemplateNode> = new Map();

    getSelectors(templateNode: TemplateNode): string[] {
        return this.selectors.get(templateNode) || [];
    }

    getInstance(selector: string): TemplateNode | undefined {
        return this.instanceMap.get(selector);
    }

    getRoot(selector: string): TemplateNode | undefined {
        return this.rootMap.get(selector);
    }

    setSelector(templateNode: TemplateNode, selector: string) {
        const existing = this.selectors.get(templateNode) || [];
        if (!existing.includes(selector)) {
            existing.push(selector);
            this.selectors.set(templateNode, existing);
        }
    }

    setRoot(selector: string, templateNode: TemplateNode) {
        this.rootMap.set(selector, templateNode);
        this.setSelector(templateNode, selector);
    }

    setInstance(selector: string, templateNode: TemplateNode) {
        this.instanceMap.set(selector, templateNode);
        this.setSelector(templateNode, selector);
    }
}

export class AstManager {
    astMap: AstMap = new AstMap();

    async getCodeAst(templateNode: TemplateNode) {
        // const templateNodes: TemplateNode[] = (await window.api.invoke(
        //     MainChannels.GET_TEMPLATE_NODE_ARRAY,
        //     templateNode,
        // )) as TemplateNode[];
    }

    decodeTemplateNode(currentNode: Element): TemplateNode | undefined {
        const encoded = currentNode.getAttribute('data-onlook-id');
        if (!encoded) {
            return;
        }
        const templateNode = decode(encoded);
        return templateNode;
    }

    async generateMap(element: Element) {
        const doc = element.ownerDocument;
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);

        walker.currentNode = doc.body;
        let node: Element;
        while (walker.nextNode() as Element) {
            node = walker.currentNode as Element;
            const templateNode = this.decodeTemplateNode(node);
            if (!templateNode) {
                continue;
            }
            const selector = getUniqueSelector(node as HTMLElement, doc.body);
            this.astMap.setRoot(selector, templateNode);

            const parent = node.parentElement;

            if (!parent) {
                continue;
            }

            const parentTemplateNode = this.decodeTemplateNode(parent);
            if (!parentTemplateNode) {
                continue;
            }

            if (parentTemplateNode.component !== templateNode.component) {
                console.log(parentTemplateNode, templateNode);
                const index = Array.from(parent.children).indexOf(node);
                const instanceTemplateNode: TemplateNode = await window.api.invoke(
                    MainChannels.GET_TEMPLATE_NODE_CHILD,
                    { templateNode, index },
                );
                if (!instanceTemplateNode) {
                    continue;
                }
                console.log(instanceTemplateNode);
                this.astMap.setInstance(selector, instanceTemplateNode);
            }
        }

        console.log(this.astMap);
    }
}
