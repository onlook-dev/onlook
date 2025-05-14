import { type ProjectManager } from '@/components/store/project/manager';
import { makeAutoObservable } from 'mobx';
import type { UserManager } from '../user/manager';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { CanvasManager } from './canvas';
import { ChatManager } from './chat';
import { CodeManager } from './code';
import { CopyManager } from './copy';
import { ElementsManager } from './element';
import { ErrorManager } from './error';
import { FontManager } from './font';
import { FramesManager } from './frames';
import { GroupManager } from './group';
import { HistoryManager } from './history';
import { ImageManager } from './image';
import { InsertManager } from './insert';
import { MoveManager } from './move';
import { OverlayManager } from './overlay';
import { PagesManager } from './pages';
import { SandboxManager } from './sandbox';
import { StateManager } from './state';
import { StyleManager } from './style';
import { TextEditingManager } from './text';
import { ThemeManager } from './theme';
import { WindowManager } from './window';

export class EditorEngine {
    readonly chat: ChatManager;
    readonly error: ErrorManager;
    readonly image: ImageManager;
    readonly theme: ThemeManager;
    readonly font: FontManager;
    readonly pages: PagesManager;
    readonly canvas: CanvasManager;

    readonly state: StateManager = new StateManager();
    readonly sandbox: SandboxManager = new SandboxManager();
    readonly history: HistoryManager = new HistoryManager(this);
    readonly elements: ElementsManager = new ElementsManager(this);
    readonly overlay: OverlayManager = new OverlayManager(this);
    readonly text: TextEditingManager = new TextEditingManager(this);
    readonly insert: InsertManager = new InsertManager(this);
    readonly move: MoveManager = new MoveManager(this);
    readonly copy: CopyManager = new CopyManager(this);
    readonly group: GroupManager = new GroupManager(this);
    readonly ast: AstManager = new AstManager(this);
    readonly action: ActionManager = new ActionManager(this);
    readonly style: StyleManager = new StyleManager(this);
    readonly frames: FramesManager = new FramesManager(this);
    readonly code: CodeManager = new CodeManager(this);

    // TODO: This could be part of frames manager
    readonly window: WindowManager = new WindowManager(this);

    constructor(
        private projectManager: ProjectManager,
        private userManager: UserManager,
    ) {
        this.chat = new ChatManager(this, this.projectManager, this.userManager);
        this.pages = new PagesManager(this, this.projectManager);
        this.error = new ErrorManager(this, this.projectManager);
        this.image = new ImageManager(this, this.projectManager);
        this.theme = new ThemeManager(this, this.projectManager);
        this.font = new FontManager(this, this.projectManager);
        this.canvas = new CanvasManager(this.projectManager)
        makeAutoObservable(this);
    }

    clear() {
        this.elements.clear();
        this.frames.clear();
        this.history.clear();
        this.action.clear();
        this.overlay.clear();
        this.ast.clear();
        this.text.clean();
        this.insert.clear();
        this.move.clear();
        this.style.clear();
        this.copy.clear();
        this.group.clear();
        this.canvas.clear();
        this.image.clear();
        this.theme.clear();
        this.font.clear();
        this.pages.clear();
        this.chat.clear();
        this.code.clear();
        this.error.clear();
        this.sandbox.clear();
    }

    clearUI() {
        this.overlay.clear();
        this.elements.clear();
        this.frames.deselectAll();
    }

    inspect() {
        // const selected = this.elements.selected;
        // if (selected.length === 0) {
        //     return;
        // }
        // const selectedEl = selected[0];
        // const frameId = selectedEl.frameId;
        // const frameView = this.webviews.getWebview(frameId);
        // if (!frameView) {
        //     return;
        // }
        // frameView.openDevTools();
    }

    async refreshLayers() {
        for (const frame of this.frames.getAll()) {
            await frame.view.processDom();
        }
    }
}
