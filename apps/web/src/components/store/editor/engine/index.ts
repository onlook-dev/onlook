import { makeAutoObservable } from 'mobx';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { CopyManager } from './copy';
import { ElementsManager } from './element';
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
    readonly overlay: OverlayManager = new OverlayManager(this);
    readonly state: StateManager = new StateManager(this);
    readonly ast: AstManager = new AstManager(this);
    readonly history: HistoryManager = new HistoryManager(this);
    readonly projectInfo: ProjectInfoManager = new ProjectInfoManager();
    readonly elements: ElementsManager = new ElementsManager(this);
    readonly textEditing: TextEditingManager = new TextEditingManager(this);
    readonly action: ActionManager = new ActionManager(this);
    readonly insert: InsertManager = new InsertManager(this);
    readonly move: MoveManager = new MoveManager(this);
    readonly style: StyleManager = new StyleManager(this);
    readonly copy: CopyManager = new CopyManager(this);
    readonly group: GroupManager = new GroupManager(this);

    constructor(
        // private projectsManager: ProjectsManager,
        // private userManager: UserManager,
    ) {
        makeAutoObservable(this);
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


    // get errors() {
    //     return this.errorManager;
    // }

    // get pages() {
    //     return this.pagesManager;
    // }

    dispose() {
        this.elements.clear();
        this.history.clear();
        this.action.dispose();
        this.overlay.clear();
        this.ast.clear();
        this.textEditing.clean();
        this.insert.dispose();
        this.move.dispose();
        this.style.dispose();
        this.copy.dispose();
        this.group.dispose();

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
