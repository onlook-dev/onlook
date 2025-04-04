import { makeAutoObservable } from 'mobx';
// import { ActionManager } from './action';
// import { AstManager } from './ast';
import { CanvasManager } from './canvas';
import { ChatManager } from './chat';
import { CodeManager } from './code';
// import { CopyManager } from './copy';
import { ElementsManager } from './element';
import { ErrorManager } from './error';
import { FontManager } from './font';
// import { GroupManager } from './group';
import { HistoryManager } from './history';
import { ImageManager } from './image';
// import { InsertManager } from './insert';
// import { MoveManager } from './move';
import { OverlayManager } from './overlay';
import { PagesManager } from './pages';
// import { ProjectInfoManager } from './projectinfo';
import { StateManager } from './state';
// import { StyleManager } from './style';
// import { TextEditingManager } from './text';
import { ThemeManager } from './theme';
import { WebviewManager } from './webview';
import { WindowManager } from './window';

// import { nanoid } from 'nanoid/non-secure';
// import type { ProjectsManager } from '@/lib/projects';
// import type { UserManager } from '@/lib/user';
// import { invokeMainChannel } from '@/lib/utils';

export class EditorEngine {
    readonly canvas: CanvasManager;
    readonly chat: ChatManager;
    readonly webview: WebviewManager;
    readonly code: CodeManager;
    readonly pages: PagesManager;
    readonly error: ErrorManager;
    readonly image: ImageManager;
    readonly theme: ThemeManager;
    readonly font: FontManager;

    readonly overlay: OverlayManager = new OverlayManager(this);
    readonly state: StateManager = new StateManager(this);
    readonly window: WindowManager = new WindowManager(this);
    readonly history: HistoryManager = new HistoryManager(this);
    // readonly action: ActionManager = new ActionManager(this);
    // readonly projectInfo: ProjectInfoManager = new ProjectInfoManager();
    readonly elements: ElementsManager = new ElementsManager(this);
    // readonly text: TextEditingManager = new TextEditingManager(this);
    // readonly insert: InsertManager = new InsertManager(this);
    // readonly move: MoveManager = new MoveManager(this);
    // readonly style: StyleManager = new StyleManager(this);
    // readonly copy: CopyManager = new CopyManager(this);
    // readonly group: GroupManager = new GroupManager(this);
    // readonly ast: AstManager = new AstManager(this);

    constructor(
        // private projectsManager: ProjectsManager,
        // private userManager: UserManager,
    ) {
        makeAutoObservable(this);
        this.canvas = new CanvasManager();
        // this.chat = new ChatManager(this, this.projectsManager, this.userManager);
        // this.webview = new WebviewManager(this, this.projectsManager);
        // this.code = new CodeManager(this, this.projectsManager);
        // this.pages = new PagesManager(this, this.projectsManager);
        // this.error = new ErrorManager(this, this.projectsManager);
        // this.image = new ImageManager(this, this.projectsManager);
        // this.theme = new ThemeManager(this, this.projectsManager);
        // this.font = new FontManager(this, this.projectsManager);
    }


    // get errors() {
    //     return this.errorManager;
    // }

    // get pages() {
    //     return this.pagesManager;
    // }

    dispose() {
        // this.elements.clear();
        // this.history.clear();
        // this.action.dispose();
        // this.overlay.clear();
        // this.ast.clear();
        // this.textEditing.clean();
        // this.insert.dispose();
        // this.move.dispose();
        // this.style.dispose();
        // this.copy.dispose();
        // this.group.dispose();

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
        // this.elements.clear();
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
