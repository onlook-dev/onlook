import { TemplateNode } from '/common/models/element/templateNode';

export class AstMap {
    templateToSelectors: Map<TemplateNode, string[]> = new Map();
    selectorToInstance: Map<string, TemplateNode> = new Map();
    selectorToRoot: Map<string, TemplateNode> = new Map();

    getSelectors(templateNode: TemplateNode): string[] {
        return this.templateToSelectors.get(templateNode) || [];
    }

    getInstance(selector: string): TemplateNode | undefined {
        return this.selectorToInstance.get(selector);
    }

    getRoot(selector: string): TemplateNode | undefined {
        return this.selectorToRoot.get(selector);
    }

    setSelector(templateNode: TemplateNode, selector: string) {
        const existing = this.templateToSelectors.get(templateNode) || [];
        if (!existing.includes(selector)) {
            existing.push(selector);
            this.templateToSelectors.set(templateNode, existing);
        }
    }

    setRoot(selector: string, templateNode: TemplateNode) {
        this.selectorToRoot.set(selector, templateNode);
        this.setSelector(templateNode, selector);
    }

    setInstance(selector: string, templateNode: TemplateNode) {
        this.selectorToInstance.set(selector, templateNode);
        this.setSelector(templateNode, selector);
    }
}
