import { makeAutoObservable } from 'mobx';
import type { PageNode } from '@onlook/models/pages';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { EditorEngine } from '..';
import { WebviewState } from '../webview';

export class PagesManager {
    private pages: PageNode[] = [];
    private currentPath: string = '';

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        this.scanPages();
    }

    get tree() {
        return this.pages;
    }

    private setPages(pages: PageNode[]) {
        this.pages = pages;
        this.updateActiveStates(this.pages, this.currentPath);
    }

    async scanPages() {
        try {
            const projectRoot = this.editorEngine.projectFolderPath;
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
            this.editorEngine.webviews.getActiveWebview() || this.editorEngine.webviews.getAll()[0];

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
            this.editorEngine.webviews.deselectAll();
            this.editorEngine.webviews.select(webview);
            webview.focus();

            const currentUrl = await webview.getURL();
            const baseUrl = currentUrl ? new URL(currentUrl).origin : null;

            if (!baseUrl) {
                console.warn('No base URL found');
                return;
            }

            await webview.loadURL(`${baseUrl}${path}`);
            this.setCurrentPath(path);
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
