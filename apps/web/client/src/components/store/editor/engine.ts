import type { Branch } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { PostHog } from 'posthog-js';
import { ActionManager } from './action';
import { AstManager } from './ast';
import { BranchManager } from './branch';
import { CanvasManager } from './canvas';
import { ChatManager } from './chat';
import { CodeManager } from './code';
import { CopyManager } from './copy';
import { ElementsManager } from './element';
import { FontManager } from './font';
import { FrameEventManager } from './frame-events';
import { FramesManager } from './frames';
import { GroupManager } from './group';
import { IDEManager } from './ide';
import { ImageManager } from './image';
import { InsertManager } from './insert';
import { MoveManager } from './move';
import { OverlayManager } from './overlay';
import { PagesManager } from './pages';
import { PreloadScriptManager } from './preload';
import { SandboxManager } from './sandbox';
import { ScreenshotManager } from './screenshot';
import { SnapManager } from './snap';
import { StateManager } from './state';
import { StyleManager } from './style';
import { TemplateNodeManager } from './template-nodes';
import { TextEditingManager } from './text';
import { ThemeManager } from './theme';
import { VersionsManager } from './version';
import { ApiManager } from './api';

export class EditorEngine {
    readonly projectId: string;
    readonly posthog: PostHog;
    readonly branches: BranchManager = new BranchManager(this);

    get activeSandbox(): SandboxManager {
        return this.branches.activeSandbox;
    }

    get history() {
        return this.branches.activeHistory;
    }

    readonly state: StateManager = new StateManager();
    readonly canvas: CanvasManager = new CanvasManager(this);
    readonly text: TextEditingManager = new TextEditingManager(this);
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
    readonly versions: VersionsManager = new VersionsManager(this);
    readonly chat: ChatManager = new ChatManager(this);
    readonly image: ImageManager = new ImageManager(this);
    readonly theme: ThemeManager = new ThemeManager(this);
    readonly font: FontManager = new FontManager(this);
    readonly pages: PagesManager = new PagesManager(this);
    readonly frames: FramesManager = new FramesManager(this);
    readonly frameEvent: FrameEventManager = new FrameEventManager(this);
    readonly preloadScript: PreloadScriptManager = new PreloadScriptManager(this);
    readonly screenshot: ScreenshotManager = new ScreenshotManager(this);
    readonly snap: SnapManager = new SnapManager(this);
    readonly templateNodes: TemplateNodeManager;
    readonly api: ApiManager = new ApiManager(this);

    constructor(projectId: string, posthog: PostHog) {
        this.projectId = projectId;
        this.posthog = posthog;
        this.templateNodes = new TemplateNodeManager(this, projectId);
        makeAutoObservable(this);
    }

    async init() {
        this.overlay.init();
        this.image.init();
        this.font.init();
        this.frameEvent.init();
        this.chat.init();
        this.templateNodes.init();
        this.style.init();
    }

    async initBranches(branches: Branch[]) {
        this.branches.initBranches(branches);
        await this.branches.init();
    }

    clear() {
        this.elements.clear();
        this.frames.clear();
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
        this.branches.clear();
        this.frameEvent.clear();
        this.screenshot.clear();
        this.snap.hideSnapLines();
        this.templateNodes.clear();
    }

    clearUI() {
        this.overlay.clearUI();
        this.elements.clear();
        this.frames.deselectAll();
        this.snap.hideSnapLines();
    }

    async refreshLayers() {
        for (const frame of this.frames.getAll()) {
            if (!frame.view) {
                console.error('No frame view found');
                continue;
            }
            await frame.view.processDom();
        }
    }
}
