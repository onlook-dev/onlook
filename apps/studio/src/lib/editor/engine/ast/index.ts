import { invokeMainChannel } from '@/lib/utils';
import { EditorAttributes, MainChannels } from '@onlook/models/constants';
import type { LayerNode, TemplateNode } from '@onlook/models/element';
import type { WebviewTag } from 'electron';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { LayersManager } from './layers';

export class AstManager {
    private layersManager: LayersManager = new LayersManager();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get mappings() {
        return this.layersManager;
    }

    setMapRoot(
        webviewId: string,
        root: Element,
        rootNode: LayerNode,
        layerMap: Map<string, LayerNode>,
    ) {
        this.mappings.setMetadata(webviewId, root.ownerDocument, rootNode, layerMap);
        this.processNode(webviewId, rootNode);
    }

    updateMap(webviewId: string, newMap: Map<string, LayerNode>, domId: string | null) {
        this.mappings.addNewMapping(webviewId, newMap);
        const node = domId ? this.mappings.getLayerNode(webviewId, domId) : null;
        if (!node) {
            console.warn('Failed to replaceElement: Node not found');
            return;
        }
        this.processNode(webviewId, node);
    }

    // Constants for batching and timing
    private readonly NODE_BATCH_SIZE = 50;
    private readonly DOM_BATCH_SIZE = 20;
    private readonly IDLE_TIMEOUT = 100;

    // Queue for batching DOM updates
    private domUpdateQueue: Array<{ webviewId: string; script: string }> = [];
    private processingQueue = false;
    private batchTimeout: ReturnType<typeof setTimeout> | null = null;

    async processNode(webviewId: string, node: LayerNode) {
        const stack = [node];
        while (stack.length > 0) {
            await new Promise<void>((resolve) => {
                if ('requestIdleCallback' in window) {
                    window.requestIdleCallback(
                        () => {
                            this.processNodeChunk(webviewId, stack);
                            resolve();
                        },
                        { timeout: this.IDLE_TIMEOUT },
                    );
                } else {
                    // Fallback for browsers without requestIdleCallback
                    setTimeout(() => {
                        this.processNodeChunk(webviewId, stack);
                        resolve();
                    }, 0);
                }
            });
        }
        // Process any remaining DOM updates
        await this.processDomUpdateQueue();
    }

