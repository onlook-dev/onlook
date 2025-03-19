import { EditorMode, EditorTabValue, SettingsTabValue } from '@/lib/models';
import type { ProjectsManager } from '@/lib/projects';
import type { UserManager } from '@/lib/user';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
import type { NativeImage } from 'electron';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
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
import { PagesManager } from './pages';
import { ProjectInfoManager } from './projectinfo';
import { StyleManager } from './style';
import { TextEditingManager } from './text';
import { ThemeManager } from './theme';
import { WebviewManager } from './webview';

export class EditorEngine {
    private _plansOpen: boolean = false;
    private _settingsOpen: boolean = false;
    private _hotkeysOpen: boolean = false;
    private _publishOpen: boolean = false;

    private _editorMode: EditorMode = EditorMode.DESIGN;
    private _editorPanelTab: EditorTabValue = EditorTabValue.CHAT;
    private _settingsTab: SettingsTabValue = SettingsTabValue.PREFERENCES;

    private canvasManager: CanvasManager;
    private chatManager: ChatManager;
    private webviewManager: WebviewManager;
    private overlayManager: OverlayManager;
    private codeManager: CodeManager;
    private pagesManager: PagesManager;
    private errorManager: ErrorManager;
    private imageManager: ImageManager;
    private themeManager: ThemeManager;

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

    constructor(
        private projectsManager: ProjectsManager,
        private userManager: UserManager,
    ) {
        makeAutoObservable(this);
        this.canvasManager = new CanvasManager(this.projectsManager);
        this.chatManager = new ChatManager(this, this.projectsManager, this.userManager);
        this.webviewManager = new WebviewManager(this, this.projectsManager);
        this.overlayManager = new OverlayManager(this);
        this.codeManager = new CodeManager(this, this.projectsManager);
        this.pagesManager = new PagesManager(this, this.projectsManager);
        this.errorManager = new ErrorManager(this, this.projectsManager);
        this.imageManager = new ImageManager(this, this.projectsManager);
        this.themeManager = new ThemeManager(this, this.projectsManager);
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
        return this._editorMode;
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
    get theme() {
        return this.themeManager;
    }
    get editPanelTab() {
        return this._editorPanelTab;
    }
    get settingsTab() {
        return this._settingsTab;
    }
    get isPlansOpen() {
        return this._plansOpen;
    }
    get isSettingsOpen() {
        return this._settingsOpen;
    }
    get isPublishOpen() {
        return this._publishOpen;
    }
    get isHotkeysOpen() {
        return this._hotkeysOpen;
    }
    get errors() {
        return this.errorManager;
    }
    get isWindowSelected() {
        return this.webviews.selected.length > 0 && this.elements.selected.length === 0;
    }
    get pages() {
        return this.pagesManager;
    }

    set mode(mode: EditorMode) {
        this._editorMode = mode;
    }

    set editPanelTab(tab: EditorTabValue) {
        this._editorPanelTab = tab;
    }

    set settingsTab(tab: SettingsTabValue) {
        this._settingsTab = tab;
    }

    set isPlansOpen(open: boolean) {
        this._plansOpen = open;
        if (open) {
            sendAnalytics('open pro checkout');
        }
    }

    set isSettingsOpen(open: boolean) {
        this._settingsOpen = open;
    }

    set isHotkeysOpen(value: boolean) {
        this._hotkeysOpen = value;
    }

    set isPublishOpen(open: boolean) {
        this._publishOpen = open;
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
        this.themeManager?.dispose();
        this._settingsOpen = false;
        this._plansOpen = false;
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

    async takeActiveWebviewScreenshot(
        name: string,
        options?: {
            save: boolean;
        },
    ): Promise<{
        name?: string;
        image?: string;
    } | null> {
        if (this.webviews.webviews.size === 0) {
            console.error('Failed to take screenshot, no webviews found');
            return null;
        }
        const webviewId = Array.from(this.webviews.webviews.values())[0].webview.id;
        return this.takeWebviewScreenshot(name, webviewId, options);
    }

    async takeWebviewScreenshot(
        name: string,
        webviewId: string,
        options?: {
            save: boolean;
        },
    ): Promise<{
        name?: string;
        image?: string;
    } | null> {
        const webview = this.webviews.getWebview(webviewId);
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

        const image: NativeImage = await webview.capturePage();

        if (options?.save) {
            const imageName = `${name}-preview.png`;
            const path: string | null = await invokeMainChannel(MainChannels.SAVE_IMAGE, {
                img: image.toDataURL(),
                name: imageName,
            });
            return {
                name: imageName,
            };
        }
        return {
            image: image.resize({ quality: 'good', height: 100 }).toDataURL({
                scaleFactor: 0.1,
            }),
        };
    }

    canDeleteWindow() {
        return this.canvas.frames.length > 1;
    }

    deleteWindow(id?: string) {
        if (this.canvas.frames.length === 1) {
            console.error('Cannot delete the last window');
            return;
        }
        let settings: FrameSettings | null = null;
        if (id) {
            settings = this.canvas.getFrame(id) || null;
            if (!settings) {
                console.error('Window not found');
                return;
            }
        } else if (this.webviews.selected.length === 0) {
            console.error('No window selected');
            return;
        } else {
            settings = this.canvas.getFrame(this.webviews.selected[0].id) || null;
        }
        if (!settings) {
            console.error('Window not found');
            return;
        }
        this.ast.mappings.remove(settings.id);
        this.canvas.frames = this.canvas.frames.filter((frame) => frame.id !== settings.id);
        const webview = this.webviews.getWebview(settings.id);
        if (webview) {
            this.webviews.deregister(webview);
        }
        sendAnalytics('window delete');
    }

    duplicateWindow(id?: string) {
        let settings: FrameSettings | null = null;
        if (id) {
            settings = this.canvas.getFrame(id) || null;
        } else if (this.webviews.selected.length === 0) {
            console.error('No window selected');
            return;
        } else {
            settings = this.canvas.getFrame(this.webviews.selected[0].id) || null;
        }
        if (!settings) {
            console.error('Window not found');
            return;
        }
        const currentFrame = settings;
        const newFrame: FrameSettings = {
            id: nanoid(),
            url: currentFrame.url,
            dimension: {
                width: currentFrame.dimension.width,
                height: currentFrame.dimension.height,
            },
            position: {
                x: currentFrame.position.x + currentFrame.dimension.width + 100,
                y: currentFrame.position.y,
            },
            aspectRatioLocked: currentFrame.aspectRatioLocked,
            orientation: currentFrame.orientation,
            device: currentFrame.device,
            theme: currentFrame.theme,
        };

        this.canvas.frames = [...this.canvas.frames, newFrame];
        sendAnalytics('window duplicate');
    }
}
