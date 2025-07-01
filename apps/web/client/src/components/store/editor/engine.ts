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

        this.sandbox = new SandboxManager(this.error);
        this.theme = new ThemeManager(this.sandbox);
        this.hosting = new HostingManager(this.sandbox);
        this.versions = new VersionsManager(this.sandbox);

        // Handle circular dependencies
        this.frames = new FramesManager(this.projectId);
        this.overlay = new OverlayManager(this.canvas, this.elements, this.frames, this.state);
        this.elements = new ElementsManager(this.frames, this.overlay, this.sandbox, this.action);
        this.code = new CodeManager(this.error, this.sandbox);
        this.history = new HistoryManager(this.code);
        this.action = new ActionManager(this.frames, this.elements, this.history, this.code, this.theme, this.overlay, this.state);
        this.ide = new IDEManager(this.sandbox, this.action, this.frames, this.state, this.elements);

        this.ast = new AstManager(this.frames, this.sandbox);
        this.image = new ImageManager(this.sandbox, this.elements);
        this.style = new StyleManager(this.action, this.elements);
        this.pages = new PagesManager(this.frames, this.sandbox);
        this.font = new FontManager(this.history, this.sandbox, this.state);
        this.group = new GroupManager(this.elements, this.frames, this.action);
        this.insert = new InsertManager(this.overlay, this.action, this.state);
        this.text = new TextEditingManager(this.history, this.overlay, this.frames, this.elements);
        this.chat = new ChatManager(this.projectId, this.elements, this.sandbox, this.theme, this.error, this.versions);
        this.move = new MoveManager(this.overlay, this.frames, this.elements, this.action, this.style);
        this.copy = new CopyManager(this.elements, this.frames, this.sandbox, this.action, this.image);
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
