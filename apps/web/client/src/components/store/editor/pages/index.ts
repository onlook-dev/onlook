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
    validateNextJsRoute,
} from './helper';

export class PagesManager {
    private pages: PageNode[] = [];
    private activeRoutesByFrameId: Record<string, string> = {};
    private currentPath = '';
    private groupedRoutes = '';
    private _isScanning = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get tree() {
        return this.pages;
    }

    get activeRoute(): string | undefined {
        const frame = this.getActiveFrame();
        return frame ? this.activeRoutesByFrameId[frame.frame.id] : undefined;
    }

    get isScanning() {
        return this._isScanning;
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
            if (this._isScanning) {
                return;
            }
            this._isScanning = true;
            if (this.editorEngine?.sandbox?.session?.provider) {
                try {
                    const realPages = await scanPagesFromSandbox(this.editorEngine.sandbox);

                    this.setPages(realPages);
                    this._isScanning = false;
                    return;
                } catch (error) {
                    console.error('Failed to scan pages from sandbox:', error);
                    this.setPages([]);
                    this._isScanning = false;
                }
            } else {
                console.log('Sandbox provider not available');
                this.setPages([]);
            }
        } catch (error) {
            console.error('Failed to scan pages:', error);
            this.setPages([]);
        } finally {
            this._isScanning = false;
        }
    }

    public async createPage(baseRoute: string, pageName: string): Promise<void> {
        const { valid, error } = validateNextJsRoute(pageName);
        if (!valid) {
            throw new Error(error);
        }

        const normalizedPath = normalizeRoute(`${baseRoute}/${pageName}`);

        if (doesRouteExist(this.pages, normalizedPath)) {
            throw new Error('This page already exists');
        }

        try {
            await createPageInSandbox(this.editorEngine.sandbox, normalizedPath);
            await this.scanPages();
            this.editorEngine.posthog.capture('page_create');
        } catch (error) {
            console.error('Failed to create page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async renamePage(oldPath: string, newName: string): Promise<void> {
        const { valid, error } = validateNextJsRoute(newName);
        if (!valid) {
            throw new Error(error);
        }

        if (doesRouteExist(this.pages, `/${newName}`)) {
            throw new Error('A page with this name already exists');
        }

        try {
            await renamePageInSandbox(this.editorEngine.sandbox, oldPath, newName);
            await this.scanPages();
            this.editorEngine.posthog.capture('page_rename');
        } catch (error) {
            console.error('Failed to rename page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async duplicatePage(sourcePath: string, targetPath: string): Promise<void> {
        try {
            await duplicatePageInSandbox(
                this.editorEngine.sandbox,
                normalizeRoute(sourcePath),
                normalizeRoute(targetPath),
            );
            await this.scanPages();
            this.editorEngine.posthog.capture('page_duplicate');
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async deletePage(pageName: string, isDir: boolean): Promise<void> {
        const normalizedPath = normalizeRoute(`${pageName}`);
        if (normalizedPath === '' || normalizedPath === '/') {
            throw new Error('Cannot delete root page');
        }

        try {
            await deletePageInSandbox(this.editorEngine.sandbox, normalizedPath, isDir);
            await this.scanPages();
            this.editorEngine.posthog.capture('page_delete');
        } catch (error) {
            console.error('Failed to delete page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    public async updateMetadataPage(pagePath: string, metadata: PageMetadata) {
        if (!doesRouteExist(this.pages, pagePath)) {
            throw new Error('A page with this name does not exist');
        }

        try {
            await updatePageMetadataInSandbox(this.editorEngine.sandbox, pagePath, metadata);
            await this.scanPages();
        } catch (error) {
            console.error('Failed to update metadata:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    async navigateTo(path: string, addToHistory = true) {
        const frameData = this.getActiveFrame();

        if (!frameData?.view) {
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

        await this.editorEngine.frames.navigateToPath(frameData.frame.id, path, addToHistory);
        this.setActivePath(frameData.frame.id, originalPath);
    }

    public setCurrentPath(path: string) {
        this.currentPath = path;
    }

    public handleFrameUrlChange(frameId: string) {
        if (!this.editorEngine?.frames) {
            return;
        }

        const frameData = this.editorEngine.frames.get(frameId);
        if (!frameData?.view) {
            console.error('No frame view found');
            return;
        }

        try {
            const url = frameData.view.src;
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
