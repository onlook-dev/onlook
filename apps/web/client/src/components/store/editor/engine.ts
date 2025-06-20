import { type ProjectManager } from '@/components/store/project/manager';
import { makeAutoObservable } from 'mobx';
import type { UserManager } from '../user/manager';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { CanvasManager } from './canvas';
import { ChatManager } from './chat';
import { CodeManager } from './code';
import { CopyManager } from './copy';
import { IDEManager } from './dev';
import { ElementsManager } from './element';
import { ErrorManager } from './error';
import { FontManager } from './font';
import { FramesManager } from './frames';
import { GroupManager } from './group';
import { HistoryManager } from './history';
import { HostingManager } from './hosting';
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

export class EditorEngine {
    readonly chat: ChatManager;
    readonly image: ImageManager;
    readonly theme: ThemeManager;
    readonly font: FontManager;
    readonly pages: PagesManager;
    readonly canvas: CanvasManager;
    readonly frames: FramesManager;

    readonly error: ErrorManager = new ErrorManager();
    readonly state: StateManager = new StateManager();
    readonly text: TextEditingManager = new TextEditingManager(this);
    readonly sandbox: SandboxManager = new SandboxManager(this);
    readonly history: HistoryManager = new HistoryManager(this);
    readonly elements: ElementsManager = new ElementsManager(this);
    readonly overlay: OverlayManager = new OverlayManager(this);
    readonly insert: InsertManager = new InsertManager(this);
    readonly move: MoveManager = new MoveManager(this);
    readonly copy: CopyManager = new CopyManager(this);
    readonly group: GroupManager = new GroupManager(this);
    readonly ast: AstManager = new AstManager(this);
    readonly action: ActionManager = new ActionManager(this);
    readonly style: StyleManager = new StyleManager(this);
    readonly code: CodeManager = new CodeManager(this);
    readonly ide: IDEManager = new IDEManager(this);
    readonly hosting: HostingManager = new HostingManager(this);

    constructor(
        private projectManager: ProjectManager,
        private userManager: UserManager,
    ) {
        this.chat = new ChatManager(this, this.projectManager, this.userManager);
        this.pages = new PagesManager(this, this.projectManager);
        this.image = new ImageManager(this);
        this.theme = new ThemeManager(this, this.projectManager);
        this.font = new FontManager(this, this.projectManager);
        this.canvas = new CanvasManager(this.projectManager)
        this.frames = new FramesManager(this, this.projectManager);
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
        this.ide.clear();
        this.error.clear();
        this.sandbox.clear();
    }

    clearUI() {
        this.overlay.clear();
        this.elements.clear();
        this.frames.deselectAll();
    }

    async refreshLayers() {
        for (const frame of this.frames.getAll()) {
            await frame.view.processDom();
        }
    }
}
