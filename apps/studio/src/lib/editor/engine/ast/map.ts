import type { LayerNode, TemplateNode } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';

export class AstRelationshipManager {
    templateToSelectors: Map<TemplateNode, string[]> = new Map();
    domIdToWebviewId: Map<string, string> = new Map();
    webviewIdToDocument: Map<string, Document> = new Map();
    webviewIdToRootNode: Map<string, LayerNode> = new Map();

    constructor() {
        makeAutoObservable(this);
    }

    remove(domId: string) {
        this.domIdToWebviewId.delete(domId);
    }

    getSelectors(templateNode: TemplateNode): string[] {
        return this.templateToSelectors.get(templateNode) || [];
    }

    getWebviewId(domId: string): string | undefined {
        return this.domIdToWebviewId.get(domId);
    }

    setSelector(webviewId: string, templateNode: TemplateNode, domId: string) {
        const existing = this.templateToSelectors.get(templateNode) || [];
        if (!existing.includes(domId)) {
            existing.push(domId);
            this.templateToSelectors.set(templateNode, existing);
        }
        this.domIdToWebviewId.set(domId, webviewId);
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
