import { CodeProviderSync } from '@/services/sync-engine/sync-engine';
import { api } from '@/trpc/client';
import type { Provider } from '@onlook/code-provider';
import { EXCLUDED_SYNC_PATHS } from '@onlook/constants';
import type { CodeFileSystem } from '@onlook/file-system';
import { type FileEntry } from '@onlook/file-system';
import type { Branch, RouterConfig } from '@onlook/models';
import { ProjectEnvironment } from '@onlook/models';
import { makeAutoObservable, reaction, runInAction } from 'mobx';
import type { EditorEngine } from '../engine';
import type { ErrorManager } from '../error';
import { GitManager } from '../git';
import { detectRouterConfig } from '../pages/helper';
import { copyPreloadScriptToPublic, getLayoutPath as detectLayoutPath } from './preload-script';
import { SessionManager } from './session';

export enum PreloadScriptState {
    NOT_INJECTED = 'not-injected',
    LOADING = 'loading',
    INJECTED = 'injected'
}
export class SandboxManager {
    readonly session: SessionManager;
    readonly gitManager: GitManager;
    private providerReactionDisposer?: () => void;
    private sync: CodeProviderSync | null = null;
    preloadScriptState: PreloadScriptState = PreloadScriptState.NOT_INJECTED
    routerConfig: RouterConfig | null = null;
    /** beforeunload 清理回调（本地环境用） */
    private beforeUnloadHandler?: () => void;
    /** 本地 Agent 连接信息（用于 sendBeacon 清理） */
    private agentPort?: number;
    private agentToken?: string;
    private projectPath?: string;

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

    /** 当前分支的运行环境 */
    get environment(): ProjectEnvironment {
        return this.branch.environment ?? ProjectEnvironment.SANDBOX;
    }

    /** 是否为本地 VSCode 环境 */
    get isLocal(): boolean {
        return this.environment === ProjectEnvironment.LOCAL_VSCODE;
    }

    async init() {
        // 根据环境类型选择不同的初始化方式
        if (this.isLocal) {
            await this.initLocal();
        } else {
            await this.initSandbox();
        }
    }

    /** 初始化本地 VSCode 环境（通过 WebSocket 连接扩展） */
    private async initLocal() {
        console.info('[SandboxManager] 本地环境模式，连接 VSCode 扩展...');

        // 从 URL 参数读取连接信息，用于 sendBeacon 清理
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const localAgent = params.get('localAgent');
            const token = params.get('token');
            const workspacePath = params.get('workspacePath');

            if (localAgent) {
                this.agentPort = parseInt(localAgent, 10);
            }
            if (token) {
                this.agentToken = token;
            }
            if (workspacePath) {
                this.projectPath = workspacePath;
            }
        }

        // 注册 beforeunload：浏览器关闭时使用 sendBeacon 通知扩展停止 Dev Server
        this.beforeUnloadHandler = () => {
            if (this.agentPort && this.agentToken && this.projectPath) {
                const stopUrl = `http://localhost:${this.agentPort}/stop?projectPath=${encodeURIComponent(this.projectPath)}&token=${encodeURIComponent(this.agentToken)}`;
                // sendBeacon 是唯一能在页面卸载时可靠发送的 API
                navigator.sendBeacon(stopUrl);
                console.info('[SandboxManager] 已发送停止 Dev Server 请求');
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this.beforeUnloadHandler);
        }

        // 启动 LocalProvider 连接（从 URL 参数读取 wsUrl 和 token）
        if (!this.session.provider) {
            this.session.start().catch(err => {
                console.error('[SandboxManager] 本地扩展连接失败:', err);
            });
        }

