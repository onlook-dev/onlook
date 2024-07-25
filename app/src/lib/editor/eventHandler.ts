import { DomElement, WebViewElement } from 'common/models/element';
import { EditorEngine } from './engine';
import { WebviewChannels } from '/common/constants';

export class WebviewEventHandler {
    eventCallbacks: Record<string, (e: any) => void>;
    editorEngine: EditorEngine;

    constructor(editorEngine: EditorEngine) {
        this.handleIpcMessage = this.handleIpcMessage.bind(this);
        this.handleConsoleMessage = this.handleConsoleMessage.bind(this);
        this.editorEngine = editorEngine;
        this.eventCallbacks = {
            mouseover: this.handleMouseover(),
            click: this.handleClick(),
            resize: this.handleResize(),
            [WebviewChannels.STYLE_UPDATED]: this.handleStyleUpdated(),
        };
    }

    getElementMetadata(el: DomElement, webview: Electron.WebviewTag): WebViewElement {
        return {
            ...el,
            webviewId: webview.id,
        };
    }

    getMouseEventResults(e: Electron.IpcMessageEvent): {
        els: WebViewElement[];
        webview: Electron.WebviewTag;
    } {
        const webview = e.target as Electron.WebviewTag;
        const els: DomElement[] = JSON.parse(e.args[0]);
        if (!els || els.length === 0) {
            console.error('No elements found for mouseover event');
            return { els: [], webview };
        }
        const elsWithId = els.map((el) => {
            return this.getElementMetadata(el, webview);
        });
        return { els: elsWithId, webview };
    }

    handleMouseover() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }
            const { els, webview } = this.getMouseEventResults(e);
            this.editorEngine.mouseover(els, webview);
        };
    }

    handleClick() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }

            const { els, webview } = this.getMouseEventResults(e);
            this.editorEngine.click(els, webview);
        };
    }

    handleResize() {
        return (e: Electron.IpcMessageEvent) => {
            const webview = e.target as Electron.WebviewTag;
            this.editorEngine.refreshClickedElements(webview);
        };
    }

    handleStyleUpdated() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for style-updated event');
                return;
            }
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
