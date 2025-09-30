import { CodeProviderSync } from '@/services/sync-engine/sync-engine';
import type {
    Provider
} from '@onlook/code-provider';
import {
    EXCLUDED_SYNC_DIRECTORIES
} from '@onlook/constants';
import { FileSystem, type FileEntry } from '@onlook/file-system';
import { RouterType, type Branch } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import type { ErrorManager } from '../error';
import { SessionManager } from './session';

export class SandboxManager {
    readonly session: SessionManager;
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
            // TODO: add missing configs
            exclude: EXCLUDED_SYNC_DIRECTORIES,
        });
        await this.sync.start();
    }

    get isIndexed() {
        return true;
    }

    get isIndexing() {
        return false;
    }

    get routerConfig(): { type: RouterType; basePath: string } | null {
        return null;
        // return this._routerConfig;
    }

    get errors() {
        return this.errorManager.errors;
    }

    async readFile(path: string): Promise<string | Uint8Array> {
        if (!this.fs) throw new Error('File system not initialized');
        console.log('Reading file', path);
        return this.fs.readFile(path);
    }

    async writeFile(path: string, content: string | Uint8Array): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.writeFile(path, content);
    }

    listAllFiles() {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.listAll();
    }

    async readDir(dir: string): Promise<FileEntry[]> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.readDirectory(dir);
    }

    async listFilesRecursively(
        dir: string
    ): Promise<string[]> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.listFiles(dir);
    }

    async fileExists(path: string): Promise<boolean> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs?.exists(path);
    }

    async copy(
        path: string,
        targetPath: string,
    ): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.copyFile(path, targetPath)
    }

    async deleteFile(path: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.deleteFile(path);
    }

    async deleteDirectory(path: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.deleteDirectory(path);
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.moveFile(oldPath, newPath);
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

    clear() {
        this.providerReactionDisposer?.();
        this.providerReactionDisposer = undefined;
        this.sync?.stop();
        this.sync = null;
        this.fs = null;
        this.session.clear();
    }
}
