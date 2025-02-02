import { EditorMode, EditorTabValue } from '@/lib/models';
import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { NativeImage } from 'electron';
import { makeAutoObservable } from 'mobx';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { CanvasManager } from './canvas';
import { ChatManager } from './chat';
import { CodeManager } from './code';
import { CopyManager } from './copy';
import { ElementManager } from './element';
import { ErrorManager } from './error';
import { GroupManager } from './group';
import { HistoryManager } from './history';
import { ImageManager } from './image';
import { InsertManager } from './insert';
import { MoveManager } from './move';
import { OverlayManager } from './overlay';
import { ProjectInfoManager } from './projectinfo';
import { StyleManager } from './style';
import { TextEditingManager } from './text';
import { WebviewManager } from './webview';
import { PagesManager } from './pages';

export class EditorEngine {
    private plansOpen: boolean = false;
    private editorMode: EditorMode = EditorMode.DESIGN;
    private editorPanelTab: EditorTabValue = EditorTabValue.CHAT;
    private canvasManager: CanvasManager;
    private chatManager: ChatManager;
    private webviewManager: WebviewManager;
    private overlayManager: OverlayManager;
    private codeManager: CodeManager;
    private pagesManager: PagesManager;
    private errorManager: ErrorManager;

    private astManager: AstManager = new AstManager(this);
    private historyManager: HistoryManager = new HistoryManager(this);
    private projectInfoManager: ProjectInfoManager = new ProjectInfoManager();
    private elementManager: ElementManager = new ElementManager(this);
    private textEditingManager: TextEditingManager = new TextEditingManager(this);
    private actionManager: ActionManager = new ActionManager(this);
    private insertManager: InsertManager = new InsertManager(this);
    private moveManager: MoveManager = new MoveManager(this);
    private styleManager: StyleManager = new StyleManager(this);
    private copyManager: CopyManager = new CopyManager(this);
    private groupManager: GroupManager = new GroupManager(this);
    private imageManager: ImageManager = new ImageManager(this);

    constructor(private projectsManager: ProjectsManager) {
        makeAutoObservable(this);
        this.canvasManager = new CanvasManager(this.projectsManager);
        this.chatManager = new ChatManager(this, this.projectsManager);
        this.webviewManager = new WebviewManager(this, this.projectsManager);
        this.overlayManager = new OverlayManager(this);
        this.codeManager = new CodeManager(this, this.projectsManager);
        this.pagesManager = new PagesManager(this, this.projectsManager);
        this.errorManager = new ErrorManager(this, this.projectsManager);
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
    get image() {
        return this.imageManager;
    }
    get editPanelTab() {
        return this.editorPanelTab;
    }
    get isPlansOpen() {
        return this.plansOpen;
    }
    get errors() {
        return this.errorManager;
    }

    set mode(mode: EditorMode) {
        this.editorMode = mode;
    }

    set editPanelTab(tab: EditorTabValue) {
        this.editorPanelTab = tab;
    }

    set isPlansOpen(open: boolean) {
        this.plansOpen = open;
        if (open) {
            sendAnalytics('open pro checkout');
        }
    }

    get pages() {
        return this.pagesManager;
    }

    dispose() {
        this.overlay.clear();
        this.elements.clear();
        this.webviews.deregisterAll();
        this.errors.clear();
        this.chatManager?.dispose();
        this.historyManager?.clear();
        this.elementManager?.clear();
        this.actionManager?.dispose();
        this.overlayManager?.clear();
        this.astManager?.clear();
        this.textEditingManager?.clean();
        this.codeManager?.dispose();
        this.insertManager?.dispose();
        this.moveManager?.dispose();
        this.styleManager?.dispose();
        this.copyManager?.dispose();
        this.groupManager?.dispose();
        this.canvasManager?.clear();
        this.imageManager?.dispose();
        // Clear references
        this.projectsManager = null as any;
        this.editorMode = EditorMode.DESIGN;
        this.editorPanelTab = EditorTabValue.STYLES;
    }

    clearUI() {
        this.overlay.clear();
        this.elements.clear();
        this.webviews.deselectAll();
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
        const path: string | null = await invokeMainChannel(MainChannels.SAVE_IMAGE, {
            img: image.toDataURL(),
            name: imageName,
        });
        return imageName;
    }
}
