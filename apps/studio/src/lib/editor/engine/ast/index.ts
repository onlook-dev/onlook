import { invokeMainChannel } from '@/lib/utils';
import { EditorAttributes, MainChannels } from '@onlook/models/constants';
import type { LayerNode, TemplateNode } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { AstRelationshipManager } from './map';
import { isOnlookInDoc } from '/common/helpers';

export class AstManager {
    private relationshipMap: AstRelationshipManager = new AstRelationshipManager();
    layerMap: Map<string, LayerNode> = new Map();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get layers() {
        return this.relationshipMap.getRootLayers();
    }

    setDoc(webviewId: string, doc: Document) {
        this.relationshipMap.setDocument(webviewId, doc);
    }

    setMapRoot(webviewId: string, root: Element, layerMap: Map<string, LayerNode>) {
        this.layerMap = layerMap;
        this.setDoc(webviewId, root.ownerDocument);
        const layerRoot = layerMap.get(
            root.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) || '',
        );
        if (!layerRoot) {
            console.warn('Failed to setMapRoot: Layer root not found');
            return;
        }
        this.relationshipMap.setRootLayer(webviewId, layerRoot);

        if (isOnlookInDoc(root.ownerDocument)) {
            this.processNode(webviewId, layerRoot);
        } else {
            console.warn('Page is not Onlook enabled');
        }
    }

    replaceElement(webviewId: string, newNode: LayerNode) {
        // TODO: Later
        return;

        const doc = this.relationshipMap.getDocument(webviewId);
        const element = doc?.querySelector(
            `[${EditorAttributes.DATA_ONLOOK_DOM_ID}='${newNode.domId}']`,
        );
        if (!element) {
            console.warn('Failed to replaceElement: Element not found');
            return;
        }

        const parent = element.parentElement;
        if (!parent) {
            console.warn('Failed to replaceElement: Parent not found');
            return;
        }

        const rootNode = this.relationshipMap.getRootLayer(webviewId);
        if (!rootNode) {
            console.warn('Failed to replaceElement: Root node not found');
            return;
        }

        const parentDomId = parent.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) as string;
        const parentNode = this.findInLayersTree(parentDomId, rootNode);
        if (!parentNode || !parentNode.children) {
            console.warn('Failed to replaceElement: Parent node not found');
            return;
        }

        const index = parentNode.children?.findIndex((child) => child.domId === newNode.domId);
        if (index !== -1) {
            parentNode.children[index] = newNode;
        } else {
            parentNode.children = parentNode.children?.filter(
                (child) => child.domId !== newNode.domId,
            );
        }

        newNode.parent = parentNode;

        this.processNode(webviewId, parentNode);
    }

    findInLayersTree(domId: string, node: LayerNode | undefined): LayerNode | undefined {
        if (!node) {
            return;
        }
        if (node.domId === domId) {
            return node;
        }
        if (!node.children) {
            return undefined;
        }
        for (const child of node.children) {
            const found = this.findInLayersTree(domId, child);
            if (found) {
                return found;
            }
        }
    }

    getAnyTemplateNode(selector: string): TemplateNode | undefined {
        return this.getInstance(selector) || this.getRoot(selector);
    }

    getInstance(selector: string): TemplateNode | undefined {
        return this.relationshipMap.getTemplateInstance(selector);
    }

    getRoot(selector: string): TemplateNode | undefined {
        return this.relationshipMap.getTemplateRoot(selector);
    }

    getWebviewId(domId: string): string | undefined {
        return this.relationshipMap.getWebviewId(domId);
    }

    processNode(webviewId: string, node: LayerNode) {
        this.dfs(node, (n) => {
            this.processNodeForMap(webviewId, n);
        });
    }

    dfs(root: LayerNode, callback: (node: LayerNode) => void) {
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (!node) {
                continue;
            }
            callback(node);
            if (node.children) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    const childLayerNode = this.layerMap.get(node.children[i]);
                    if (childLayerNode) {
                        stack.push(childLayerNode);
                    }
                }
            }
        }
    }

    private async processNodeForMap(webviewId: string, node: LayerNode) {
        if (!node.oid) {
            console.warn('Failed to processNodeForMap: No oid found');
            return;
        }

        const templateNode = await this.getTemplateNodeById(node.oid);
        if (!templateNode) {
            console.warn('Failed to processNodeForMap: Template node not found');
            return;
        }

        this.findNodeInstance(webviewId, node, node, templateNode);
    }

    private async findNodeInstance(
        webviewId: string,
        originalNode: LayerNode,
        node: LayerNode,
        templateNode: TemplateNode,
    ) {
        const parent = this.layerMap.get(node.parent || '');
        if (!parent) {
            console.warn('Failed to findNodeInstance: Parent not found');
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
            const htmlParent = this.getNodeFromDomId(parent.domId, webviewId);
            if (!htmlParent) {
                console.warn('Failed to findNodeInstance: Parent node not found');
                return;
            }
            const children = htmlParent.querySelectorAll(
                `[${EditorAttributes.DATA_ONLOOK_ID}='${originalNode.oid}']`,
            );
            const htmlOriginalNode = this.getNodeFromDomId(originalNode.domId, webviewId);
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
                    webviewId,
                    originalNode.domId,
                    res.instanceId,
                    res.component,
                );
            } else {
                await this.findNodeInstance(webviewId, originalNode, parent, templateNode);
            }
        }
    }

    getNodeFromDomId(domId: string, webviewId: string): HTMLElement | null {
        const doc = this.relationshipMap.getDocument(webviewId);
        if (!doc) {
            console.warn('Failed to getNodeFromDomId: Document not found');
            return null;
        }
        return doc.querySelector(`[${EditorAttributes.DATA_ONLOOK_DOM_ID}='${domId}']`) || null;
    }

    async getTemplateNode(node: HTMLElement): Promise<TemplateNode | undefined> {
        const oid = node.getAttribute(EditorAttributes.DATA_ONLOOK_ID);
        if (!oid) {
            console.warn('Failed to getTemplateNode: No oid found');
            return;
        }
        return this.getTemplateNodeById(oid);
    }

    getTemplateNodeById(id: string): Promise<TemplateNode | undefined> {
        return invokeMainChannel(MainChannels.GET_TEMPLATE_NODE, { id });
    }

    updateElementInstance(webviewId: string, domId: string, instanceId: string, component: string) {
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.warn('Failed to updateElementInstanceId: Webview not found');
            return;
        }
        webview.executeJavaScript(
            `window.api?.updateElementInstance('${domId}', '${instanceId}', '${component}')`,
        );
    }

    clear() {
        this.relationshipMap = new AstRelationshipManager();
    }
}
