import { ElementMetadata } from 'common/models';
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
            wheel: this.handleScroll(),
            scroll: this.handleScroll(),
            [WebviewChannels.STYLE_UPDATED]: this.handleStyleUpdated(),
        };
    }

    getMouseEventArgs(e: Electron.IpcMessageEvent): {
        elementMetadata: ElementMetadata;
        webview: Electron.WebviewTag;
    } {
        const webview = e.target as Electron.WebviewTag;
        const elementMetadata: ElementMetadata = JSON.parse(e.args[0]);
        const metadataWithId = { ...elementMetadata, webviewId: webview.id };
        return { elementMetadata: metadataWithId, webview };
    }

    handleMouseover() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }
            const { elementMetadata: metadataWithId, webview } = this.getMouseEventArgs(e);
            this.editorEngine.mouseover(metadataWithId, webview);
        };
    }

    handleClick() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }

            const { elementMetadata: metadataWithId, webview } = this.getMouseEventArgs(e);
            this.editorEngine.click(metadataWithId, webview);
        };
    }

    handleScroll() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }
            const webview = e.target as Electron.WebviewTag;
            this.editorEngine.scroll(webview);
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
