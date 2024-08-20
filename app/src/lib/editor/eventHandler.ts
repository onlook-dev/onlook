import { debounce } from 'lodash';
import { EditorMode } from '../models';
import { EditorEngine } from './engine';
import { WebviewChannels } from '/common/constants';
import { DomElement } from '/common/models/element';

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
            const { added, removed } = e.args[0] as { added: string[]; removed: string[] };
            const body = await this.editorEngine.dom.getBodyFromWebview(webview);
            this.editorEngine.ast.setDoc(body.ownerDocument);

            added.forEach((selector: string) => {
                const element = body.querySelector(selector);
                if (!element) {
                    return;
                }
                this.editorEngine.ast.removeElement(element as HTMLElement);
            });

            removed.forEach((selector: string) => {
                const element = body.querySelector(selector);
                if (!element) {
                    return;
                }
                this.editorEngine.ast.removeElement(element as HTMLElement);
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
            const body = await this.editorEngine.dom.getBodyFromWebview(webview);
            this.editorEngine.ast.setDoc(body.ownerDocument);
            const domElement: DomElement = e.args[0];
            this.editorEngine.elements.click([domElement], webview);
        };
    }

    handleElementRemoved() {
        return async (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            const body = await this.editorEngine.dom.getBodyFromWebview(webview);
            this.editorEngine.ast.setDoc(body.ownerDocument);
            this.editorEngine.clear();
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
