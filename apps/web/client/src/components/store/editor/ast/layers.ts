import type { LayerNode } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

interface LayerMetadata {
    rootNode: LayerNode;
    domIdToLayerNode: Map<string, LayerNode>;
}


export class LayersManager {
    frameIdToLayerMetadata = new Map<string, LayerMetadata>();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get layers(): LayerNode[] {
        return Array.from(this.frameIdToLayerMetadata.values()).map(
            (metadata) => metadata.rootNode,
        );
    }

    get filteredLayers(): LayerNode[] {
        const selectedWebviews = this.editorEngine.frames.selected;
        if (selectedWebviews.length === 0) {
            return this.layers;
        }
        return this.layers.filter((layer) =>
            selectedWebviews.some((frameView) => frameView.frame.id === layer.frameId),
        );
    }

    getRootLayer(frameId: string): LayerNode | undefined {
        return this.frameIdToLayerMetadata.get(frameId)?.rootNode;
    }

    getMetadata(frameId: string): LayerMetadata | undefined {
        return this.frameIdToLayerMetadata.get(frameId);
    }

    setMetadata(
        frameId: string,
        rootNode: LayerNode,
        domIdToLayerNode: Map<string, LayerNode>,
    ) {
        this.frameIdToLayerMetadata.set(frameId, {
            rootNode: rootNode,
            domIdToLayerNode,
        });
    }

    addNewMapping(frameId: string, domIdToLayerNode: Map<string, LayerNode>) {
        const metadata = this.getMetadata(frameId);
        if (metadata) {
            metadata.domIdToLayerNode = new Map([
                ...metadata.domIdToLayerNode,
                ...domIdToLayerNode,
            ]);
        }
    }

    getMapping(frameId: string): Map<string, LayerNode> | undefined {
        return this.getMetadata(frameId)?.domIdToLayerNode;
    }

    getLayerNode(frameId: string, domId: string): LayerNode | undefined {
        return this.getMapping(frameId)?.get(domId);
    }

    remove(frameId: string) {
        this.frameIdToLayerMetadata.delete(frameId);
    }

    clear() {
        this.frameIdToLayerMetadata.clear();
    }
}
