import { EditorMode } from '@/lib/models';
import { makeAutoObservable } from 'mobx';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { CanvasManager } from './canvas';
import { CodeManager } from './code';
import { DomManager } from './dom';
import { ElementManager } from './element';
import { HistoryManager } from './history';
import { InsertManager } from './insert';
import { MoveManager } from './move';
import { OverlayManager } from './overlay';
import { ProjectInfoManager } from './projectinfo';
import { StyleManager } from './style';
import { TextEditingManager } from './text';
import { WebviewManager } from './webview';
import { RemoveElementAction } from '/common/actions';
import { escapeSelector } from '/common/helpers';
import { WebViewElement } from '/common/models/element';

export class EditorEngine {
    private editorMode: EditorMode = EditorMode.DESIGN;
    private overlayManager: OverlayManager = new OverlayManager();
    private webviewManager: WebviewManager = new WebviewManager();
    private astManager: AstManager = new AstManager();
    private historyManager: HistoryManager = new HistoryManager();
    private projectInfoManager: ProjectInfoManager = new ProjectInfoManager();
    private canvasManager: CanvasManager = new CanvasManager();
    private domManager: DomManager = new DomManager(this.astManager);
    private codeManager: CodeManager = new CodeManager(this.webviewManager, this.astManager);
    private elementManager: ElementManager = new ElementManager(
        this.overlayManager,
        this.astManager,
    );
    private actionManager: ActionManager = new ActionManager(
        this.historyManager,
        this.webviewManager,
    );
    private insertManager: InsertManager = new InsertManager(
        this.overlayManager,
        this.actionManager,
    );
    private moveManager: MoveManager = new MoveManager(this.overlayManager, this.historyManager);
    private styleManager: StyleManager = new StyleManager(this.actionManager, this.elementManager);
    private textEditingManager: TextEditingManager = new TextEditingManager(
        this.overlayManager,
        this.historyManager,
        this.astManager,
    );

    constructor() {
        makeAutoObservable(this);
    }
    get elements() {
        return this.elementManager;
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
    get history() {
        return this.historyManager;
    }
    get dom() {
        return this.domManager;
    }
    get ast() {
        return this.astManager;
    }
    get action() {
        return this.actionManager;
    }
    get mode() {
        return this.editorMode;
    }
    get insert() {
        return this.insertManager;
    }
    get move() {
        return this.moveManager;
    }
    get projectInfo() {
        return this.projectInfoManager;
    }
    get style() {
        return this.styleManager;
    }
    get canvas() {
        return this.canvasManager;
    }
    get text() {
        return this.textEditingManager;
    }
    set mode(mode: EditorMode) {
        this.editorMode = mode;
    }

    dispose() {
        this.clear();
        this.webviews.deregisterAll();
    }

    clear() {
        this.overlay.clear();
        this.elements.clear();
    }

    handleStyleUpdated(webview: Electron.WebviewTag) {
        if (!this.history.isInTransaction) {
            this.elements.refreshSelectedElements(webview);
        }
    }

    inspect() {
        const selected = this.elements.selected;
        if (selected.length === 0) {
            return;
        }
        const selectedEl = selected[0];
        const webviewId = selectedEl.webviewId;
        const webview = this.webviews.getWebview(webviewId);
        if (!webview) {
            return;
        }
        webview.openDevTools();
    }

    async refreshLayers() {
        this.ast.clear();
        const webviews = this.webviews.webviews;
        if (webviews.size === 0) {
            return;
        }
        const webview = Array.from(webviews.values())[0].webview;
        webview.executeJavaScript('window.api?.processDom()');
    }

    async textEditSelectedElement() {
        const selected = this.elements.selected;
        if (selected.length === 0) {
            return;
        }
        const selectedEl = selected[0];
        const webviewId = selectedEl.webviewId;
        const webview = this.webviews.getWebview(webviewId);
        if (!webview) {
            return;
        }

        const domEl = await webview.executeJavaScript(
            `window.api?.getElementWithSelector('${escapeSelector(selectedEl.selector)}')`,
        );
        if (!domEl) {
            return;
        }
        this.text.start(domEl, webview);
    }

    async deleteSelectedElement() {
        const selected = this.elements.selected;
        if (selected.length === 0) {
            return;
        }
        const selectedEl: WebViewElement = selected[0];
        const webviewId = selectedEl.webviewId;
        const webview = this.webviews.getWebview(webviewId);
        if (!webview) {
            return;
        }

        const isElementInserted = await webview.executeJavaScript(
            `window.api?.isElementInserted('${escapeSelector(selectedEl.selector)}')`,
        );

        if (isElementInserted) {
            const removeAction = (await webview.executeJavaScript(
                `window.api?.getRemoveActionFromSelector('${escapeSelector(selectedEl.selector)}', '${webviewId}')`,
            )) as RemoveElementAction | undefined;
            if (!removeAction) {
                return;
            }
            this.action.run(removeAction);
        } else {
            this.style.updateElementStyle('display', {
                updated: 'none',
                original: selectedEl.styles.display,
            });
        }
    }
}
