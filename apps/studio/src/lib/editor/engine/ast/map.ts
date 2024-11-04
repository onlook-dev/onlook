import type { LayerNode, TemplateNode } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';

export class AstRelationshipManager {
    templateToSelectors: Map<TemplateNode, string[]> = new Map();

    selectorToInstance: Map<string, TemplateNode> = new Map();
    selectorToRoot: Map<string, TemplateNode> = new Map();
    selectorToWebviewId: Map<string, string> = new Map();

    webviewIdToDocument: Map<string, Document> = new Map();
    webviewIdToRootNode: Map<string, LayerNode> = new Map();

    constructor() {
        makeAutoObservable(this);
    }
    isProcessed(selector: string): boolean {
        return this.selectorToInstance.has(selector) || this.selectorToRoot.has(selector);
    }

    remove(selector: string) {
        this.selectorToInstance.delete(selector);
        this.selectorToRoot.delete(selector);
        this.selectorToWebviewId.delete(selector);
    }

    getSelectors(templateNode: TemplateNode): string[] {
        return this.templateToSelectors.get(templateNode) || [];
    }

    getTemplateInstance(selector: string): TemplateNode | undefined {
        return this.selectorToInstance.get(selector);
    }

    getTemplateRoot(selector: string): TemplateNode | undefined {
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

    setTemplateRoot(webviewId: string, selector: string, templateNode: TemplateNode) {
        this.selectorToRoot.set(selector, templateNode);
        this.setSelector(webviewId, templateNode, selector);
    }

    setTemplateInstance(webviewId: string, selector: string, templateNode: TemplateNode) {
        this.selectorToInstance.set(selector, templateNode);
        this.setSelector(webviewId, templateNode, selector);
    }

    getRootLayers(): LayerNode[] {
        return Array.from(this.webviewIdToRootNode.values());
    }

    getRootLayer(webviewId: string): LayerNode | undefined {
        return this.webviewIdToRootNode.get(webviewId);
    }

    getDocument(webviewId: string): Document | undefined {
        return this.webviewIdToDocument.get(webviewId);
    }

    setDocument(webviewId: string, doc: Document) {
        this.webviewIdToDocument.set(webviewId, doc);
    }

    setRootLayer(webviewId: string, layer: LayerNode) {
        this.webviewIdToRootNode.set(webviewId, layer);
    }
}
