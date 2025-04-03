import { makeAutoObservable } from 'mobx';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { CopyManager } from './copy';
import { ElementManager } from './element';
import { GroupManager } from './group';
import { HistoryManager } from './history';
import { InsertManager } from './insert';
import { MoveManager } from './move';
import { OverlayManager } from './overlay';
import { ProjectInfoManager } from './projectinfo';
import { StateManager } from './state';
import { StyleManager } from './style';
import { TextEditingManager } from './text';

// import type { ProjectsManager } from '@/lib/projects';
// import type { UserManager } from '@/lib/user';
// import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
// import { MainChannels } from '@onlook/models/constants';
// import type { NativeImage } from 'electron';

// import { ThemeManager } from './theme';
// import { WebviewManager } from './webview';
// import { FontManager } from './font';
// import { PagesManager } from './pages';
// import { ImageManager } from './image';
// import { ErrorManager } from './error';
// import { CanvasManager } from './canvas';
// import { ChatManager } from './chat';
// import { CodeManager } from './code';
// import type { FrameSettings } from '@onlook/models/projects';
// import { nanoid } from 'nanoid/non-secure';

export class EditorEngine {
    // private canvasManager: CanvasManager;
    // private chatManager: ChatManager;
    // private webviewManager: WebviewManager;
    // private codeManager: CodeManager;
    // private pagesManager: PagesManager;
    // private errorManager: ErrorManager;
    // private imageManager: ImageManager;
    // private themeManager: ThemeManager;
    // private fontManager: FontManager;
    private stateManager: StateManager = new StateManager(this);
    private overlayManager: OverlayManager;
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
        // private projectsManager: ProjectsManager,
        // private userManager: UserManager,
    ) {
        makeAutoObservable(this);
        this.overlayManager = new OverlayManager(this);

        // this.canvasManager = new CanvasManager(this.projectsManager);
        // this.chatManager = new ChatManager(this, this.projectsManager, this.userManager);
        // this.webviewManager = new WebviewManager(this, this.projectsManager);
        // this.codeManager = new CodeManager(this, this.projectsManager);
        // this.pagesManager = new PagesManager(this, this.projectsManager);
        // this.errorManager = new ErrorManager(this, this.projectsManager);
        // this.imageManager = new ImageManager(this, this.projectsManager);
        // this.themeManager = new ThemeManager(this, this.projectsManager);
        // this.fontManager = new FontManager(this, this.projectsManager);
    }

    get elements() {
        return this.elementManager;
    }
    get overlay() {
        return this.overlayManager;
    }
    // get webviews() {
    //     return this.webviewManager;
    // }
    // get code() {
    //     return this.codeManager;
    // }
    get history() {
        return this.historyManager;
    }
    get ast() {
        return this.astManager;
    }
    get action() {
        return this.actionManager;
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
    // get canvas() {
    //     return this.canvasManager;
    // }
    get text() {
        return this.textEditingManager;
    }
    get copy() {
        return this.copyManager;
    }
    get group() {
        return this.groupManager;
    }
    // get chat() {
    //     return this.chatManager;
    // }
    // get image() {
    //     return this.imageManager;
    // }
    // get theme() {
    //     return this.themeManager;
    // }
    // get font() {
    //     return this.fontManager;
    // }

    // get errors() {
    //     return this.errorManager;
    // }
    // get isWindowSelected() {
    //     return this.webviews.selected.length > 0 && this.elements.selected.length === 0;
    // }
    // get pages() {
    //     return this.pagesManager;
    // }

    dispose() {
        this.overlay.clear();
        this.elements.clear();
        this.historyManager?.clear();
        this.elementManager?.clear();
        this.actionManager?.dispose();
        this.overlayManager?.clear();
        this.astManager?.clear();
        this.textEditingManager?.clean();
        this.insertManager?.dispose();
        this.moveManager?.dispose();
        this.styleManager?.dispose();
        this.copyManager?.dispose();
        this.groupManager?.dispose();

        // this.canvasManager?.clear();
        // this.imageManager?.dispose();
        // this.themeManager?.dispose();
        // this.fontManager?.dispose();
        // this.webviews.deregisterAll();
        // this.errors.clear();
        // this.chatManager?.dispose();
        // this.codeManager?.dispose();

    }

    clearUI() {
        this.overlay.clear();
        this.elements.clear();
        // this.webviews.deselectAll();
    }

    inspect() {
        // const selected = this.elements.selected;
        // if (selected.length === 0) {
        //     return;
        // }
        // const selectedEl = selected[0];
        // const webviewId = selectedEl.webviewId;
        // const webview = this.webviews.getWebview(webviewId);
        // if (!webview) {
        //     return;
        // }
        // webview.openDevTools();
    }

    async refreshLayers() {
        // const webviews = this.webviews.webviews;
        // if (webviews.size === 0) {
        //     return;
        // }
        // const webview = Array.from(webviews.values())[0].webview;
        // webview.executeJavaScript('window.api?.processDom()');
    }


}
