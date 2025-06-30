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
    readonly error: ErrorManager
    readonly state: StateManager
    readonly canvas: CanvasManager
    readonly text: TextEditingManager
    readonly sandbox: SandboxManager
    readonly history: HistoryManager
    readonly elements: ElementsManager
    readonly overlay: OverlayManager
    readonly insert: InsertManager
    readonly move: MoveManager
    readonly copy: CopyManager
    readonly group: GroupManager
    readonly ast: AstManager
    readonly action: ActionManager
    readonly style: StyleManager
    readonly code: CodeManager
    readonly ide: IDEManager
    readonly hosting: HostingManager
    readonly versions: VersionsManager
    readonly chat: ChatManager
    readonly image: ImageManager
    readonly theme: ThemeManager
    readonly font: FontManager
    readonly pages: PagesManager
    readonly frames: FramesManager

    constructor(projectId: string) {
        this.projectId = projectId;
        this.error = new ErrorManager();
        this.state = new StateManager();
        this.canvas = new CanvasManager();
        this.chat = new ChatManager(this);
        this.text = new TextEditingManager(this);
        this.sandbox = new SandboxManager(this);
        this.history = new HistoryManager(this);
        this.elements = new ElementsManager(this);
        this.overlay = new OverlayManager(this);
        this.insert = new InsertManager(this);
        this.move = new MoveManager(this);
        this.copy = new CopyManager(this);
        this.group = new GroupManager(this);
        this.ast = new AstManager(this);
        this.action = new ActionManager(this);
        this.style = new StyleManager(this);
        this.code = new CodeManager(this);
        this.ide = new IDEManager(this);
        this.hosting = new HostingManager(this);
        this.versions = new VersionsManager(this);
        this.image = new ImageManager(this);
        this.theme = new ThemeManager(this);
        this.font = new FontManager(this);
        this.pages = new PagesManager(this);
        this.frames = new FramesManager(this);
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
