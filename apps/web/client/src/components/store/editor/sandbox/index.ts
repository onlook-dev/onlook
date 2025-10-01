import { CodeProviderSync } from '@/services/sync-engine/sync-engine';
import type { Provider } from '@onlook/code-provider';
import { EXCLUDED_SYNC_DIRECTORIES, NEXT_JS_FILE_EXTENSIONS, PRELOAD_SCRIPT_SRC } from '@onlook/constants';
import { FileSystem, type FileEntry } from '@onlook/file-system';
import { RouterType, type Branch } from '@onlook/models';
import { getAstFromContent, injectPreloadScript, getContentFromAst } from '@onlook/parser';
import { normalizePath, isRootLayoutFile } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import path from 'path';
import type { EditorEngine } from '../engine';
import type { ErrorManager } from '../error';
import { detectRouterConfig } from '../pages/helper';
import { SessionManager } from './session';

export class SandboxManager {
    readonly session: SessionManager;
    private providerReactionDisposer?: () => void;
    private fs: FileSystem | null = null;
    private sync: CodeProviderSync | null = null;
    preloadScriptInjected: boolean = false;

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
        if (!this.session.provider) {
            throw new Error('Provider not initialized');
        }
        return await detectRouterConfig(this.session.provider);
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
        
        // Rebuild the index after all files have been synced
        await codeEditorApi.rebuildIndex();
        
        // Now that filesystem is ready, ensure preload script exists
        await this.copyPreloadScriptToPublic(provider);
    }
    
    async ensurePreloadScriptExists(): Promise<boolean> {
        if (this.preloadScriptInjected) {
            return true;
        }
        
        if (!this.session.provider) {
            console.warn('[SandboxManager] No provider available for preload script injection');
            return false;
        }
        
        // Check if script already exists before trying to copy
        try {
            const existingScript = await this.session.provider.readFile({
                args: { path: 'public/onlook-preload-script.js' }
            });
            if (existingScript.file.content && existingScript.file.content.length > 0) {
                this.preloadScriptInjected = true;
                return true;
            }
        } catch { } // File doesn't exist, continue with copying
        
        return await this.copyPreloadScriptToPublic(this.session.provider);
    }
    
    private async copyPreloadScriptToPublic(provider: Provider): Promise<boolean> {
        try {            
            
            try {
                await provider.statFile({ args: { path: 'public' } });
            } catch {
                try {
                    await provider.createDirectory({ args: { path: 'public' } });
                } catch (dirError: any) {
                    // Directory might already exist, continue if that's the case
                    if (!dirError?.message?.includes('exists') && !dirError?.message?.includes('AlreadyExists')) {
                        throw dirError;
                    }
                }
            }

            const scriptResponse = await fetch(PRELOAD_SCRIPT_SRC);
            await provider.writeFile({
                args: {
                    path: 'public/onlook-preload-script.js',
                    content: await scriptResponse.text(),
                    overwrite: true
                }
            });
            
            await this.injectPreloadScriptIntoLayout(provider);
            
            this.preloadScriptInjected = true;
            return true;
            
        } catch (error) {
            console.error('[SandboxManager] Failed to copy preload script:', error);
            return false;
        }
    }

    private async injectPreloadScriptIntoLayout(provider: Provider): Promise<void> {
        const routerConfig = await this.getRouterConfig();
        if (!routerConfig) {
            throw new Error('Could not detect router type for script injection. This is required for iframe communication.');
        }

        // List all files in the router base path and find layout files
        const result = await provider.listFiles({ args: { path: routerConfig.basePath } });
        const layoutFiles = result.files.filter(file => 
            file.type === 'file' && isRootLayoutFile(`${routerConfig.basePath}/${file.name}`, routerConfig.type)
        );

        if (layoutFiles.length === 0) {
            throw new Error(`No layout files found in ${routerConfig.basePath}`);
        }

        // Process the first layout file found
        const layoutFile = layoutFiles[0]!;
        const layoutPath = `${routerConfig.basePath}/${layoutFile.name}`;
        
        const layoutResponse = await provider.readFile({ args: { path: layoutPath } });
        if (!layoutResponse.file.content || typeof layoutResponse.file.content !== 'string') {
            throw new Error(`Layout file ${layoutPath} has no content`);
        }
        
        const content = layoutResponse.file.content;
        const ast = getAstFromContent(content);
        if (!ast) {
            throw new Error(`Failed to parse layout file: ${layoutPath}`);
        }
        
        injectPreloadScript(ast);
        const modifiedContent = await getContentFromAst(ast, content);
        
        await provider.writeFile({
            args: {
                path: layoutPath,
                content: modifiedContent,
                overwrite: true
            }
        });
        
        console.log(`[SandboxManager] ✅ Successfully injected preload script into ${layoutPath}`);
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
        this.preloadScriptInjected = false;
        this.session.clear();
    }
}
