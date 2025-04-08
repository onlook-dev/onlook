import { WebviewChannels } from '@onlook/models/constants';
import type { DomElement, LayerNode } from '@onlook/models/element';
import { debounce } from 'lodash';
import { EditorMode } from '../models';
import type { EditorEngine } from './engine';

export class WebviewEventHandler {
    private eventCallbacks: Record<string, (e: any) => void>;
    private debouncedHandlers: Array<() => void> = [];

    constructor(private editorEngine: EditorEngine) {
        this.handleIpcMessage = this.handleIpcMessage.bind(this);
        this.handleConsoleMessage = this.handleConsoleMessage.bind(this);
        this.eventCallbacks = {
            [WebviewChannels.WINDOW_RESIZED]: this.handleWindowResized(),
            [WebviewChannels.WINDOW_MUTATED]: this.handleWindowMutated(),
            [WebviewChannels.STYLE_UPDATED]: this.handleStyleUpdated(),
            [WebviewChannels.ELEMENT_INSERTED]: this.handleElementInserted(),
            [WebviewChannels.ELEMENT_REMOVED]: this.handleElementRemoved(),
            [WebviewChannels.ELEMENT_MOVED]: this.handleElementMoved(),
            [WebviewChannels.ELEMENT_GROUPED]: this.handleElementGrouped(),
            [WebviewChannels.ELEMENT_UNGROUPED]: this.handleElementUngrouped(),
            [WebviewChannels.ELEMENT_TEXT_EDITED]: this.handleElementTextEdited(),
            [WebviewChannels.DOM_PROCESSED]: this.handleDomProcessed(),
            [WebviewChannels.GET_WEBVIEW_ID]: this.handleGetWebviewId(),
        };
    }

    handleDomProcessed() {
        return async (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            if (!e.args || e.args.length === 0) {
                console.error('No args found for dom ready event');
                return;
            }
            const { layerMap, rootNode } = e.args[0] as {
                layerMap: Record<string, LayerNode>;
                rootNode: LayerNode;
            };
            const processedLayerMap = new Map(Object.entries(layerMap));
            const body = await this.editorEngine.ast.getBodyFromWebview(webview);
            this.editorEngine.ast.setMapRoot(webview.id, body, rootNode, processedLayerMap);
        };
    }

    handleWindowResized() {
        return (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            this.editorEngine.elements.refreshSelectedElements(webview);
        };
    }

    handleWindowMutated() {
        const handler = async (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            if (!e.args || e.args.length === 0) {
                console.error('No args found for window mutated event');
                return;
            }
            const { added, removed } = e.args[0] as {
                added: Record<string, LayerNode>;
                removed: Record<string, LayerNode>;
            };
            await this.editorEngine.ast.refreshAstDoc(webview);
            const newMap = new Map([...Object.entries(added), ...Object.entries(removed)]);
            this.editorEngine.ast.updateMap(webview.id, newMap, null);
        };

        const debouncedHandler = debounce(handler, 1000, { leading: true, trailing: true });
        this.debouncedHandlers.push(() => debouncedHandler.cancel());
        return debouncedHandler;
    }

    handleElementInserted() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for insert element event');
                return;
            }
            const { domEl, layerMap, editText } = e.args[0] as {
                domEl: DomElement;
                layerMap: Map<string, LayerNode>;
                editText: boolean;
            };
            const webview = e.target as Electron.WebviewTag;

            if (!webview) {
                console.error('No webview found for insert element event');
                return;
            }

            await this.refreshAndClickMutatedElement(domEl, layerMap, webview);

            if (editText) {
                this.editorEngine.text.start(domEl, webview);
            }
        };
    }

    handleElementRemoved() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }
            const { parentDomEl, layerMap } = e.args[0] as {
                parentDomEl: DomElement;
                layerMap: Map<string, LayerNode>;
            };
            const webview = e.target as Electron.WebviewTag;
            this.refreshAndClickMutatedElement(parentDomEl, layerMap, webview);
        };
    }

    handleElementTextEdited() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }
            const { domEl, layerMap } = e.args[0] as {
                domEl: DomElement;
                layerMap: Map<string, LayerNode>;
            };
            const webview = e.target as Electron.WebviewTag;
            this.refreshAndClickMutatedElement(domEl, layerMap, webview);
        };
    }

    handleElementMoved() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }
            const { domEl, layerMap } = e.args[0] as {
                domEl: DomElement;
                layerMap: Map<string, LayerNode>;
            };
            const webview = e.target as Electron.WebviewTag;
            this.refreshAndClickMutatedElement(domEl, layerMap, webview);
        };
    }

    handleElementGrouped() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }
            const { domEl, layerMap } = e.args[0] as {
                domEl: DomElement;
                layerMap: Map<string, LayerNode>;
            };
            const webview = e.target as Electron.WebviewTag;
            this.refreshAndClickMutatedElement(domEl, layerMap, webview);
        };
    }

    handleElementUngrouped() {
        return async (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for move element event');
                return;
            }
            const { parentEl, layerMap } = e.args[0] as {
                parentEl: DomElement;
                layerMap: Map<string, LayerNode>;
            };
            const webview = e.target as Electron.WebviewTag;
            this.refreshAndClickMutatedElement(parentEl, layerMap, webview);
        };
    }

    async refreshAndClickMutatedElement(
        domEl: DomElement,
        newMap: Map<string, LayerNode>,
        webview: Electron.WebviewTag,
    ) {
        this.editorEngine.mode = EditorMode.DESIGN;
        await this.editorEngine.ast.refreshAstDoc(webview);
        this.editorEngine.elements.click([domEl], webview);
        this.editorEngine.ast.updateMap(webview.id, newMap, domEl.domId);
    }

    handleStyleUpdated() {
        const handler = (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for style updated event');
                return;
            }

            const { domEl } = e.args[0] as { domEl: DomElement };
            const webview = e.target as Electron.WebviewTag;
            this.editorEngine.elements.click([domEl], webview);
        };

        const debouncedHandler = debounce(handler, 100, { leading: true, trailing: true });
        this.debouncedHandlers.push(() => debouncedHandler.cancel());
        return debouncedHandler;
    }

    handleGetWebviewId() {
        return async (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            await webview.executeJavaScript(`window.api.setWebviewId('${webview.id}')`);
            await webview.executeJavaScript(`window.api.processDom()`);
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

    dispose() {
        // Clean up debounced handlers
        this.debouncedHandlers.forEach((cancel) => cancel());
        this.debouncedHandlers = [];

        // Clean up event callbacks
        Object.keys(this.eventCallbacks).forEach((channel) => {
            // Remove the callback from any event listeners
            delete this.eventCallbacks[channel];
        });

        // Clear references
        this.eventCallbacks = {};
        this.editorEngine = null as any;
    }
}
