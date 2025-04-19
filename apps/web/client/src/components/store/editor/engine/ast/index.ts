// import { invokeMainChannel } from '@/lib/utils';
import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame';
import { EditorAttributes, MainChannels } from '@onlook/models/constants';
import type { LayerNode, TemplateNode } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
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

    setMapRoot(
        frameId: string,
        root: Element,
        rootNode: LayerNode,
        layerMap: Map<string, LayerNode>,
    ) {
        this.mappings.setMetadata(frameId, root.ownerDocument, rootNode, layerMap);
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
                    const childLayerNode = this.mappings.getLayerNode(frameId, node.children[i]);
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
        const templateNode = await this.getTemplateNodeById(node.oid);
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

        frame.view.setElementType(
            node.domId,
            templateNode.dynamicType ? templateNode.dynamicType : undefined,
            templateNode.coreElementType ? templateNode.coreElementType : undefined
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
        const parentTemplateNode = await this.getTemplateNodeById(parent.oid);
        if (!parentTemplateNode) {
            console.warn('Failed to findNodeInstance: Parent template node not found');
            return;
        }

        if (parentTemplateNode.component !== templateNode.component) {
            const htmlParent = this.getElementFromDomId(parent.domId, frameId);
            if (!htmlParent) {
                console.warn('Failed to findNodeInstance: Parent node not found');
                return;
            }
            const children = htmlParent.querySelectorAll(
                `[${EditorAttributes.DATA_ONLOOK_ID}='${originalNode.oid}']`,
            );
            const htmlOriginalNode = this.getElementFromDomId(originalNode.domId, frameId);
            if (!htmlOriginalNode) {
                console.warn('Failed to findNodeInstance: Original node not found');
                return;
            }
            const index = Array.from(children).indexOf(htmlOriginalNode);
            const res: { instanceId: string; component: string } | undefined =
                await invokeMainChannel(MainChannels.GET_TEMPLATE_NODE_CHILD, {
                    parent: parentTemplateNode,
                    child: templateNode,
                    index,
                });
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

    getElementFromDomId(domId: string, frameId: string): HTMLElement | null {
        const doc = this.mappings.getMetadata(frameId)?.document;
        if (!doc) {
            console.warn('Failed to getNodeFromDomId: Document not found');
            return null;
        }
        return doc.querySelector(`[${EditorAttributes.DATA_ONLOOK_DOM_ID}='${domId}']`) || null;
    }

    async getTemplateNodeById(oid: string | null): Promise<TemplateNode | null> {
        if (!oid) {
            console.warn('Failed to getTemplateNodeById: No oid found');
            return null;
        }
        return invokeMainChannel(MainChannels.GET_TEMPLATE_NODE, { id: oid });
    }

    updateElementInstance(frameId: string, domId: string, instanceId: string, component: string) {
        const frame = this.editorEngine.frames.get(frameId);
        if (!frame) {
            console.warn('Failed to updateElementInstanceId: Frame not found');
            return;
        }
        frame.view.updateElementInstance(domId, instanceId, component);
    }

    clear() {
        this.layersManager.clear();
    }

    async refreshAstDoc(frame: WebFrameView) {
        const root = await this.getBodyFromFrameView(frame);
        this.mappings.updateDocument(frame.id, root.ownerDocument);
    }

    async getBodyFromFrameView(frame: WebFrameView) {
        const htmlString = await frame.webview.executeJavaScript('document.documentElement.outerHTML');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        return doc.body;
    }
}
