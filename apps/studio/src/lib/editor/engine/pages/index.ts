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

    private get activeWebviewId(): string | undefined {
        const webview = this.editorEngine.webviews.selected[0];
        return webview?.id;
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
        const webview = this.editorEngine.webviews.selected[0];
        if (!webview) {
            return false;
        }

        const activePath = this.activeRoutes.get(webview.id);
        if (!activePath) {
            return false;
        }

        // For root path special case
        if (node.path === '/' && activePath === '/') {
            return true;
        }

        // Handle dynamic route matching
        const isDynamic = node.path.includes('[') && node.path.includes(']');
        if (isDynamic) {
            const routePattern = node.path
                .split('/')
                .map((segment) => {
                    if (segment.startsWith('[') && segment.endsWith(']')) {
                        return '[^/]+'; // Match any character except '/'
                    }
                    return segment;
                })
                .join('\\/');

            const regex = new RegExp(`^${routePattern}$`);
            return regex.test(activePath);
        }

        // Static route comparison
        const normalizedNodePath = node.path.replace(/\/$/, '');
        const normalizedActivePath = activePath.replace(/\/$/, '');
        return normalizedNodePath === normalizedActivePath;
    }

    public setActivePath(webviewId: string, path: string) {
        this.activeRoutes.set(webviewId, path);

        if (webviewId === this.activeWebviewId) {
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
        const webview =
            this.editorEngine.webviews.selected[0] || this.editorEngine.webviews.getAll()[0];

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

    setCurrentPath(path: string) {
        this.currentPath = path;
        this.notifySubscribers();
    }

    dispose() {
        this.pages = [];
        this.currentPath = '';
        this.subscribers.clear();
        this.editorEngine = null as any;
    }
}
