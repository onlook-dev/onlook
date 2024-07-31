import debounce from 'lodash/debounce';
import { makeAutoObservable } from 'mobx';
import { CodeManager } from './code';
import { DomManager } from './dom';
import { HistoryManager } from './history';
import { OverlayManager } from './overlay';
import { EditorElementState } from './state';
import { WebviewManager } from './webview';
import { Action, ActionTarget } from '/common/actions';
import { WebviewChannels } from '/common/constants';
import { WebViewElement } from '/common/models/element';

export enum EditorMode {
    Design = 'Design',
    Interact = 'Interact',
}

export class EditorEngine {
    public scale: number = 0;

    private editorMode: EditorMode = EditorMode.Design;
    private elementState: EditorElementState = new EditorElementState();
    private overlayManager: OverlayManager = new OverlayManager();
    private webviewManager: WebviewManager = new WebviewManager();
    private codeManager: CodeManager = new CodeManager(this.webviewManager);
    private historyManager: HistoryManager = new HistoryManager();
    private domManager: DomManager = new DomManager();

    constructor() {
        makeAutoObservable(this);
    }

    get state() {
        return this.elementState;
    }
    get overlay() {
        return this.overlayManager;
    }
    get webviews() {
        return this.webviewManager;
    }
    get code() {
        return this.codeManager;
    }
    get mode() {
        return this.editorMode;
    }
    get history() {
        return this.historyManager;
    }

    get dom() {
        return this.domManager;
    }

    set mode(mode: EditorMode) {
        this.clear();
        this.editorMode = mode;
    }

    private updateStyle(targets: Array<ActionTarget>, style: string, value: string) {
        targets.forEach((elementMetadata) => {
            const webview = this.webviews.get(elementMetadata.webviewId);
            if (!webview) {
                return;
            }
            webview.send(WebviewChannels.UPDATE_STYLE, {
                selector: elementMetadata.selector,
                style: style,
                value: value,
            });
        });
    }

    private dispatchAction(action: Action) {
        switch (action.type) {
            case 'update-style':
                this.updateStyle(action.targets, action.style, action.change.updated);
        }
    }

    runAction(action: Action) {
        this.history.push(action);
        this.dispatchAction(action);
    }

    undo() {
        const action = this.history.undo();
        if (action == null) {
            return;
        }

        this.dispatchAction(action);
    }

    redo() {
        const action = this.history.redo();
        if (action == null) {
            return;
        }

        this.dispatchAction(action);
    }

    mouseover(els: WebViewElement[], webview: Electron.WebviewTag) {
        if (!els.length) {
            this.overlay.removeHoverRect();
            this.state.clearHoveredElement();
            return;
        }
        const el = els[0];
        const adjustedRect = this.overlay.adaptRectFromSourceElement(el.rect, webview);
        this.overlay.updateHoverRect(adjustedRect);
        this.state.setHoveredElement(el);
    }

    click(els: WebViewElement[], webview: Electron.WebviewTag) {
        this.overlay.removeClickedRects();
        this.state.clearSelectedElements();

        for (const el of els) {
            const adjustedRect = this.overlay.adaptRectFromSourceElement(el.rect, webview);
            this.overlay.addClickRect(adjustedRect, el.styles);
            this.state.addSelectedElement(el);
        }
    }

    handleStyleUpdated(webview: Electron.WebviewTag) {
        if (!this.history.isInTransaction) {
            this.refreshClickedElements(webview);
        }
    }

    refreshClickedElements(webview: Electron.WebviewTag) {
        this.debouncedRefreshClickedElements(webview);
    }

    dispose() {
        this.clear();
        this.webviews.deregisterAll();
    }

    clear() {
        this.overlay.clear();
        this.state.clear();
    }

    private async undebouncedRefreshClickedElements(webview: Electron.WebviewTag) {
        const clickedElements = this.state.selected;
        const newClickedRects: { adjustedRect: DOMRect; computedStyle: CSSStyleDeclaration }[] = [];

        for (const element of clickedElements) {
            const rect = await this.overlay.getBoundingRect(element.selector, webview);
            const computedStyle = await this.overlay.getComputedStyle(element.selector, webview);
            const adjustedRect = this.overlay.adaptRectFromSourceElement(rect, webview);
            newClickedRects.push({ adjustedRect, computedStyle });
        }

        this.overlay.clear();
        newClickedRects.forEach(({ adjustedRect, computedStyle }) => {
            this.overlay.addClickRect(adjustedRect, computedStyle);
        });
    }
    private debouncedRefreshClickedElements = debounce(this.undebouncedRefreshClickedElements, 10);
}
