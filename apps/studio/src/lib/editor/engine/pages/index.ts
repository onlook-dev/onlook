import { makeAutoObservable } from 'mobx';
import type { PageNode } from '@onlook/models/pages';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { EditorEngine } from '..';
import type { ProjectsManager } from '@/lib/projects';

export class PagesManager {
    private pages: PageNode[] = [];
    private activeRoutes: Map<string, string> = new Map();
    private currentPath: string = '';
    private subscribers: Set<() => void> = new Set();

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

    private getActiveWebview(): Electron.WebviewTag | undefined {
        return this.editorEngine.webviews.selected[0] || this.editorEngine.webviews.getAll()[0];
    }

    public subscribe(callback: () => void): () => void {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    private notifySubscribers(): void {
        this.subscribers.forEach((callback) => callback());
    }

    public isNodeActive(node: PageNode): boolean {
        const webview = this.getActiveWebview();
        if (!webview) {
            return false;
        }

        const activePath = this.activeRoutes.get(webview.id);
        if (!activePath) {
            return false;
        }

        // Skip folder nodes
        if (node.children && node.children?.length > 0) {
            return false;
        }

        const normalizedNodePath = node.path.replace(/\\/g, '/');
        const normalizedActivePath = activePath.replace(/\\/g, '/');

        const nodeSegments = normalizedNodePath.split('/').filter(Boolean);
        const activeSegments = normalizedActivePath.split('/').filter(Boolean);

        // Handle root path
        if (nodeSegments.length === 0 && activeSegments.length === 0) {
            return true;
        }
        if (nodeSegments.length !== activeSegments.length) {
            return false;
        }

        return nodeSegments.every((nodeSegment, index) => {
            const activeSegment = activeSegments[index];
            const isDynamic = nodeSegment.startsWith('[') && nodeSegment.endsWith(']');

            // For dynamic segments, check if active segment exists
            if (isDynamic) {
                return activeSegment.length > 0;
            }

            // For static segments, do exact match after cleaning escapes
            return nodeSegment.replace(/\\/g, '') === activeSegment.replace(/\\/g, '');
        });
    }

    public setActivePath(webviewId: string, path: string) {
        this.activeRoutes.set(webviewId, path);

        if (webviewId === this.getActiveWebview()?.id) {
            this.currentPath = path;
        }

        this.notifySubscribers();
    }

    private updateActiveStates(nodes: PageNode[], activePath: string) {
        nodes.forEach((node) => {
            node.isActive = this.isNodeActive(node);

            if (node.children?.length) {
                this.updateActiveStates(node.children, activePath);
            }
        });
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
        const webview = this.getActiveWebview();

        if (!webview) {
            console.warn('No webview available');
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
            this.setActivePath(webview.id, path);
            await webview.executeJavaScript('window.api?.processDom()');
        } catch (error) {
            console.error('Navigation failed:', error);
        }
    }

    public setCurrentPath(path: string) {
        this.currentPath = path;
        this.notifySubscribers();
    }

    public handleWebviewUrlChange(webviewId: string) {
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            return;
        }

        try {
            const url = webview.getURL();
            if (!url) {
                return;
            }

            const urlObj = new URL(url);
            const path = urlObj.pathname;
            this.setActivePath(webviewId, path);
        } catch (error) {
            console.error('Failed to parse URL:', error);
        }
    }

    dispose() {
        this.pages = [];
        this.currentPath = '';
        this.subscribers.clear();
        this.editorEngine = null as any;
    }
}
