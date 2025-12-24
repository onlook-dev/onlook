import type { JsxElementMetadata } from '@onlook/file-system';
import type { LayerNode } from '@onlook/models';
import { getTemplateNodeChild } from '@onlook/parser';
import { makeAutoObservable } from 'mobx';
import type { BranchData } from '../branch/manager';
import type { EditorEngine } from '../engine';
import { LayersManager } from './layers';

export class AstManager {
    private layersManager: LayersManager;

    constructor(private editorEngine: EditorEngine) {
        this.layersManager = new LayersManager(editorEngine);
        makeAutoObservable(this);
    }

    get mappings() {
        return this.layersManager;
    }

    setMapRoot(frameId: string, rootNode: LayerNode, layerMap: Map<string, LayerNode>) {
        this.mappings.setMetadata(frameId, rootNode, layerMap);
        this.processNode(frameId, rootNode);
    }

    updateMap(frameId: string, newMap: Map<string, LayerNode>, domId: string | null) {
        this.mappings.addNewMapping(frameId, newMap);
        const node = domId ? this.mappings.getLayerNode(frameId, domId) : null;
        if (!node) {
            console.warn('Failed to replaceElement: Node not found');
            return;
        }
        this.processNode(frameId, node);
    }

    processNode(frameId: string, node: LayerNode) {
        this.dfs(frameId, node, (n) => {
            this.processNodeForMap(frameId, n);
        });
    }

    dfs(frameId: string, root: LayerNode, callback: (node: LayerNode) => void) {
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (!node) {
                continue;
            }
            callback(node);
            if (node.children) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    const childLayerNode = this.mappings.getLayerNode(
                        frameId,
                        node.children[i] ?? '',
                    );
                    if (childLayerNode) {
                        stack.push(childLayerNode);
                    }
                }
            }
        }
    }

    private async processNodeForMap(frameId: string, node: LayerNode) {
        if (!node.oid) {
            console.warn('Failed to processNodeForMap: No oid found');
            return;
        }

        const frameData = this.editorEngine.frames.get(frameId);
        if (!frameData) {
            console.warn(`Failed to processNodeForMap: Frame data not found for frameId: ${frameId}`);
            return;
        }

        const branchData = this.editorEngine.branches.getBranchDataById(frameData.frame.branchId);
        if (!branchData) {
            console.warn(`Failed to processNodeForMap: Branch data not found for branchId: ${frameData.frame.branchId}`);
            return;
        }

        const metadata = await branchData.codeEditor.getJsxElementMetadata(node.oid);
        if (!metadata) {
            console.warn('Failed to processNodeForMap: Metadata not found');
            return;
        }

        // Check if node needs type assignment
        const hasSpecialType = metadata.dynamicType || metadata.coreElementType;
        if (!hasSpecialType) {
            void this.findNodeInstance(frameId, node, node, metadata, branchData);
            return;
        }

        // Always update node types based on metadata
        node.dynamicType = metadata.dynamicType || null;
        node.coreElementType = metadata.coreElementType || null;

        if (frameData.view) {
            frameData.view.setElementType(
                node.domId,
                metadata.dynamicType || null,
                metadata.coreElementType || null,
            );
        } else {
            console.error('No frame view found');
        }

        void this.findNodeInstance(frameId, node, node, metadata, branchData);
    }

    private async findNodeInstance(
        frameId: string,
        originalNode: LayerNode,
        node: LayerNode,
        metadata: JsxElementMetadata,
        branchData: BranchData,
    ) {
        if (node.tagName.toLocaleLowerCase() === 'body') {
            return;
        }
        if (!node.parent) {
            console.warn('Failed to findNodeInstance: Parent id not found');
            return;
        }

        const parent = this.mappings.getLayerNode(frameId, node.parent);
        if (!parent) {
            console.warn('Failed to findNodeInstance: Parent not found in layer map');
            return;
        }

        if (!parent.oid) {
            console.warn('Failed to findNodeInstance: Parent has no oid');
            return;
        }
        const parentMetadata = await branchData.codeEditor.getJsxElementMetadata(parent.oid);
        if (!parentMetadata) {
            console.warn('Failed to findNodeInstance: Parent metadata not found');
            return;
        }

        if (parentMetadata.component !== metadata.component) {
            const childrenWithSameOid: LayerNode[] = [];
            for (const childDomId of parent.children ?? []) {
                const childLayerNode = this.mappings.getLayerNode(frameId, childDomId);
                if (childLayerNode && childLayerNode.oid === originalNode.oid) {
                    childrenWithSameOid.push(childLayerNode);
                }
            }

            if (childrenWithSameOid.length === 0) {
                console.warn('Failed to findNodeInstance: No children found with matching OID');
                return;
            }

            const index = childrenWithSameOid.findIndex(
                (child) => child.domId === originalNode.domId,
            );

            if (index === -1) {
                console.warn(
                    'Failed to findNodeInstance: Original node not found in children with same OID',
                );
                return;
            }

            const res: { instanceId: string; component: string } | null =
                await getTemplateNodeChild(
                    parentMetadata.code,
                    metadata,
                    index,
                );

            if (res) {
                originalNode.instanceId = res.instanceId;
                originalNode.component = res.component;
                this.updateElementInstance(
                    frameId,
                    originalNode.domId,
                    res.instanceId,
                    res.component,
                );
            } else {
                // Recursively look up parent to find the instance
                await this.findNodeInstance(frameId, originalNode, parent, metadata, branchData);
            }
        }
    }

    updateElementInstance(frameId: string, domId: string, instanceId: string, component: string) {
        const frameData = this.editorEngine.frames.get(frameId);
        if (!frameData?.view) {
            console.error('Failed to updateElementInstanceId: Frame view not found');
            return;
        }
        frameData.view.updateElementInstance(domId, instanceId, component);
    }

    clear() {
        this.layersManager.clear();
    }
}