    private processNodeChunk(webviewId: string, stack: LayerNode[]) {
        const chunk = stack.splice(0, this.NODE_BATCH_SIZE);
        for (const node of chunk) {
            this.processNodeForMapSafe(webviewId, node);
            if (node.children) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    const childLayerNode = this.mappings.getLayerNode(webviewId, node.children[i]);
                    if (childLayerNode) {
                        stack.push(childLayerNode);
                    }
                }
            }
        }
    }

    private processNodeForMapSafe(webviewId: string, node: LayerNode) {
        setTimeout(() => {
            this.processNodeForMap(webviewId, node);
        }, 0);
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

        // Check if node needs type assignment
        const hasSpecialType = templateNode.dynamicType || templateNode.coreElementType;
        if (!hasSpecialType) {
            this.findNodeInstance(webviewId, node, node, templateNode);
            return;
        }

        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.warn('Failed: Webview not found');
            return;
        }

        if (templateNode.dynamicType) {
            node.dynamicType = templateNode.dynamicType;
        }

        if (templateNode.coreElementType) {
            node.coreElementType = templateNode.coreElementType;
        }

        // Queue the DOM update instead of executing immediately
        this.queueDomUpdate(
            webviewId,
            `window.api?.setElementType(
            '${node.domId}', 
            ${templateNode.dynamicType ? `'${templateNode.dynamicType}'` : 'undefined'}, 
            ${templateNode.coreElementType ? `'${templateNode.coreElementType}'` : 'undefined'}
        )`,
        );

        this.findNodeInstance(webviewId, node, node, templateNode);
    }

    private queueDomUpdate(webviewId: string, script: string) {
        this.domUpdateQueue.push({ webviewId, script });
        this.scheduleDomUpdateProcessing();
    }

    private scheduleDomUpdateProcessing() {
        if (this.processingQueue) {
            return;
        }
        this.processingQueue = true;

        // Clear any existing timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }

        // Schedule batch processing
        this.batchTimeout = setTimeout(() => {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(() => this.processDomUpdateQueue(), {
                    timeout: this.IDLE_TIMEOUT,
                });
            } else {
                this.processDomUpdateQueue();
            }
        }, this.IDLE_TIMEOUT);
    }

    private async processDomUpdateQueue() {
        if (this.domUpdateQueue.length === 0) {
            this.processingQueue = false;
            this.batchTimeout = null;
            return;
        }

        const batch = this.domUpdateQueue.splice(0, this.DOM_BATCH_SIZE);
        const batchesByWebview = new Map<string, string[]>();

        // Group updates by webview for efficient processing
        for (const update of batch) {
            if (!batchesByWebview.has(update.webviewId)) {
                batchesByWebview.set(update.webviewId, []);
            }
            batchesByWebview.get(update.webviewId)?.push(update.script);
        }

        // Process each webview's updates in a single executeJavaScript call
        for (const [webviewId, scripts] of batchesByWebview) {
            const webview = this.editorEngine.webviews.getWebview(webviewId);
            if (webview) {
                try {
                    await webview.executeJavaScript(`(async () => { ${scripts.join(';')} })()`);
                } catch (error) {
                    console.warn('Failed to execute batch update:', error);
                }
            }
        }

        // Schedule processing of remaining updates with delay
        if (this.domUpdateQueue.length > 0) {
            this.processingQueue = false;
            this.scheduleDomUpdateProcessing();
        } else {
            this.processingQueue = false;
            this.batchTimeout = null;
        }
    }

    private async findNodeInstance(
        webviewId: string,
        originalNode: LayerNode,
        node: LayerNode,
        templateNode: TemplateNode,
    ) {
        if (node.tagName === 'body') {
            return;
        }
        if (!node.parent) {
            console.warn('Failed to findNodeInstance: Parent id not found');
            return;
        }

        const parent = this.mappings.getLayerNode(webviewId, node.parent);
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
            const htmlParent = this.getElementFromDomId(parent.domId, webviewId);
            if (!htmlParent) {
                console.warn('Failed to findNodeInstance: Parent node not found');
                return;
            }
            const children = htmlParent.querySelectorAll(
                `[${EditorAttributes.DATA_ONLOOK_ID}='${originalNode.oid}']`,
            );
            const htmlOriginalNode = this.getElementFromDomId(originalNode.domId, webviewId);
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
                this.queueDomUpdate(
                    webviewId,
                    `window.api?.updateElementInstance('${originalNode.domId}', '${res.instanceId}', '${res.component}')`,
                );
            } else {
                await this.findNodeInstance(webviewId, originalNode, parent, templateNode);
            }
        }
    }

    private getElementFromDomId(domId: string, webviewId: string): HTMLElement | null {
        const doc = this.mappings.getMetadata(webviewId)?.document;
        if (!doc) {
            console.warn('Failed to getNodeFromDomId: Document not found');
            return null;
        }
        return doc.querySelector(`[${EditorAttributes.DATA_ONLOOK_DOM_ID}='${domId}']`) || null;
    }

    private async getTemplateNodeById(oid: string | null): Promise<TemplateNode | null> {
        if (!oid) {
            console.warn('Failed to getTemplateNodeById: No oid found');
            return null;
        }
        return invokeMainChannel(MainChannels.GET_TEMPLATE_NODE, { id: oid });
    }

    private updateElementInstance(
        webviewId: string,
        domId: string,
        instanceId: string,
        component: string,
    ) {
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
        this.layersManager.clear();
    }

    async refreshAstDoc(webview: WebviewTag) {
        const root = await this.getBodyFromWebview(webview);
        this.mappings.updateDocument(webview.id, root.ownerDocument);
    }

    private async getBodyFromWebview(webview: WebviewTag) {
        const htmlString = await webview.executeJavaScript('document.documentElement.outerHTML');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        return doc.body;
    }
}
