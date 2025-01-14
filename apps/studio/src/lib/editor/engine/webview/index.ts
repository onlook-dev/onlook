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

type StateObserver = (state: WebviewState) => void;

export class WebviewManager {
    private webviewIdToData: Map<string, WebviewData> = new Map();
    private stateObservers: Map<string, Set<StateObserver>> = new Map();
    private disposers: Array<() => void> = [];

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
        this.disposeWebview(webview.id);
    }

    deregisterAll() {
        this.webviewIdToData.clear();
    }

    isSelected(id: string) {
        return this.webviewIdToData.get(id)?.selected ?? false;
    }

    select(webview: Electron.WebviewTag) {
        const data = this.webviewIdToData.get(webview.id);
        if (data) {
            data.selected = true;
            this.webviewIdToData.set(webview.id, data);
            this.notify();
        }
    }

    deselect(webview: Electron.WebviewTag) {
        const data = this.webviewIdToData.get(webview.id);
        if (data) {
            data.selected = false;
            this.webviewIdToData.set(webview.id, data);
            this.notify();
        }
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
        const data = this.webviewIdToData.get(webview.id);
        if (data) {
            data.state = state;
            this.webviewIdToData.set(webview.id, data);
            this.notifyStateObservers(webview.id);
        }
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

    observeState(id: string, observer: StateObserver): void {
        if (!this.stateObservers.has(id)) {
            this.stateObservers.set(id, new Set());
        }
        this.stateObservers.get(id)!.add(observer);
    }

    unobserveState(id: string, observer: StateObserver): void {
        this.stateObservers.get(id)?.delete(observer);
        if (this.stateObservers.get(id)?.size === 0) {
            this.stateObservers.delete(id);
        }
    }

    private notifyStateObservers(id: string): void {
        const state = this.getState(id);
        if (!state) {
            return;
        }

        this.stateObservers.get(id)?.forEach((observer) => {
            observer(state);
        });
    }

    dispose() {
        // Clean up all webview data
        this.deregisterAll();

        // Clean up all state observers
        this.stateObservers.clear();

        // Run all disposers
        this.disposers.forEach((dispose) => dispose());
        this.disposers = [];

        // Clear references
        this.editorEngine = null as any;
        this.projectsManager = null as any;
    }

    disposeWebview(id: string) {
        // Remove webview data
        this.webviewIdToData.delete(id);

        // Clean up observers for this webview
        this.stateObservers.delete(id);

        // Clean up AST mappings
        this.editorEngine?.ast?.mappings?.remove(id);
    }
}
