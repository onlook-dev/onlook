export class WebviewManager {
    private webviewMap: Map<string, Electron.WebviewTag> = new Map();

    getAll() {
        return this.webviewMap;
    }

    get(id: string) {
        return this.webviewMap.get(id);
    }

    register(webview: Electron.WebviewTag) {
        this.webviewMap.set(webview.id, webview);
    }

    deregister(webview: Electron.WebviewTag) {
        this.webviewMap.delete(webview.id);
    }

    clear() {
        this.webviewMap.clear();
    }
}