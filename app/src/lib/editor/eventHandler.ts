import { debounce } from 'lodash';
import { EditorMode } from '../models';
import { EditorEngine } from './engine';
import { WebviewChannels } from '/common/constants';
import { DomElement } from '/common/models/element';
import { LayerNode } from '/common/models/element/layers';

export class WebviewEventHandler {
    eventCallbacks: Record<string, (e: any) => void>;
    editorEngine: EditorEngine;

    constructor(editorEngine: EditorEngine) {
        this.handleIpcMessage = this.handleIpcMessage.bind(this);
        this.handleConsoleMessage = this.handleConsoleMessage.bind(this);
        this.editorEngine = editorEngine;
        this.eventCallbacks = {
            [WebviewChannels.WINDOW_RESIZED]: this.handleWindowResized(),
            [WebviewChannels.WINDOW_MUTATED]: this.handleWindowMutated(),
            [WebviewChannels.STYLE_UPDATED]: this.handleStyleUpdated(),
            [WebviewChannels.ELEMENT_INSERTED]: this.handleElementInserted(),
            [WebviewChannels.ELEMENT_REMOVED]: this.handleElementRemoved(),
            [WebviewChannels.ELEMENT_MOVED]: this.handleElementMoved(),
            [WebviewChannels.DOM_READY]: this.handleDomReady(),
        };
    }

    handleDomReady() {
        return async (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            if (!e.args || e.args.length === 0) {
                console.error('No args found for dom ready event');
                return;
            }
            this.editorEngine.ast.clear();
            const body = await this.editorEngine.dom.getBodyFromWebview(webview);
            this.editorEngine.dom.setDom(webview.id, body);
            const layerTree = e.args[0] as LayerNode;
            this.editorEngine.ast.updateLayers([layerTree as LayerNode]);
        };
    }

    handleWindowResized() {
        return (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            this.editorEngine.elements.refreshSelectedElements(webview);
        };
    }

    handleWindowMutated() {
        return debounce(
            async (e: Electron.IpcMessageEvent) => {
                const webview = e.target as Electron.WebviewTag;
                if (!e.args || e.args.length === 0) {
                    console.error('No args found for window mutated event');
                    return;
                }
                const { added, removed } = e.args[0] as {
                    added: LayerNode[];
                    removed: LayerNode[];
                };
                await this.editorEngine.dom.refreshAstDoc(webview);
                [...added, ...removed].forEach((layerNode: LayerNode) => {
                    this.editorEngine.ast.replaceElement(layerNode.id, layerNode);
                });
            },
            1000,
            { leading: true, trailing: true },
        );
    }

    handleElementInserted() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for insert element event');
                return;
            }
            const { domEl, layerNode } = e.args[0] as {
                domEl: DomElement;
                layerNode: LayerNode;
            };
            const webview = e.target as Electron.WebviewTag;
            this.refreshAndClickMutatedElement(domEl, layerNode, webview);
        };
    }

    handleElementRemoved() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }
            const { parentDomEl, layerNode } = e.args[0] as {
                parentDomEl: DomElement;
                layerNode: LayerNode;
            };
            const webview = e.target as Electron.WebviewTag;
            this.refreshAndClickMutatedElement(parentDomEl, layerNode, webview);
        };
    }

    handleElementMoved() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }
            const { domEl, parentLayerNode } = e.args[0] as {
                domEl: DomElement;
                parentLayerNode: LayerNode;
            };
            const webview = e.target as Electron.WebviewTag;
            this.refreshAndClickMutatedElement(domEl, parentLayerNode, webview);
        };
    }

    async refreshAndClickMutatedElement(
        domEl: DomElement,
        layerNode: LayerNode,
        webview: Electron.WebviewTag,
    ) {
        this.editorEngine.mode = EditorMode.DESIGN;
        await this.editorEngine.dom.refreshAstDoc(webview);
        this.editorEngine.ast.replaceElement(layerNode.id, layerNode);
        this.editorEngine.elements.click([domEl], webview);
    }

    handleStyleUpdated() {
        return (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            this.editorEngine.handleStyleUpdated(webview);
        };
    }

    handleIpcMessage(e: Electron.IpcMessageEvent) {
        const eventHandler = this.eventCallbacks[e.channel];
        if (!eventHandler) {
            console.error(`No event handler found for ${e.channel}`);
            return;
        }
        eventHandler(e);
    }

    handleConsoleMessage(e: Electron.ConsoleMessageEvent) {
        console.log(`%c ${e.message}`, 'background: #000; color: #AAFF00');
    }
}
