import { CodeProviderSync } from '@/services/sync-engine/sync-engine';
import type { Provider } from '@onlook/code-provider';
import { EXCLUDED_SYNC_PATHS, NEXT_JS_FILE_EXTENSIONS, PRELOAD_SCRIPT_SRC } from '@onlook/constants';
import { FileSystem, type FileEntry } from '@onlook/file-system';
import { RouterType, type Branch } from '@onlook/models';
import { getAstFromContent, getContentFromAst, injectPreloadScript } from '@onlook/parser';
import { isRootLayoutFile, normalizePath } from '@onlook/utility';
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
    preloadScriptLoading: boolean = false;

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
        
        const codeEditorApi = this.editorEngine.branches.getBranchDataById(this.branch.id)?.codeEditor;
        if (!codeEditorApi) {
            throw new Error('CodeEditorApi not found for branch');
        }
        
        await codeEditorApi.initialize();
        this.fs = codeEditorApi;
        
        this.sync = new CodeProviderSync(provider, codeEditorApi, {
            exclude: EXCLUDED_SYNC_PATHS,
        });

        await this.sync.start();
        await codeEditorApi.rebuildIndex();
    }
    
    async ensurePreloadScriptExists(): Promise<void> {
        // Ensures multiple frames pointing to the same sandbox don't try to inject the preload script at the same time.
        if (this.preloadScriptLoading) {
            return;
        }

        this.preloadScriptLoading = true;

        if (this.preloadScriptInjected) {
            this.preloadScriptLoading = false;
            return;
        }
        
        if (!this.session.provider) {
            console.warn('[SandboxManager] No provider available for preload script injection');
            this.preloadScriptLoading = false;
            return;
        }
        
        await this.copyPreloadScriptToPublic(this.session.provider);
        this.preloadScriptLoading = false;
    }
    
    private async copyPreloadScriptToPublic(provider: Provider): Promise<void> {
        try {            
            try {
                await provider.createDirectory({ args: { path: 'public' } });
            } catch {
                // Directory might already exist, ignore error
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
        } catch (error) {
            console.error('[SandboxManager] Failed to copy preload script:', error);
        }
    }

    private async injectPreloadScriptIntoLayout(provider: Provider): Promise<void> {
        const routerConfig = await this.getRouterConfig();
        if (!routerConfig) {
            throw new Error('Could not detect router type for script injection. This is required for iframe communication.');
        }

        const result = await provider.listFiles({ args: { path: routerConfig.basePath } });
        const [layoutFile] = result.files.filter(file => 
            file.type === 'file' && isRootLayoutFile(`${routerConfig.basePath}/${file.name}`, routerConfig.type)
        );

        if (!layoutFile) {
            throw new Error(`No layout files found in ${routerConfig.basePath}`);
        }

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
