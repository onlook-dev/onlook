import { ipcMain } from 'electron';
import type { LayerNode } from '@onlook/models/element';
import { MainChannels } from '@onlook/models/constants';
import runManager from '../run';

interface WebviewUpdate {
    type: 'setElementType' | 'updateElementInstance';
    domId: string;
    data: {
        dynamicType?: string;
        coreElementType?: string;
        instanceId?: string;
        component?: string;
    };
}

// Helper function to find a node by its domId in the LayerNode tree
function findLayerNodeInTree(root: LayerNode, targetDomId: string): LayerNode | undefined {
    if (root.domId === targetDomId) {
        return root;
    }

    if (!root.children) {
        return undefined;
    }

    // Traverse the tree looking for nodes with matching domIds
    for (const childDomId of root.children) {
        // First find the child LayerNode that has this domId
        const queue = [root];
        while (queue.length > 0) {
            const node = queue.shift();
            if (!node) {
                continue;
            }

            if (node.domId === childDomId) {
                const result = findLayerNodeInTree(node, targetDomId);
                if (result) {
                    return result;
                }
                break;
            }

            if (node.children) {
                for (const id of node.children) {
                    const child = findLayerNodeInTree(root, id);
                    if (child) {
                        queue.push(child);
                    }
                }
            }
        }
    }

    return undefined;
}

export function listenForAstMessages() {
    // Register AST-related IPC handlers
    ipcMain.handle(
        MainChannels.PROCESS_NODE,
        async (_event, { webviewId, rootNode }: { webviewId: string; rootNode: LayerNode }) => {
            const updates: WebviewUpdate[] = [];

            // Port of the DFS logic from renderer, but collecting updates instead of executing them
            const stack = [rootNode];
            while (stack.length > 0) {
                const node = stack.pop();
                if (!node) {
                    continue;
                }

                if (node.oid) {
                    const templateNode = await runManager.getTemplateNode(node.oid);
                    if (templateNode) {
                        // Check if node needs type assignment
                        const hasSpecialType =
                            templateNode.dynamicType || templateNode.coreElementType;
                        if (hasSpecialType) {
                            if (templateNode.dynamicType) {
                                node.dynamicType = templateNode.dynamicType;
                            }
                            if (templateNode.coreElementType) {
                                node.coreElementType = templateNode.coreElementType;
                            }
                            updates.push({
                                type: 'setElementType',
                                domId: node.domId,
                                data: {
                                    dynamicType: templateNode.dynamicType as string | undefined,
                                    coreElementType: templateNode.coreElementType as
                                        | string
                                        | undefined,
                                },
                            });
                        }

                        // Handle instance updates (simplified from findNodeInstance)
                        if (node.parent) {
                            const parentTemplateNode = await runManager.getTemplateNode(
                                node.parent,
                            );
                            if (
                                parentTemplateNode &&
                                parentTemplateNode.component !== templateNode.component
                            ) {
                                // Find the index of this node among siblings with the same oid
                                const siblings = stack.filter(
                                    (n) => n.parent === node.parent && n.oid === node.oid,
                                );
                                const index = siblings.indexOf(node);

                                const res = await runManager.getTemplateNodeChild(
                                    parentTemplateNode,
                                    templateNode,
                                    index,
                                );
                                if (res) {
                                    node.instanceId = res.instanceId;
                                    node.component = res.component;
                                    updates.push({
                                        type: 'updateElementInstance',
                                        domId: node.domId,
                                        data: {
                                            instanceId: res.instanceId,
                                            component: res.component,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }

                // Add children to stack in reverse order
                if (node.children) {
                    for (let i = node.children.length - 1; i >= 0; i--) {
                        const childId = node.children[i];
                        const childNode = findLayerNodeInTree(rootNode, childId);
                        if (childNode) {
                            stack.push(childNode);
                        }
                    }
                }
            }

            return updates;
        },
    );
}
