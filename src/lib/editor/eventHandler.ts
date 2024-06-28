import { ElementMetadata } from 'common/models';
import { EditorEngine } from './engine';

export class WebviewEventHandler {
    eventCallbackMap: Record<string, (e: any) => void>
    editorEngine: EditorEngine;

    constructor(editorEngine: EditorEngine) {
        this.handleIpcMessage = this.handleIpcMessage.bind(this);
        this.handleConsoleMessage = this.handleConsoleMessage.bind(this);
        this.editorEngine = editorEngine;
        this.eventCallbackMap = {
            'mouseover': this.handleMouseover(),
            'click': this.handleClick(),
            'wheel': this.handleScroll(),
            'scroll': this.handleScroll()
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

    handleMouseover() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }

            const webview = e.target as Electron.WebviewTag;
            const elementMetadata: ElementMetadata = JSON.parse(e.args[0]);
            this.editorEngine.mouseover(elementMetadata, webview);
        };
    }

    handleClick() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }

            const webview = e.target as Electron.WebviewTag;
            const elementMetadata: ElementMetadata = JSON.parse(e.args[0]);
            this.editorEngine.click(elementMetadata, webview);
        };
    }

    handleIpcMessage(e: Electron.IpcMessageEvent) {
        const eventHandler = this.eventCallbackMap[e.channel]
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