        // 监听 Provider 可用性（当 LocalProvider WebSocket 连接成功后触发）
        this.providerReactionDisposer = reaction(
            () => this.session.provider,
            async (provider) => {
                if (provider) {
                    await this.initializeSyncEngine(provider);
                    await this.gitManager.init();
                    // 本地环境：自动启动 dev server
                    await this.startLocalDevServer();
                } else if (this.sync) {
                    this.sync.release();
                    this.sync = null;
                }
            },
            { fireImmediately: true },
        );
    }

    /**
     * 自动启动本地 dev server 并监听端口
     * 先注册 onOutput 再调用 run()，避免早期 stdout 丢失
     */
    private async startLocalDevServer(): Promise<void> {
        const provider = this.session.provider;
        if (!provider) return;

        try {
            const { task } = await provider.getTask({ args: { id: 'dev' } });
            if (task) {
                // 先注册 onOutput，再调用 run()，确保不丢失早期输出
                const taskSession = [...this.session.terminalSessions.values()]
                    .find(s => s.type === 'task');
                if (taskSession && 'xterm' in taskSession && taskSession.xterm) {
                    task.onOutput((data: string) => {
                        taskSession.xterm?.write(data);
                    });
                }
                await task.run();
                console.info('[SandboxManager] Dev Server 启动请求已发送');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.warn('[SandboxManager] Dev Server 启动失败（可能已在运行）:', errorMsg);
            // 写入 session.devServerStatus，供 LocalDevTab 等 UI 订阅显示
            runInAction(() => {
                this.session.devServerStatus = { status: 'error', error: errorMsg };
            });
        }
    }

    /** 初始化远程沙箱环境（通过 CodeSandbox） */
    private async initSandbox() {
        if (!this.branch.sandbox?.id) {
            console.error('[SandboxManager] 沙箱环境但无 sandboxId');
            return;
        }

        // Start connection asynchronously (don't wait)
        if (!this.session.provider) {
            this.session.start(this.branch.sandbox.id).catch(err => {
                console.error('[SandboxManager] Initial connection failed:', err);
                // Don't throw - let reaction handle retries/reconnects
            });
        }

        // React to provider becoming available (now or later)
        this.providerReactionDisposer = reaction(
            () => this.session.provider,
            async (provider) => {
                if (provider) {
                    await this.initializeSyncEngine(provider);
                    await this.gitManager.init();
                } else if (this.sync) {
                    // If the provider is null, release the sync engine reference
                    this.sync.release();
                    this.sync = null;
                }
            },
            { fireImmediately: true },
        );
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

        // 使用 sandboxId 或本地路径作为同步标识
        const syncId = this.branch.sandbox?.id ?? this.branch.localPath ?? 'local';

        this.sync = CodeProviderSync.getInstance(provider, this.fs, syncId, {
            exclude: EXCLUDED_SYNC_PATHS,
        });

        await this.sync.start();
        await this.ensurePreloadScriptExists();
        await this.fs.rebuildIndex();
    }

    private async ensurePreloadScriptExists(): Promise<void> {
        try {
            if (this.preloadScriptState !== PreloadScriptState.NOT_INJECTED
            ) {
                return;
            }

            this.preloadScriptState = PreloadScriptState.LOADING

            if (!this.session.provider) {
                throw new Error('No provider available for preload script injection');
            }

            const routerConfig = await this.getRouterConfig();
            if (!routerConfig) {
                throw new Error('No router config found for preload script injection');
            }

            await copyPreloadScriptToPublic(this.session.provider, routerConfig);
            this.preloadScriptState = PreloadScriptState.INJECTED
        } catch (error) {
            console.error('[SandboxManager] Failed to ensure preload script exists:', error);
            // Mark as injected to prevent blocking frames indefinitely
            // Frames will handle the missing preload script gracefully
            this.preloadScriptState = PreloadScriptState.NOT_INJECTED
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
        this.providerReactionDisposer?.();
        this.providerReactionDisposer = undefined;
        // 移除 beforeunload 监听
        if (this.beforeUnloadHandler && typeof window !== 'undefined') {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = undefined;
        }
        this.sync?.release();
        this.sync = null;
        this.preloadScriptState = PreloadScriptState.NOT_INJECTED
        this.session.clear();
    }
}
