import type { LayerNode } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';

interface LayerMetadata {
    document: Document;
    rootNode: LayerNode;
    domIdToLayerNode: Map<string, LayerNode>;
}

export class AstRelationshipManager {
    domIdToWebviewId: Map<string, string> = new Map();
    webviewIdToLayerMetadata: Map<string, LayerMetadata> = new Map();

    constructor() {
        makeAutoObservable(this);
    }

    remove(domId: string) {
        this.domIdToWebviewId.delete(domId);
    }

    getWebviewId(domId: string): string | undefined {
        return this.domIdToWebviewId.get(domId);
    }

    getRootLayers(): LayerNode[] {
        return Array.from(this.webviewIdToLayerMetadata.values()).map(
            (metadata) => metadata.rootNode,
        );
    }

    getRootLayer(webviewId: string): LayerNode | undefined {
        return this.webviewIdToLayerMetadata.get(webviewId)?.rootNode;
    }

    getMetadata(webviewId: string): LayerMetadata | undefined {
        return this.webviewIdToLayerMetadata.get(webviewId);
    }

    setMetadata(
        webviewId: string,
        doc: Document,
        rootNode: LayerNode,
        domIdToLayerNode: Map<string, LayerNode>,
    ) {
        this.webviewIdToLayerMetadata.set(webviewId, {
            document: doc,
            rootNode: rootNode,
            domIdToLayerNode,
        });
    }

    addNewMapping(webviewId: string, domIdToLayerNode: Map<string, LayerNode>) {
        const metadata = this.getMetadata(webviewId);
        if (metadata) {
            metadata.domIdToLayerNode = new Map([
                ...metadata.domIdToLayerNode,
                ...domIdToLayerNode,
            ]);
        }
    }

    getMapping(webviewId: string): Map<string, LayerNode> | undefined {
        return this.getMetadata(webviewId)?.domIdToLayerNode;
    }

    getLayerNode(webviewId: string, domId: string): LayerNode | undefined {
        return this.getMapping(webviewId)?.get(domId);
    }

    updateDocument(webviewId: string, doc: Document) {
        const metadata = this.getMetadata(webviewId);
        if (metadata) {
            metadata.document = doc;
        }
    }
}
