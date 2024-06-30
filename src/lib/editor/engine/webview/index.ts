export class WebviewManager {
    private webviews: Map<string, Electron.WebviewTag> = new Map();

    register(webview: Electron.WebviewTag) {
        this.webviews.set(webview.id, webview);
    }

    deregister(webview: Electron.WebviewTag) {
        this.webviews.delete(webview.id);
    }

    get(id: string) {
        return this.webviews.get(id);
    }

    clear() {
        this.webviews.clear();
    }
}