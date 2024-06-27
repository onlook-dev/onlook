import { WebviewMetadata } from '@/lib/models';
import { WebviewEventHandler } from './eventHandler';

interface WebviewContext {
    handlerRemovers: (() => void)[];
}

export class WebviewMessageBridge {
    webviewMap: Map<string, WebviewContext> = new Map();
    eventHandlerMap: Record<string, (e: any) => void>;

    constructor(webviewEventHandler: WebviewEventHandler) {
        this.eventHandlerMap = {
            'ipc-message': webviewEventHandler.handleIpcMessage,
            'console-message': webviewEventHandler.handleConsoleMessage,
        }
    }

    registerWebView(webview: Electron.WebviewTag, metadata: WebviewMetadata) {
        const handlerRemovers: (() => void)[] = [];
        Object.entries(this.eventHandlerMap).forEach(([event, handler]) => {
            webview.addEventListener(event, handler as any);
            handlerRemovers.push(() => {
                webview.removeEventListener(event, handler as any);
            });
        });
        this.webviewMap.set(metadata.id, { handlerRemovers });
    }

    deregisterWebView(webview: Electron.WebviewTag) {
        const context = this.webviewMap.get(webview.id);
        if (!context)
            return;
        context.handlerRemovers.forEach((removeHandler) => removeHandler());
        this.webviewMap.delete(webview.id);
    }
}