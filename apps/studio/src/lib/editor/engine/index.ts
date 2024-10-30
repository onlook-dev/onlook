import { EditorMode } from '@/lib/models';
import type { ProjectsManager } from '@/lib/projects';
import type { NativeImage } from 'electron';
import { makeAutoObservable } from 'mobx';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { CanvasManager } from './canvas';
import { ChatManager } from './chat';
import { CodeManager } from './code';
import { CopyManager } from './copy';
import { DomManager } from './dom';
import { ElementManager } from './element';
import { GroupManager } from './group';
import { HistoryManager } from './history';
import { InsertManager } from './insert';
import { MoveManager } from './move';
import { OverlayManager } from './overlay';
import { ProjectInfoManager } from './projectinfo';
import { StyleManager } from './style';
import { TextEditingManager } from './text';
import { WebviewManager } from './webview';
import { MainChannels } from '@onlook/models/constants';

export class EditorEngine {
    private editorMode: EditorMode = EditorMode.DESIGN;
    private overlayManager: OverlayManager = new OverlayManager();
    private webviewManager: WebviewManager = new WebviewManager();
    private astManager: AstManager = new AstManager();
    private historyManager: HistoryManager = new HistoryManager(this);
    private projectInfoManager: ProjectInfoManager = new ProjectInfoManager();
    private canvasManager: CanvasManager;
    private domManager: DomManager = new DomManager(this);
    private elementManager: ElementManager = new ElementManager(this);
    private textEditingManager: TextEditingManager = new TextEditingManager(this);
    private codeManager: CodeManager = new CodeManager(this);
    private actionManager: ActionManager = new ActionManager(this);
    private insertManager: InsertManager = new InsertManager(this);
    private moveManager: MoveManager = new MoveManager(this);
    private styleManager: StyleManager = new StyleManager(this);
    private copyManager: CopyManager = new CopyManager(this);
    private groupManager: GroupManager = new GroupManager(this);
    private chatManager: ChatManager = new ChatManager(this);

    constructor(private projectsManager: ProjectsManager) {
        makeAutoObservable(this);
        this.canvasManager = new CanvasManager(this.projectsManager);
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
    get copy() {
        return this.copyManager;
    }
    get group() {
        return this.groupManager;
    }
    get chat() {
        return this.chatManager;
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
        const webviews = this.webviews.webviews;
        if (webviews.size === 0) {
            return;
        }
        const webview = Array.from(webviews.values())[0].webview;
        webview.executeJavaScript('window.api?.processDom()');
    }

    async takeScreenshot(name: string): Promise<string | null> {
        const webview = this.webviews.webviews.values().next().value?.webview;
        if (!webview) {
            console.error('No webview found');
            return null;
        }

        const hasContent = await webview.executeJavaScript(
            `document.body.innerText.trim().length > 0 || document.body.children.length > 0 `,
        );
        if (!hasContent) {
            console.error('No content found in webview');
            return null;
        }

        const imageName = `${name}-preview.png`;
        const image: NativeImage = await webview.capturePage();
        const path: string | null = await window.api.invoke(MainChannels.SAVE_IMAGE, {
            img: image.toDataURL(),
            name: imageName,
        });
        return imageName;
    }
}
