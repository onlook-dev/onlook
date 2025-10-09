import { CodeProviderSync } from '@/services/sync-engine/sync-engine';
import type { Provider } from '@onlook/code-provider';
import { EXCLUDED_SYNC_PATHS } from '@onlook/constants';
import type { CodeFileSystem } from '@onlook/file-system';
import { type FileEntry } from '@onlook/file-system';
import type { Branch, RouterConfig } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import type { ErrorManager } from '../error';
import { GitManager } from '../git';
import { detectRouterConfig } from '../pages/helper';
import { copyPreloadScriptToPublic, getLayoutPath as detectLayoutPath } from './preload-script';
import { SessionManager } from './session';

export type SandboxConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export class SandboxManager {
    readonly session: SessionManager;
    readonly gitManager: GitManager;
    private sync: CodeProviderSync | null = null;
    preloadScriptInjected: boolean = false;
    preloadScriptLoading: boolean = false;
    routerConfig: RouterConfig | null = null;

    // Connection state observables
    connectionState: SandboxConnectionState = 'idle';
    connectionError: Error | null = null;
    connectionRetryCount: number = 0;
    private connectionPromise: Promise<void> | null = null;

    constructor(
        private branch: Branch,
        private readonly editorEngine: EditorEngine,
        private readonly errorManager: ErrorManager,
        private readonly fs: CodeFileSystem,
    ) {
        this.session = new SessionManager(this.branch, this.errorManager);
        this.gitManager = new GitManager(this);
        makeAutoObservable(this);
    }

    /**
     * Ensures the sandbox is connected. If already connected, returns immediately.
     * If a connection is in progress, waits for it. Otherwise, starts a new connection.
     */
    async ensureConnected(): Promise<void> {
        // Already connected and healthy
        if (this.connectionState === 'connected' && this.session.provider) {
            return;
        }

        // Connection in progress - wait for it
        if (this.connectionState === 'connecting' && this.connectionPromise) {
            return this.connectionPromise;
        }

        // Start new connection
        return this.connect();
    }

    /**
     * Attempts to connect to the sandbox. Can be called to retry after an error.
     */
    async connect(): Promise<void> {
        this.connectionState = 'connecting';
        this.connectionError = null;

        this.connectionPromise = (async () => {
            try {
                await this.session.start(this.branch.sandbox.id);

                // Initialize sync engine and git after successful connection
                if (this.session.provider) {
                    await this.initializeSyncEngine(this.session.provider);
                    await this.gitManager.init();
                }

                this.connectionState = 'connected';
                this.connectionRetryCount = 0;
                console.log(`[SandboxManager] Successfully connected to sandbox ${this.branch.sandbox.id}`);
            } catch (error) {
                this.connectionState = 'error';
                this.connectionError = error instanceof Error ? error : new Error('Unknown connection error');
                this.connectionRetryCount++;
                console.error(`[SandboxManager] Failed to connect to sandbox ${this.branch.sandbox.id}:`, error);
                throw error;
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    async getRouterConfig(): Promise<RouterConfig | null> {
        if (!!this.routerConfig) {
            return this.routerConfig;
        }
        if (!this.session.provider) {
            throw new Error('Provider not initialized');
        }
        this.routerConfig = await detectRouterConfig(this.session.provider);
        return this.routerConfig;
    }

    async initializeSyncEngine(provider: Provider) {
        if (this.sync) {
            this.sync.release();
            this.sync = null;
        }

        this.sync = CodeProviderSync.getInstance(provider, this.fs, this.branch.sandbox.id, {
            exclude: EXCLUDED_SYNC_PATHS,
        });

        await this.sync.start();
        await this.ensurePreloadScriptExists();
        await this.fs.rebuildIndex();
    }

    private async ensurePreloadScriptExists(): Promise<void> {
        const PRELOAD_SCRIPT_TIMEOUT_MS = 10000;

        try {
            if (this.preloadScriptInjected) {
                return;
            }

            // Ensures multiple frames pointing to the same sandbox don't try to inject the preload script at the same time.
            if (this.preloadScriptLoading) {
                return;
            }
            this.preloadScriptLoading = true;

            if (!this.session.provider) {
                throw new Error('No provider available for preload script injection');
            }

            const routerConfig = await this.getRouterConfig();
            if (!routerConfig) {
                throw new Error('No router config found for preload script injection');
            }

            // Add timeout wrapper
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Preload script injection timeout after ${PRELOAD_SCRIPT_TIMEOUT_MS}ms`));
                }, PRELOAD_SCRIPT_TIMEOUT_MS);
            });

            await Promise.race([
                copyPreloadScriptToPublic(this.session.provider, routerConfig),
                timeoutPromise
            ]);
            this.preloadScriptInjected = true;
        } catch (error) {
            console.error('[SandboxManager] Failed to ensure preload script exists:', error);
            // Mark as injected to prevent blocking frames indefinitely
            // Frames will handle the missing preload script gracefully
            this.preloadScriptInjected = true;
        } finally {
            this.preloadScriptLoading = false;
        }
    }

    async getLayoutPath(): Promise<string | null> {
        const routerConfig = await this.getRouterConfig();
        if (!routerConfig) {
            return null;
        }
        return detectLayoutPath(routerConfig, (path) => this.fileExists(path));
    }

    get errors() {
        return this.errorManager.errors;
    }

    get syncEngine() {
        return this.sync;
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

    async copyFile(path: string, targetPath: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.copyFile(path, targetPath);
    }

    async copyDirectory(path: string, targetPath: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.copyDirectory(path, targetPath);
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
        this.sync?.release();
        this.sync = null;
        this.preloadScriptInjected = false;
        this.session.clear();
    }
}
