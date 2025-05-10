import type { LayerNode } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

interface LayerMetadata {
    document: Document;
    rootNode: LayerNode;
    domIdToLayerNode: Map<string, LayerNode>;
}

const FAKE_DATA = [
    {
        frameId: 'ia9vdOL0zThOaSEawxIu3',
        domId: 'odid-59964449-8fdf-4e22-bf9f-e430b6c8cbdc',
        oid: 'mwz9mme',
        instanceId: null,
        textContent: '',
        tagName: 'body',
        isVisible: true,
        component: null,
        webviewId: 'ia9vdOL0zThOaSEawxIu3',
        children: [
            'odid-43caf580-2adb-4327-a2dc-c21aaa18fb1f',
            'odid-3f74a476-57f0-4ed4-bd93-595d471f6f72',
        ],
        parent: null,
    },
    {
        frameId: 'V5CDVYl_lU2diTloklDqf',
        domId: 'odid-37dd73e2-4060-496b-a5c8-e41af4e889cc',
        oid: null,
        instanceId: null,
        textContent: '',
        tagName: 'body',
        isVisible: true,
        component: null,
        webviewId: 'V5CDVYl_lU2diTloklDqf',
        children: [
            'odid-bfddbebd-7311-4914-af43-004e8d5e4a0f',
            'odid-20a583e8-704c-4a48-bf99-ef358bb13bc2',
            'odid-2964f143-415d-412e-81b7-26da0803f56a',
        ],
        parent: null,
    },
];

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
        doc: Document,
        rootNode: LayerNode,
        domIdToLayerNode: Map<string, LayerNode>,
    ) {
        this.frameIdToLayerMetadata.set(frameId, {
            document: doc,
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

    updateDocument(frameId: string, doc: Document) {
        const metadata = this.getMetadata(frameId);
        if (metadata) {
            metadata.document = doc;
        }
    }

    remove(frameId: string) {
        this.frameIdToLayerMetadata.delete(frameId);
    }

    clear() {
        this.frameIdToLayerMetadata.clear();
    }
}
