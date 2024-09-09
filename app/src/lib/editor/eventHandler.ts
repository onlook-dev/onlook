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
            const layerTree = e.args[0] as LayerNode;
            const body = await this.editorEngine.dom.getBodyFromWebview(webview);
            this.editorEngine.dom.setDom(webview.id, body);
            this.editorEngine.ast.updateLayers([layerTree as any]);
        };
    }

    handleWindowResized() {
        return (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            this.editorEngine.elements.refreshSelectedElements(webview);
        };
    }

    handleWindowMutated() {
        return debounce(async (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            if (!e.args || e.args.length === 0) {
                console.error('No args found for window mutated event');
                return;
            }
            const { addedLayerNodes, removedSelectors } = e.args[0] as {
                addedLayerNodes: LayerNode[];
                removedSelectors: string[];
            };

            await this.editorEngine.dom.refreshAstDoc(webview);

            addedLayerNodes.forEach((layerNode: LayerNode) => {
                console.log('Added layer node', layerNode);
                this.editorEngine.ast.deleteOrReplaceElement(layerNode.id, layerNode);
            });

            removedSelectors.forEach((selector: string) => {
                console.log('Removed selector', selector);
                this.editorEngine.ast.deleteOrReplaceElement(selector);
            });
        }, 1000);
    }

    handleElementInserted() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for insert element event');
                return;
            }
            this.editorEngine.mode = EditorMode.DESIGN;
            const webview = e.target as Electron.WebviewTag;
            await this.editorEngine.dom.refreshAstDoc(webview);
            //  TODO: Process for map and update layers
            const domElement: DomElement = e.args[0];
            this.editorEngine.elements.click([domElement], webview);
        };
    }

    handleElementRemoved() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }

            const webview = e.target as Electron.WebviewTag;
            const domElement: DomElement = e.args[0];
            if (domElement.parent?.selector) {
                this.editorEngine.ast.deleteOrReplaceElement(domElement.parent?.selector);
                //  TODO: Process for map and update layers
            }

            await this.editorEngine.dom.refreshAstDoc(webview);
            this.editorEngine.clear();
        };
    }

    handleElementMoved() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }
            const webview = e.target as Electron.WebviewTag;
            const domElement: DomElement = e.args[0];
            if (domElement.parent?.selector) {
                this.editorEngine.ast.deleteOrReplaceElement(domElement.parent?.selector);
            }

            await this.editorEngine.dom.refreshAstDoc(webview);
            this.editorEngine.elements.click([domElement], webview);
        };
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
