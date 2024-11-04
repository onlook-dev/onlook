import type { TemplateNode } from '@onlook/models/element';

export class TemplateNodeMap {
    templateToSelectors: Map<TemplateNode, string[]> = new Map();
    selectorToInstance: Map<string, TemplateNode> = new Map();
    selectorToRoot: Map<string, TemplateNode> = new Map();
    selectorToWebviewId: Map<string, string> = new Map();

    isProcessed(selector: string): boolean {
        return this.selectorToInstance.has(selector) || this.selectorToRoot.has(selector);
    }

    remove(selector: string) {
        this.selectorToInstance.delete(selector);
        this.selectorToRoot.delete(selector);
    }

    getSelectors(templateNode: TemplateNode): string[] {
        return this.templateToSelectors.get(templateNode) || [];
    }

    getInstance(selector: string): TemplateNode | undefined {
        return this.selectorToInstance.get(selector);
    }

    getRoot(selector: string): TemplateNode | undefined {
        return this.selectorToRoot.get(selector);
    }

    getWebviewId(selector: string): string | undefined {
        return this.selectorToWebviewId.get(selector);
    }

    setSelector(webviewId: string, templateNode: TemplateNode, selector: string) {
        const existing = this.templateToSelectors.get(templateNode) || [];
        if (!existing.includes(selector)) {
            existing.push(selector);
            this.templateToSelectors.set(templateNode, existing);
        }
        this.selectorToWebviewId.set(selector, webviewId);
    }

    setRoot(webviewId: string, selector: string, templateNode: TemplateNode) {
        this.selectorToRoot.set(selector, templateNode);
        this.setSelector(webviewId, templateNode, selector);
    }

    setInstance(webviewId: string, selector: string, templateNode: TemplateNode) {
        this.selectorToInstance.set(selector, templateNode);
        this.setSelector(webviewId, templateNode, selector);
    }
}
