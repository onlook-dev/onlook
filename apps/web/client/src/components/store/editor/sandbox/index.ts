import { CodeProviderSync } from '@/services/sync-engine/sync-engine';
import type {
    ListFilesOutputFile,
    Provider
} from '@onlook/code-provider';
import {
    EXCLUDED_SYNC_DIRECTORIES
} from '@onlook/constants';
import { FileSystem } from '@onlook/file-system';
import { RouterType, type Branch, type SandboxFile } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import type { ErrorManager } from '../error';
import { SessionManager } from './session';

export class SandboxManager {
    readonly session: SessionManager;
    private _isIndexed = false;
    private _isIndexing = false;

    private providerReactionDisposer?: () => void;
    private fs: FileSystem | null = null;
    private sync: CodeProviderSync | null = null;

    constructor(
        private branch: Branch,
        private readonly editorEngine: EditorEngine,
        private readonly errorManager: ErrorManager
    ) {
        this.session = new SessionManager(
            this.branch,
            this.errorManager
        );
        makeAutoObservable(this);
    }

    async init() {
        this.providerReactionDisposer = reaction(
            () => this.session.provider,
            (provider) => {
                if (provider) {
                    this.initializeSyncEngine(provider);
                }
            },
        );
    }

    async initializeSyncEngine(provider: Provider) {
        if (this.sync) {
            this.sync?.stop();
            this.sync = null;
        }
        this.fs = new FileSystem(`/${this.editorEngine.projectId}/${this.branch.id}`);
        await this.fs.initialize();
        this.sync = new CodeProviderSync(provider, this.fs, {
            exclude: EXCLUDED_SYNC_DIRECTORIES,
        });
        await this.sync.start();
    }

    get isIndexed() {
        return this._isIndexed;
    }

    get isIndexing() {
        return this._isIndexing;
    }

    get routerConfig(): { type: RouterType; basePath: string } | null {
        return null;
        // return this._routerConfig;
    }

    get errors() {
        return this.errorManager.errors;
    }

    async readFile(path: string, remote = false): Promise<SandboxFile | null> {
        return null;
    }

    async readFiles(paths: string[]): Promise<Record<string, SandboxFile>> {
        return {};
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        return false;
    }

    async writeBinaryFile(path: string, content: Buffer | Uint8Array): Promise<boolean> {
        return false;
    }

    get files() {
        return [];
    }

    get directories() {
        return [];
    }

    listAllFiles() {
    }

    async readDir(dir: string): Promise<ListFilesOutputFile[]> {
        return [];
    }

    async listFilesRecursively(
        dir: string,
        ignoreDirs: string[] = [],
        ignoreExtensions: string[] = [],
    ): Promise<string[]> {
        return [];
    }

    // Download the code as a zip
    async downloadFiles(
        projectName?: string,
    ): Promise<{ downloadUrl: string; fileName: string } | null> {
        if (!this.session.provider) {
            console.error('No sandbox provider found for download');
            return null;
        }
        try {
            const { url } = await this.session.provider.downloadFiles({
                args: {
                    path: './',
                },
            });
            return {
                // in case there is no URL provided then the code must be updated
                // to handle this case
                downloadUrl: url ?? '',
                fileName: `${projectName ?? 'onlook-project'}-${Date.now()}.zip`,
            };
        } catch (error) {
            console.error('Error generating download URL:', error);
            return null;
        }
    }

    async fileExists(path: string): Promise<boolean> {
        return false;
    }

    async copy(
        path: string,
        targetPath: string,
        recursive?: boolean,
        overwrite?: boolean,
    ): Promise<boolean> {
        return false;
    }

    async delete(path: string, recursive?: boolean): Promise<boolean> {
        return false;
    }

    async rename(oldPath: string, newPath: string): Promise<boolean> {
        return false;
    }

    /**
     * Gets the root layout path and router config
     */
    async getRootLayoutPath(): Promise<string | null> {
        return null;
    }

    clear() {
        this.providerReactionDisposer?.();
        this.providerReactionDisposer = undefined;
        this.sync?.stop();
        this.sync = null;
        this.fs = null;

        this.session.clear();
        this._isIndexed = false;
        this._isIndexing = false;
    }
}
