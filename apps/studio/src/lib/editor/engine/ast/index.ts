import { invokeMainChannel } from '@/lib/utils';
import { EditorAttributes, MainChannels } from '@onlook/models/constants';
import type { LayerNode, TemplateNode } from '@onlook/models/element';
import type { WebviewTag } from 'electron';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

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

    async processNode(webviewId: string, node: LayerNode) {
        const updates = await invokeMainChannel<
            { webviewId: string; rootNode: LayerNode },
            WebviewUpdate[]
        >(MainChannels.PROCESS_NODE, {
            webviewId,
            rootNode: node,
        });

        await this.applyWebviewUpdates(webviewId, updates);
    }

    getElementFromDomId(domId: string, webviewId: string): HTMLElement | null {
        const doc = this.mappings.getMetadata(webviewId)?.document;
        if (!doc) {
            console.warn('Failed to getNodeFromDomId: Document not found');
            return null;
        }
        return doc.querySelector(`[${EditorAttributes.DATA_ONLOOK_DOM_ID}='${domId}']`) || null;
    }

    clear() {
        this.layersManager.clear();
    }

    async refreshAstDoc(webview: WebviewTag) {
        const root = await this.getBodyFromWebview(webview);
        this.mappings.updateDocument(webview.id, root.ownerDocument);
    }

    async getBodyFromWebview(webview: WebviewTag) {
        const htmlString = await webview.executeJavaScript('document.documentElement.outerHTML');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        return doc.body;
    }

    private async applyWebviewUpdates(webviewId: string, updates: WebviewUpdate[]) {
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.warn('Failed to apply updates: Webview not found');
            return;
        }

        for (const update of updates) {
            if (update.type === 'setElementType') {
                await webview.executeJavaScript(
                    `window.api?.setElementType(
                    '${update.domId}',
                    ${update.data.dynamicType ? `'${update.data.dynamicType}'` : 'undefined'},
                    ${update.data.coreElementType ? `'${update.data.coreElementType}'` : 'undefined'}
                )`,
                );
            } else if (update.type === 'updateElementInstance') {
                await webview.executeJavaScript(
                    `window.api?.updateElementInstance(
                    '${update.domId}',
                    '${update.data.instanceId}',
                    '${update.data.component}'
                )`,
                );
            }
        }
    }
}
