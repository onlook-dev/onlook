import type { ProjectManager } from '@/components/store/project/manager';
import { sendAnalytics } from '@/utils/analytics';
import type { PageMetadata, PageNode } from '@onlook/models/pages';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import type { FrameData } from '../frames';
import {
    createPageInSandbox,
    deletePageInSandbox,
    doesRouteExist,
    duplicatePageInSandbox,
    normalizeRoute,
    renamePageInSandbox,
    scanPagesFromSandbox,
    updatePageMetadataInSandbox,
    validateNextJsRoute
} from './helper';

export class PagesManager {
    private pages: PageNode[] = [];
    private activeRoutesByFrameId: Record<string, string> = {};
    private currentPath = '';
    private groupedRoutes = '';

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
    }

    get tree() {
        return this.pages;
    }

    get activeRoute(): string | undefined {
        const frame = this.getActiveFrame();
        return frame ? this.activeRoutesByFrameId[frame.frame.id] : undefined;
    }

    private getActiveFrame(): FrameData | undefined {
        if (!this.editorEngine?.frames) {
            return undefined;
        }
        return this.editorEngine.frames.selected[0] ?? this.editorEngine.frames.getAll()[0];
    }

    public isNodeActive(node: PageNode): boolean {
        const frameView = this.getActiveFrame();
        if (!frameView) {
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
            if (!activeSegment) {
                return false;
            }
            const isDynamic = nodeSegment.startsWith('[') && nodeSegment.endsWith(']');

            // For dynamic segments, just verify the active segment exists
            if (isDynamic) {
                return activeSegment.length > 0;
            }

            // For static segments, do exact match after cleaning escapes
            return nodeSegment.replace(/\\/g, '') === activeSegment.replace(/\\/g, '');
        });
    }

    public setActivePath(frameId: string, path: string) {
        this.activeRoutesByFrameId[frameId] = path;
        if (frameId === this.getActiveFrame()?.frame.id) {
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
        if (this.editorEngine?.frames) {
            // If no pages, clear active states by using empty path
            const pathToUse = pages.length === 0 ? '' : this.currentPath;
            this.updateActiveStates(this.pages, pathToUse);
        }
    }

    async scanPages() {
        try {
            const projectId = this.projectManager.project?.id;

            if (!projectId) {
                console.warn('No project ID found');
                this.setPages([]); // Clears pages when no project
                return;
            }

            if (this.editorEngine?.sandbox?.session?.session) {
                try {
                    const realPages = await scanPagesFromSandbox(this.editorEngine.sandbox.session.session);
                    this.setPages(realPages);
                    return;
                } catch (error) {
                    console.error('Failed to scan pages from sandbox:', error);
                    this.setPages([]);
                }
            } else {
                console.log('Sandbox session not available');
                this.setPages([]);
            }
        } catch (error) {
            console.error('Failed to scan pages:', error);
            this.setPages([]);
        }
    }

    public async createPage(baseRoute: string, pageName: string): Promise<void> {
        const projectId = this.projectManager.project?.id;
        if (!projectId) {
            throw new Error('No project ID found');
        }

        const { valid, error } = validateNextJsRoute(pageName);
        if (!valid) {
            throw new Error(error);
        }

        const normalizedPath = normalizeRoute(`${baseRoute}/${pageName}`);

        if (doesRouteExist(this.pages, normalizedPath)) {
            throw new Error('This page already exists');
        }

        const session = this.editorEngine?.sandbox?.session?.session;
        if (!session) {
            throw new Error('No sandbox session available');
        }

        try {
            await createPageInSandbox(session, normalizedPath);
            await this.scanPages();
            sendAnalytics('page create');
        } catch (error) {
            console.error('Failed to create page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async renamePage(oldPath: string, newName: string): Promise<void> {
        const projectId = this.projectManager.project?.id;
        if (!projectId) {
            throw new Error('No project ID found');
        }

        const { valid, error } = validateNextJsRoute(newName);
        if (!valid) {
            throw new Error(error);
        }

        if (doesRouteExist(this.pages, `/${newName}`)) {
            throw new Error('A page with this name already exists');
        }

        const session = this.editorEngine?.sandbox?.session?.session;
        if (!session) {
            throw new Error('No sandbox session available');
        }

        try {
            await renamePageInSandbox(session, oldPath, newName);
            await this.scanPages();
            sendAnalytics('page rename');
        } catch (error) {
            console.error('Failed to rename page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async duplicatePage(sourcePath: string, targetPath: string): Promise<void> {
        const projectId = this.projectManager.project?.id;
        if (!projectId) {
            throw new Error('No project ID found');
        }

        const session = this.editorEngine?.sandbox?.session?.session;
        if (!session) {
            throw new Error('No sandbox session available');
        }

        try {
            await duplicatePageInSandbox(
                session,
                normalizeRoute(sourcePath),
                normalizeRoute(targetPath)
            );
            await this.scanPages();
            sendAnalytics('page duplicate');
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async deletePage(pageName: string, isDir: boolean): Promise<void> {
        const projectId = this.projectManager.project?.id;
        if (!projectId) {
            throw new Error('No project ID found');
        }

        const normalizedPath = normalizeRoute(`${pageName}`);
        if (normalizedPath === '' || normalizedPath === '/') {
            throw new Error('Cannot delete root page');
        }

        const session = this.editorEngine?.sandbox?.session?.session;
        if (!session) {
            throw new Error('No sandbox session available');
        }

        try {
            await deletePageInSandbox(session, normalizedPath, isDir);
            await this.scanPages();
            sendAnalytics('page delete');
        } catch (error) {
            console.error('Failed to delete page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async updateMetadataPage(pagePath: string, metadata: PageMetadata) {
        const projectId = this.projectManager.project?.id;
        if (!projectId) {
            throw new Error('No project ID found');
        }

        if (!doesRouteExist(this.pages, pagePath)) {
            throw new Error('A page with this name does not exist');
        }

        const session = this.editorEngine?.sandbox?.session?.session;
        if (!session) {
            throw new Error('No sandbox session available');
        }

        try {
            await updatePageMetadataInSandbox(session, pagePath, metadata);
            await this.scanPages();
        } catch (error) {
            console.error('Failed to update metadata:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    async navigateTo(path: string) {
        const frameView = this.getActiveFrame();

        if (!frameView) {
            console.warn('No frameView available');
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
            const currentUrl = frameView.view.src;
            const baseUrl = currentUrl ? new URL(currentUrl).origin : null;

            if (!baseUrl) {
                console.warn('No base URL found');
                return;
            }

            await frameView.view.loadURL(`${baseUrl}${path}`);
            this.setActivePath(frameView.frame.id, originalPath);
            await frameView.view.processDom();

            sendAnalytics('page navigate');
        } catch (error) {
            console.error('Navigation failed:', error);
        }
    }

    public setCurrentPath(path: string) {
        this.currentPath = path;
    }

    public handleFrameUrlChange(frameId: string) {
        if (!this.editorEngine?.frames) {
            return;
        }

        const frameView = this.editorEngine.frames.get(frameId);
        if (!frameView) {
            return;
        }

        try {
            const url = frameView.view.src;
            if (!url) {
                return;
            }

            const urlObj = new URL(url);
            const path = urlObj.pathname;
            const activePath = this.groupedRoutes ? this.groupedRoutes : path;
            this.setActivePath(frameId, activePath);
        } catch (error) {
            console.error('Failed to parse URL:', error);
        }
    }

    clear() {
        this.pages = [];
        this.currentPath = '';
        this.activeRoutesByFrameId = {};
        this.groupedRoutes = '';
    }
}
