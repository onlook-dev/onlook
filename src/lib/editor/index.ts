import { handleConsoleMessage, handleIpcMessage } from '@/lib';
import { WebviewMetadata } from '@/lib/models';

interface WebviewContext {
    handlerRemovers: (() => void)[];
}

export class EditorManager {
    webviewMap: Map<string, WebviewContext> = new Map();

    eventHandlerMap = {
        'ipc-message': handleIpcMessage,
        'console-message': handleConsoleMessage,
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