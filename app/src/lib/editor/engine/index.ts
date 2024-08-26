import { EditorMode } from '@/lib/models';
import { makeAutoObservable } from 'mobx';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { CodeManager } from './code';
import { DomManager } from './dom';
import { ElementManager } from './element';
import { HistoryManager } from './history';
import { InsertManager } from './insert';
import { MoveManager } from './move';
import { OverlayManager } from './overlay';
import { WebviewManager } from './webview';

export class EditorEngine {
    public scale: number = 0;

    private editorMode: EditorMode = EditorMode.DESIGN;
    private overlayManager: OverlayManager = new OverlayManager();
    private webviewManager: WebviewManager = new WebviewManager();
    private astManager: AstManager = new AstManager();
    private historyManager: HistoryManager = new HistoryManager();
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
}
