import { MainChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { decode } from '/common/helpers/template';
import { TemplateNode } from '/common/models/element/templateNode';

interface ComponentIndex {
    name: string;
    index: number;
}

class AstMap {
    componentIndexMap: Map<string, ComponentIndex> = new Map();
    selectorMap: Map<string, string> = new Map();

    set(selector: string, componentIndex: ComponentIndex) {
        const componentIndexString = this.getComponentIndexString(componentIndex);
        this.selectorMap.set(componentIndexString, selector);
        this.componentIndexMap.set(selector, componentIndex);
    }

    getComponentIndex(selector: string): ComponentIndex | undefined {
        return this.componentIndexMap.get(selector);
    }

    getSelector(componentIndex: ComponentIndex): string | undefined {
        const componentIndexString = this.getComponentIndexString(componentIndex);
        return this.selectorMap.get(componentIndexString);
    }

    private getComponentIndexString(componentIndex: ComponentIndex): string {
        return `${componentIndex.name}:${componentIndex.index}`;
    }
}

export class AstManager {
    astMap: AstMap = new AstMap();

    async getCodeAst(templateNode: TemplateNode) {
        const codeBlock = (await window.api.invoke(
            MainChannels.GET_CODE_BLOCK,
            templateNode,
        )) as string;

        console.log(codeBlock);
    }

    generateMap(element: Element) {
        const doc = element.ownerDocument;
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);

        walker.currentNode = doc.body;
        let currentNode: Element;
        const indexes = new Map<string, number>();
        while (walker.nextNode() as Element) {
            currentNode = walker.currentNode as Element;
            const encoded = currentNode.getAttribute('data-onlook-id');
            if (!encoded) {
                continue;
            }
            const templateNode = decode(encoded);
            const component = templateNode.component;

            const selector = getUniqueSelector(currentNode as HTMLElement, doc.body);
            const index = indexes.get(component) || 0;
            indexes.set(component, index + 1);
            this.astMap.set(selector, { name: component, index });
        }

        console.log(this.astMap);
    }
}
