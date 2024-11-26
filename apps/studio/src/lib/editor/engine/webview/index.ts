import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

interface WebviewState {
    webview: Electron.WebviewTag;
    selected: boolean;
}

export class WebviewManager {
    private webviewMap: Map<string, WebviewState> = new Map();

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this, {});
    }

    get webviews() {
        return this.webviewMap;
    }

    get selected() {
        return Array.from(this.webviewMap.values())
            .filter((w) => w.selected)
            .map((w) => w.webview);
    }

    getAll() {
        return Array.from(this.webviewMap.values()).map((w) => w.webview);
    }

    getWebview(id: string): Electron.WebviewTag | undefined {
        return this.webviewMap.get(id)?.webview;
    }

    register(webview: Electron.WebviewTag) {
        this.webviewMap.set(webview.id, { webview, ...this.defaultState });
    }

    deregister(webview: Electron.WebviewTag) {
        this.webviewMap.delete(webview.id);
        this.editorEngine.ast.mappings.remove(webview.id);
    }

    deregisterAll() {
        this.webviewMap.clear();
    }

    isSelected(id: string) {
        return this.webviewMap.get(id)?.selected ?? false;
    }

    select(webview: Electron.WebviewTag) {
        const state = this.webviewMap.get(webview.id) || { webview, ...this.defaultState };
        state.selected = true;
        this.webviewMap.set(webview.id, state);
    }

    deselect(webview: Electron.WebviewTag) {
        const state = this.webviewMap.get(webview.id) || { webview, ...this.defaultState };
        state.selected = false;
        this.webviewMap.set(webview.id, state);
    }

    get defaultState() {
        return {
            selected: false,
        };
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
