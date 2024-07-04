import { makeAutoObservable } from "mobx";

interface WebviewState {
    webview: Electron.WebviewTag;
    selected: boolean;
}

export class WebviewManager {
    private webviewMap: Map<string, WebviewState> = new Map();

    constructor() {
        makeAutoObservable(this, {});
    }

    get webviews() {
        return this.webviewMap;
    }

    getAll() {
        return Array.from(this.webviewMap.values()).map((w) => w.webview);
    }

    get(id: string): Electron.WebviewTag | undefined {
        return this.webviewMap.get(id)?.webview;
    }

    register(webview: Electron.WebviewTag) {
        this.webviewMap.set(webview.id, { webview, selected: false });
    }

    deregister(webview: Electron.WebviewTag) {
        this.webviewMap.delete(webview.id);
    }

    deregisterAll() {
        this.webviewMap.clear();
    }

    isSelected(id: string) {
        return this.webviewMap.get(id)?.selected ?? false;
    }

    select(webview: Electron.WebviewTag) {
        this.webviewMap.set(webview.id, { webview, selected: true });
    }

    deselect(webview: Electron.WebviewTag) {
        this.webviewMap.set(webview.id, { webview, selected: false });
    }

    deselectAll() {
        for (const [id, state] of this.webviewMap) {
            this.webviewMap.set(id, { ...state, selected: false });
        }
    }

    notify() {
        this.webviewMap = new Map(this.webviewMap);
    }
}