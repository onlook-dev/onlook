import { makeAutoObservable } from 'mobx';
import type { PageNode } from '@onlook/models/pages';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { EditorEngine } from '..';
import { WebviewState } from '../webview';
import type { ProjectsManager } from '@/lib/projects';

export class PagesManager {
    private pages: PageNode[] = [];
    private activeRoutes: Map<string, string> = new Map();
    private currentPath: string = '';

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        this.scanPages();
    }

    get tree() {
        return this.pages;
    }

    public setActivePath(webviewId: string, path: string) {
        this.activeRoutes.set(webviewId, path);
    }

    public isActivePath(webviewId: string, path: string): boolean {
        return this.activeRoutes.get(webviewId) === path;
    }

    private setPages(pages: PageNode[]) {
        this.pages = pages;
        this.updateActiveStates(this.pages, this.currentPath);
    }

    async scanPages() {
        try {
            const projectRoot = this.projectsManager.project?.folderPath;

            if (!projectRoot) {
                console.warn('No project root found');
                this.setPages([]); // Clears pages when no project
                return;
            }

            const pages = await invokeMainChannel<string, PageNode[]>(
                MainChannels.SCAN_PAGES,
                projectRoot,
            );

            if (pages?.length) {
                this.setPages(pages);
            } else {
                this.setPages([]);
            }
        } catch (error) {
            console.error('Failed to scan pages:', error);
            this.setPages([]);
        }
    }

    async navigateTo(path: string) {
        const webview =
            this.editorEngine.webviews.selected[0] || this.editorEngine.webviews.getAll()[0];

        if (!webview) {
            console.warn('No webview available');
            return;
        }

        if (this.editorEngine.webviews.getState(webview.id) === WebviewState.NOT_RUNNING) {
            console.warn('Project is not running');
            return;
        }

        path = path.startsWith('/') ? path : `/${path}`;

        try {
            const currentUrl = await webview.getURL();
            const baseUrl = currentUrl ? new URL(currentUrl).origin : null;

            if (!baseUrl) {
                console.warn('No base URL found');
                return;
            }

            await webview.loadURL(`${baseUrl}${path}`);
            this.setCurrentPath(path);
            this.setActivePath(webview.id, path);
            await webview.executeJavaScript('window.api?.processDom()');
        } catch (error) {
            console.error('Navigation failed:', error);
        }
    }

    public setCurrentPath(path: string) {
        this.currentPath = path;
        this.updateActiveStates(this.pages, path);
    }

    private updateActiveStates(nodes: PageNode[], activePath: string) {
        nodes.forEach((node) => {
            node.isActive = node.path === activePath;
            if (node.children?.length) {
                this.updateActiveStates(node.children, activePath);
            }
        });
    }

    dispose() {
        this.pages = [];
        this.currentPath = '';
        this.editorEngine = null as any;
    }
}
