import { CodeProviderSync } from '@/services/sync-engine/sync-engine';
import type { Provider } from '@onlook/code-provider';
import { EXCLUDED_SYNC_DIRECTORIES, NEXT_JS_FILE_EXTENSIONS } from '@onlook/constants';
import { FileSystem, type FileEntry } from '@onlook/file-system';
import { RouterType, type Branch } from '@onlook/models';
import { normalizePath } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import path from 'path';
import type { CodeEditorApi } from '@/services/code-editor-api';
import type { EditorEngine } from '../engine';
import type { ErrorManager } from '../error';
import { detectRouterConfig } from '../pages/helper';
import { SessionManager } from './session';

export class SandboxManager {
    readonly session: SessionManager;
    private providerReactionDisposer?: () => void;
    private fs: FileSystem | null = null;
    private sync: CodeProviderSync | null = null;

    constructor(
        private branch: Branch,
        private readonly editorEngine: EditorEngine,
        private readonly errorManager: ErrorManager,
    ) {
        this.session = new SessionManager(this.branch, this.errorManager);
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

    async getRouterConfig() {
        if (!this.fs) throw new Error('File system not initialized');
        return await detectRouterConfig(this.fs);
    }

    async initializeSyncEngine(provider: Provider) {
        if (this.sync) {
            this.sync?.stop();
            this.sync = null;
        }
        
        // Get the CodeEditorApi for this branch
        const codeEditorApi = this.editorEngine.branches.getBranchDataById(this.branch.id)?.codeEditor;
        if (!codeEditorApi) {
            throw new Error('CodeEditorApi not found for branch');
        }
        
        // Initialize the CodeEditorApi and use it as the file system
        await codeEditorApi.initialize();
        this.fs = codeEditorApi;
        
        this.sync = new CodeProviderSync(provider, codeEditorApi, {
            // TODO: add missing configs
            exclude: EXCLUDED_SYNC_DIRECTORIES,
        });
        await this.sync.start();
        
        // Copy preload script to public directory
        await this.copyPreloadScriptToPublic(provider);
    }
    
    private async copyPreloadScriptToPublic(provider: Provider): Promise<void> {
        try {
            console.log('[SandboxManager] Copying preload script to public directory');
            
            // Read the preload script from our public directory
            const scriptResponse = await fetch('/onlook-preload-script.js');
            const scriptContent = await scriptResponse.text();
            console.log('[SandboxManager] Preload script length:', scriptContent.length);
            
            // Check if public directory exists, create if not
            try {
                await provider.statFile({ args: { path: 'public' } });
            } catch {
                console.log('[SandboxManager] Creating public directory');
                await provider.createDirectory({ args: { path: 'public' } });
            }
            
            // Write the script to public/onlook-preload-script.js
            await provider.writeFile({
                args: {
                    path: 'public/onlook-preload-script.js',
                    content: scriptContent,
                    overwrite: true
                }
            });
            
            console.log('[SandboxManager] Successfully copied preload script to public/onlook-preload-script.js');
            
        } catch (error) {
            console.error('[SandboxManager] Failed to copy preload script:', error);
        }
    }

    async getLayoutPath(): Promise<string | null> {
        const routerConfig = await this.getRouterConfig()
        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return null;
        }

        let layoutFileName: string;

        if (routerConfig.type === RouterType.PAGES) {
            layoutFileName = '_app';
        } else {
            layoutFileName = 'layout';
        }

        for (const extension of NEXT_JS_FILE_EXTENSIONS) {
            const layoutPath = path.join(routerConfig.basePath, `${layoutFileName}${extension}`);
            if (await this.fileExists(layoutPath)) {
                return normalizePath(layoutPath);
            }
        }

        console.log('Could not find layout file');
        return null;
    }

    get errors() {
        return this.errorManager.errors;
    }

    async readFile(path: string): Promise<string | Uint8Array> {
        if (!this.fs) throw new Error('File system not initialized');
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

    async listFilesRecursively(dir: string): Promise<string[]> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.listFiles(dir);
    }

    async fileExists(path: string): Promise<boolean> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs?.exists(path);
    }

    async copy(path: string, targetPath: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.copyFile(path, targetPath);
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
