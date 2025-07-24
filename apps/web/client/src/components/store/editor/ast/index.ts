import type { LayerNode, TemplateNode } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
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
        const templateNode = await this.editorEngine.sandbox.getTemplateNode(node.oid);
        if (!templateNode) {
            console.warn('Failed to processNodeForMap: Template node not found');
            return;
        }

        // Check if node needs type assignment
        const hasSpecialType = templateNode.dynamicType || templateNode.coreElementType;
        if (!hasSpecialType) {
            this.findNodeInstance(frameId, node, node, templateNode);
            return;
        }

        const frame = this.editorEngine.frames.get(frameId);
        if (!frame) {
            console.warn('Failed: Frame not found');
            return;
        }

        if (templateNode.dynamicType) {
            node.dynamicType = templateNode.dynamicType;
        }

        if (templateNode.coreElementType) {
            node.coreElementType = templateNode.coreElementType;
        }

        if (!frame.view) {
            console.error('No frame view found');
            return;
        }

        frame.view.setElementType(
            node.domId,
            templateNode.dynamicType,
            templateNode.coreElementType,
        );
        this.findNodeInstance(frameId, node, node, templateNode);
    }

    private async findNodeInstance(
        frameId: string,
        originalNode: LayerNode,
        node: LayerNode,
        templateNode: TemplateNode,
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
        const parentTemplateNode = await this.editorEngine.sandbox.getTemplateNode(parent.oid);

        if (!parentTemplateNode) {
            console.warn('Failed to findNodeInstance: Parent template node not found');
            return;
        }

        if (parentTemplateNode.component !== templateNode.component) {
            if (!parent.children) {
                console.warn('Failed to findNodeInstance: Parent has no children');
                return;
            }

            const childrenWithSameOid: LayerNode[] = [];
            for (const childDomId of parent.children) {
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
                await this.editorEngine.sandbox.getTemplateNodeChild(
                    parent.oid,
                    templateNode,
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
                await this.findNodeInstance(frameId, originalNode, parent, templateNode);
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
