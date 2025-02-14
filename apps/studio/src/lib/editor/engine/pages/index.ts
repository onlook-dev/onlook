import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { PageNode } from '@onlook/models/pages';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { doesRouteExist, normalizeRoute, validateNextJsRoute } from './helper';

export class PagesManager {
    private pages: PageNode[] = [];
    private activeRoutesByWebviewId: Record<string, string> = {};
    private currentPath: string = '';
    private groupedRoutes: string = '';

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

    get activeRoute(): string | undefined {
        const webview = this.getActiveWebview();
        return webview ? this.activeRoutesByWebviewId[webview.id] : undefined;
    }

    private getActiveWebview(): Electron.WebviewTag | undefined {
        return this.editorEngine.webviews.selected[0] || this.editorEngine.webviews.getAll()[0];
    }

    public isNodeActive(node: PageNode): boolean {
        const webview = this.getActiveWebview();
        if (!webview) {
            return false;
        }

        const activePath = this.activeRoute;
        if (!activePath) {
            return false;
        }

        if (node.children && node.children?.length > 0) {
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

            // For dynamic segments, just verify the active segment exists
            if (isDynamic) {
                return activeSegment.length > 0;
            }

            // For static segments, do exact match after cleaning escapes
            return nodeSegment.replace(/\\/g, '') === activeSegment.replace(/\\/g, '');
        });
    }

    public setActivePath(webviewId: string, path: string) {
        this.activeRoutesByWebviewId[webviewId] = path;
        if (webviewId === this.getActiveWebview()?.id) {
            this.currentPath = path;
        }
        this.updateActiveStates(this.pages, path);
    }

    private updateActiveStates(nodes: PageNode[], activePath: string) {
        nodes.forEach((node) => {
            node.isActive = this.isNodeActive(node);

            if (node.children?.length) {
                this.updateActiveStates(node.children, activePath);
            }
        });
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

    public async createPage(baseRoute: string, pageName: string): Promise<void> {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            throw new Error('No project root found');
        }

        const { valid, error } = validateNextJsRoute(pageName);
        if (!valid) {
            throw new Error(error);
        }

        const normalizedPath = normalizeRoute(`${baseRoute}/${pageName}`);

        if (doesRouteExist(this.pages, normalizedPath)) {
            throw new Error('This page already exists');
        }

        try {
            await invokeMainChannel(MainChannels.CREATE_PAGE, {
                projectRoot,
                pagePath: normalizedPath,
            });

            await this.scanPages();
        } catch (error) {
            console.error('Failed to create page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async renamePage(oldPath: string, newName: string): Promise<void> {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            throw new Error('No project root found');
        }

        const { valid, error } = validateNextJsRoute(newName);
        if (!valid) {
            throw new Error(error);
        }

        if (doesRouteExist(this.pages, `/${newName}`)) {
            throw new Error('A page with this name already exists');
        }

        try {
            await invokeMainChannel(MainChannels.RENAME_PAGE, {
                projectRoot,
                oldPath,
                newName,
            });

            await this.scanPages();
        } catch (error) {
            console.error('Failed to rename page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async duplicatePage(sourcePath: string, targetPath: string): Promise<void> {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            throw new Error('No project root found');
        }

        try {
            await invokeMainChannel(MainChannels.DUPLICATE_PAGE, {
                projectRoot,
                sourcePath: normalizeRoute(sourcePath),
                targetPath: normalizeRoute(targetPath),
            });

            await this.scanPages();
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async deletePage(pageName: string, isDir: boolean): Promise<void> {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            throw new Error('No project root found');
        }

        const normalizedPath = normalizeRoute(`${pageName}`);
        if (normalizedPath === '' || normalizedPath === '/') {
            throw new Error('Cannot delete root page');
        }

        try {
            await invokeMainChannel(MainChannels.DELETE_PAGE, {
                projectRoot,
                pagePath: normalizedPath,
                isDir,
            });

            await this.scanPages();
        } catch (error) {
            console.error('Failed to delete page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    async navigateTo(path: string) {
        const webview = this.getActiveWebview();

        if (!webview) {
            console.warn('No webview available');
            return;
        }

        path = path.startsWith('/') ? path : `/${path}`;
        const originalPath = path;

        const normalizedPath = path.replace(/\\/g, '/');
        const splitPath = normalizedPath.split('/').filter(Boolean);
        const removedGroupedRoutes = splitPath.filter(
            (val) => !(val.startsWith('(') && val.endsWith(')')),
        );
        const isGroupedRoutes = splitPath.length !== removedGroupedRoutes.length;

        if (isGroupedRoutes) {
            path = '/' + removedGroupedRoutes.join('/');
            this.groupedRoutes = originalPath;
        } else {
            this.groupedRoutes = '';
        }

        try {
            const currentUrl = await webview.getURL();
            const baseUrl = currentUrl ? new URL(currentUrl).origin : null;

            if (!baseUrl) {
                console.warn('No base URL found');
                return;
            }

            await webview.loadURL(`${baseUrl}${path}`);
            this.setActivePath(webview.id, originalPath);
            await webview.executeJavaScript('window.api?.processDom()');
        } catch (error) {
            console.error('Navigation failed:', error);
        }
    }

    public setCurrentPath(path: string) {
        this.currentPath = path;
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
            const activePath = this.groupedRoutes ? this.groupedRoutes : path;
            this.setActivePath(webviewId, activePath);
        } catch (error) {
            console.error('Failed to parse URL:', error);
        }
    }

    dispose() {
        this.pages = [];
        this.currentPath = '';
        this.editorEngine = null as any;
    }
}
