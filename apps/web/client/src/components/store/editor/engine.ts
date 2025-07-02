import { makeAutoObservable } from 'mobx';
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
import { VersionsManager } from './version';

export class EditorEngine {
    readonly projectId: string;
    readonly error: ErrorManager = new ErrorManager();
    readonly state: StateManager = new StateManager();
    readonly canvas: CanvasManager = new CanvasManager();
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
    readonly versions: VersionsManager = new VersionsManager(this);
    readonly chat: ChatManager = new ChatManager(this);
    readonly image: ImageManager = new ImageManager(this);
    readonly theme: ThemeManager = new ThemeManager(this);
    readonly font: FontManager = new FontManager(this);
    readonly pages: PagesManager = new PagesManager(this);
    readonly frames: FramesManager = new FramesManager(this);

    constructor(projectId: string) {
        this.projectId = projectId;
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
