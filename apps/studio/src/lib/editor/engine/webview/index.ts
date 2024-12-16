import type { ProjectsManager } from '@/lib/projects';
import { RunState } from '@onlook/models/run';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { isOnlookInDoc } from '/common/helpers';

export enum WebviewState {
    NOT_RUNNING,
    RUNNING_NO_DOM,
    DOM_NO_ONLOOK,
    DOM_ONLOOK_ENABLED,
}

interface WebviewData {
    webview: Electron.WebviewTag;
    selected: boolean;
    state: WebviewState;
}

const DEFAULT_DATA = {
    selected: false,
    state: WebviewState.NOT_RUNNING,
};

export class WebviewManager {
    private webviewIdToData: Map<string, WebviewData> = new Map();

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this, {});
    }

    get webviews() {
        return this.webviewIdToData;
    }

    get selected() {
        return Array.from(this.webviewIdToData.values())
            .filter((w) => w.selected)
            .map((w) => w.webview);
    }

    getAll() {
        return Array.from(this.webviewIdToData.values()).map((w) => w.webview);
    }

    getWebview(id: string): Electron.WebviewTag | undefined {
        return this.webviewIdToData.get(id)?.webview;
    }

    register(webview: Electron.WebviewTag) {
        this.webviewIdToData.set(webview.id, { webview, ...DEFAULT_DATA });
    }

    deregister(webview: Electron.WebviewTag) {
        this.webviewIdToData.delete(webview.id);
        this.editorEngine.ast.mappings.remove(webview.id);
    }

    deregisterAll() {
        this.webviewIdToData.clear();
    }

    isSelected(id: string) {
        return this.webviewIdToData.get(id)?.selected ?? false;
    }

    select(webview: Electron.WebviewTag) {
        const data = this.webviewIdToData.get(webview.id) || { webview, ...DEFAULT_DATA };
        data.selected = true;
        this.webviewIdToData.set(webview.id, data);
        this.notify();
    }

    deselect(webview: Electron.WebviewTag) {
        const data = this.webviewIdToData.get(webview.id) || { webview, ...DEFAULT_DATA };
        data.selected = false;
        this.webviewIdToData.set(webview.id, data);
        this.notify();
    }

    deselectAll() {
        for (const [id, data] of this.webviewIdToData) {
            this.webviewIdToData.set(id, { ...data, selected: false });
        }
        this.notify();
    }

    private notify() {
        this.webviewIdToData = new Map(this.webviewIdToData);
    }

    getState(id: string) {
        return this.webviewIdToData.get(id)?.state ?? WebviewState.NOT_RUNNING;
    }

    setState(webview: Electron.WebviewTag, state: WebviewState) {
        const data = this.webviewIdToData.get(webview.id) || { webview, ...DEFAULT_DATA };
        data.state = state;
        this.webviewIdToData.set(webview.id, data);
    }

    computeState(body: Element) {
        const running: boolean = this.projectsManager.runner?.state === RunState.RUNNING || false;
        if (!running) {
            return WebviewState.NOT_RUNNING;
        }
        const doc = body.ownerDocument;
        const hasElements = body.children.length > 0;
        if (!hasElements) {
            return WebviewState.RUNNING_NO_DOM;
        }

        const hasOnlook = isOnlookInDoc(doc);
        if (hasOnlook) {
            return WebviewState.DOM_ONLOOK_ENABLED;
        }
        return WebviewState.DOM_NO_ONLOOK;
    }
}
