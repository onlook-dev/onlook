/**
 * LocalProvider - 本地 VSCode/Cursor 扩展桥接 Provider
 *
 * 通过 WebSocket 连接本地 VSCode/Cursor 扩展，实现文件操作、
 * 终端管理、开发服务器管理等功能。
 *
 * 通信流程：
 * Web 客户端 → WebSocket → VSCode 扩展 → 本地文件系统
 *
 * 协议对齐扩展端的 AgentMessage 格式，方法名对齐 AgentMethods 常量。
 */

import type { SandboxFile } from '@onlook/models';
import {
    Provider,
    ProviderBackgroundCommand,
    ProviderFileWatcher,
    ProviderTask,
    ProviderTerminal,
    type CopyFileOutput,
    type CopyFilesInput,
    type CreateDirectoryInput,
    type CreateDirectoryOutput,
    type CreateProjectInput,
    type CreateProjectOutput,
    type CreateSessionInput,
    type CreateSessionOutput,
    type CreateTerminalInput,
    type CreateTerminalOutput,
    type DeleteFilesInput,
    type DeleteFilesOutput,
    type DownloadFilesInput,
    type DownloadFilesOutput,
    type GetTaskInput,
    type GetTaskOutput,
    type GitStatusInput,
    type GitStatusOutput,
    type InitializeInput,
    type InitializeOutput,
    type ListFilesInput,
    type ListFilesOutput,
    type ListProjectsInput,
    type ListProjectsOutput,
    type PauseProjectInput,
    type PauseProjectOutput,
    type ReadFileInput,
    type ReadFileOutput,
    type RenameFileInput,
    type RenameFileOutput,
    type SetupInput,
    type SetupOutput,
    type StatFileInput,
    type StatFileOutput,
    type StopProjectInput,
    type StopProjectOutput,
    type TerminalBackgroundCommandInput,
    type TerminalBackgroundCommandOutput,
    type TerminalCommandInput,
    type TerminalCommandOutput,
    type WatchEvent,
    type WatchFilesInput,
    type WatchFilesOutput,
    type WriteFileInput,
    type WriteFileOutput,
} from '../../types';
import {
    ConnectionState,
    type LocalConfig,
    type LocalProviderOptions,
    type WsMessage,
} from './types';

export type { LocalProviderOptions, DevServerStatusEvent, LocalConfig } from './types';
export { ConnectionState } from './types';

// ==================== 方法名常量（与扩展端 AgentMethods 对齐） ====================

const Methods = {
    HANDSHAKE: 'connect.handshake',
    PING: 'connect.ping',
    FILE_READ: 'file.read',
    FILE_WRITE: 'file.write',
    FILE_DELETE: 'file.delete',
    FILE_LIST: 'file.list',
    FILE_RENAME: 'file.rename',
    FILE_STAT: 'file.stat',
    FILE_MKDIR: 'file.mkdir',
    FILE_WATCH_START: 'file.watch.start',
    FILE_WATCH_STOP: 'file.watch.stop',
    TERMINAL_CREATE: 'terminal.create',
    TERMINAL_WRITE: 'terminal.write',
    TERMINAL_KILL: 'terminal.kill',
    DEV_SERVER_START: 'devServer.start',
    DEV_SERVER_STOP: 'devServer.stop',
    DEV_SERVER_RESTART: 'devServer.restart',
    PROJECT_CREATE: 'project.create',
    IDE_OPEN_FILE: 'ide.openFile',
    IDE_OPEN_FOLDER: 'ide.openFolder',
} as const;

const Events = {
    FILE_CHANGED: 'file.changed',
    FILE_CREATED: 'file.created',
    FILE_DELETED: 'file.deleted',
    DEV_SERVER_STATUS: 'devServer.status',
    TERMINAL_OUTPUT: 'terminal.output',
} as const;

// ==================== 工具函数 ====================

/** 生成唯一消息 ID */
function generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ==================== LocalProvider ====================

export class LocalProvider extends Provider {
    /** 配置选项（包内可见，供子类使用） */
    readonly options: LocalProviderOptions;

    /** 更新本地配置（用于设置 UI 保存后同步新配置到 provider） */
    updateLocalConfig(localConfig: LocalConfig): void {
        (this.options as { localConfig?: LocalConfig }).localConfig = localConfig;
    }

    /** WebSocket 实例 */
    private ws: WebSocket | null = null;

    /** 连接状态 */
    private _state: ConnectionState = ConnectionState.DISCONNECTED;

    /** 待响应的请求 Map（id → resolve/reject） */
    private pendingRequests: Map<string, {
        resolve: (result: unknown) => void;
        reject: (error: Error) => void;
        timeout: ReturnType<typeof setTimeout>;
    }> = new Map();

    /** 文件变更事件回调（包内可见，供 LocalFileWatcher 使用） */
    fileChangeCallbacks: ((event: WatchEvent) => Promise<void>)[] = [];

    /** 重连定时器 */
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    /** 请求超时时间（毫秒） */
    private readonly REQUEST_TIMEOUT = 30000;

    /** 最大重连间隔（毫秒） */
    private readonly MAX_RECONNECT_DELAY = 30000;

    /** 重连次数 */
    private reconnectAttempts = 0;

    /** 是否已销毁 */
    private destroyed = false;

    constructor(options: LocalProviderOptions) {
        super();
        this.options = options;
    }

    /** 获取当前连接状态 */
    get state(): ConnectionState {
        return this._state;
    }

    // ==================== 连接管理 ====================

    /**
     * 建立 WebSocket 连接并完成握手
     */
    private async connect(): Promise<void> {
        if (this.destroyed) {
            throw new Error('LocalProvider 已销毁');
        }

        if (this._state === ConnectionState.CONNECTED || this._state === ConnectionState.CONNECTING) {
            return;
        }

        this._state = ConnectionState.CONNECTING;

        return new Promise<void>((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.options.wsUrl);
            } catch (error) {
                this._state = ConnectionState.DISCONNECTED;
                reject(new Error(`WebSocket 创建失败: ${error}`));
                return;
            }

            const connectTimeout = setTimeout(() => {
                if (this._state !== ConnectionState.CONNECTED) {
                    this.ws?.close();
                    this._state = ConnectionState.DISCONNECTED;
                    reject(new Error('WebSocket 连接超时'));
                }
            }, 10000);

            this.ws.onopen = () => {
                clearTimeout(connectTimeout);
                // 连接已建立，发送握手消息
                this.sendHandshake()
                    .then(() => {
                        this._state = ConnectionState.CONNECTED;
                        this.reconnectAttempts = 0;
                        resolve();
                    })
                    .catch((error) => {
                        this._state = ConnectionState.DISCONNECTED;
                        reject(error);
                    });
            };

            this.ws.onerror = (event) => {
                clearTimeout(connectTimeout);
                this._state = ConnectionState.DISCONNECTED;
                reject(new Error(`WebSocket 连接错误: ${event}`));
            };

            this.ws.onclose = () => {
                clearTimeout(connectTimeout);
                const wasConnected = this._state === ConnectionState.CONNECTED;
                this._state = ConnectionState.DISCONNECTED;
                this.ws = null;

                // 如果之前已连接且未被主动销毁，尝试重连
                if (wasConnected && !this.destroyed) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data as string);
            };
        });
    }

    /**
     * 发送握手请求
     */
    private async sendHandshake(): Promise<void> {
        const result = await this.sendRequest(Methods.HANDSHAKE, {
            token: this.options.token,
            projectPath: this.options.projectPath,
        }) as Record<string, unknown>;

        if (!result.success) {
            throw new Error('握手验证失败');
        }
    }

    /**
     * 安排重连
     */
    private scheduleReconnect(): void {
        if (this.destroyed || this.reconnectTimer) {
            return;
        }

        // 指数退避：1s, 2s, 4s, 8s, 16s, 30s, 30s...
        const delay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            this.MAX_RECONNECT_DELAY
        );

        this._state = ConnectionState.RECONNECTING;
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.connect();
            } catch (error) {
                // connect 内部会在 onclose 中再次安排重连
            }
        }, delay);
    }

    /**
     * 发送请求并等待响应（包内可见，供 LocalFileWatcher/LocalTerminal 等使用）
     */
    sendRequest(method: string, params?: unknown): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error(`WebSocket 未连接，无法发送 ${method}`));
                return;
            }

            const id = generateId();
            const message: WsMessage = {
                id,
                type: 'request',
                method,
                params,
            };

            // 设置请求超时
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`请求超时: ${method} (${id})`));
            }, this.REQUEST_TIMEOUT);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            this.ws.send(JSON.stringify(message));
        });
    }

    /**
     * 处理收到的 WebSocket 消息
     */
    private handleMessage(data: string): void {
        let message: WsMessage;
        try {
            message = JSON.parse(data);
        } catch {
            console.error('[LocalProvider] 消息解析失败:', data);
            return;
        }

        if (message.type === 'response') {
            // 处理请求响应
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(message.id);

                if (message.error) {
                    pending.reject(new Error(`[${message.error.code}] ${message.error.message}`));
                } else {
                    pending.resolve(message.result);
                }
            }
        } else if (message.type === 'event') {
            // 处理推送事件
            this.handleEvent(message.method, message.params);
        }
    }

    /**
     * 处理推送事件
     */
    private handleEvent(method: string, params: unknown): void {
        switch (method) {
            case Events.FILE_CHANGED:
            case Events.FILE_CREATED:
            case Events.FILE_DELETED: {
                const eventParams = params as { type: string; path: string };
                const watchEvent: WatchEvent = {
                    type: eventParams.type as WatchEvent['type'],
                    paths: [eventParams.path],
                };
                for (const callback of this.fileChangeCallbacks) {
                    callback(watchEvent).catch((err) => {
                        console.error('[LocalProvider] 文件变更回调错误:', err);
                    });
                }
                break;
            }
            case Events.DEV_SERVER_STATUS: {
                // Dev Server 状态变更事件
                console.info('[LocalProvider] Dev Server 状态变更:', params);
                if (this.options.onDevServerStatus) {
                    this.options.onDevServerStatus(params as import('./types').DevServerStatusEvent);
                }
                break;
            }
            case Events.TERMINAL_OUTPUT: {
                // 终端输出事件，由 LocalTerminal 实例处理
                const outputParams = params as { terminalId: string; data: string };
                this.terminalOutputCallbacks.get(outputParams.terminalId)?.(outputParams.data);
                break;
            }
            default:
                console.warn('[LocalProvider] 未知事件:', method);
        }
    }

    /** 终端输出回调 Map（terminalId → callback） */
    private terminalOutputCallbacks: Map<string, (data: string) => void> = new Map();

    /**
     * 注册终端输出回调
     */
    registerTerminalOutput(terminalId: string, callback: (data: string) => void): void {
        this.terminalOutputCallbacks.set(terminalId, callback);
    }

    /**
     * 取消注册终端输出回调
     */
    unregisterTerminalOutput(terminalId: string): void {
        this.terminalOutputCallbacks.delete(terminalId);
    }

    // ==================== Provider 接口实现 ====================

    async initialize(_input: InitializeInput): Promise<InitializeOutput> {
        await this.connect();
        return {};
    }

    async writeFile(input: WriteFileInput): Promise<WriteFileOutput> {
        await this.sendRequest(Methods.FILE_WRITE, {
            path: input.args.path,
            content: input.args.content,
            overwrite: input.args.overwrite,
        });
        return { success: true };
    }

    async renameFile(input: RenameFileInput): Promise<RenameFileOutput> {
        await this.sendRequest(Methods.FILE_RENAME, {
            oldPath: input.args.oldPath,
            newPath: input.args.newPath,
        });
        return {};
    }

    async statFile(input: StatFileInput): Promise<StatFileOutput> {
        const result = await this.sendRequest(Methods.FILE_STAT, {
            path: input.args.path,
        }) as Record<string, unknown>;
        return {
            type: (result.type as 'file' | 'directory') ?? 'file',
            isSymlink: result.isSymlink as boolean | undefined,
            size: result.size as number | undefined,
            mtime: result.mtime as number | undefined,
        };
    }

    async deleteFiles(input: DeleteFilesInput): Promise<DeleteFilesOutput> {
        await this.sendRequest(Methods.FILE_DELETE, {
            path: input.args.path,
            recursive: input.args.recursive,
        });
        return {};
    }

    async listFiles(input: ListFilesInput): Promise<ListFilesOutput> {
        const result = await this.sendRequest(Methods.FILE_LIST, {
            path: input.args.path,
        }) as { files: Array<{ name: string; type: string; isSymlink: boolean }> };
        return {
            files: result.files.map((f) => ({
                name: f.name,
                type: f.type as 'file' | 'directory',
                isSymlink: f.isSymlink,
            })),
        };
    }

    async readFile(input: ReadFileInput): Promise<ReadFileOutput> {
        const result = await this.sendRequest(Methods.FILE_READ, {
            path: input.args.path,
        }) as { content: string; type: string };

        // 构建 SandboxFile 兼容的返回对象
        const fileContent = result.content;
        const filePath = input.args.path;
        const file: SandboxFile & { toString: () => string } = {
            path: filePath,
            content: fileContent,
            type: 'text',
            toString: () => fileContent,
        };

        return { file };
    }

    async downloadFiles(input: DownloadFilesInput): Promise<DownloadFilesOutput> {
        // 本地环境直接返回文件路径，不需要下载
        return { url: input.args.path };
    }

    async copyFiles(input: CopyFilesInput): Promise<CopyFileOutput> {
        // 扩展端暂未实现 file.copy，通过读取 + 写入模拟
        const readResult = await this.sendRequest(Methods.FILE_READ, {
            path: input.args.sourcePath,
        }) as { content: string };
        await this.sendRequest(Methods.FILE_WRITE, {
            path: input.args.targetPath,
            content: readResult.content,
            overwrite: input.args.overwrite,
        });
        return {};
    }

    async createDirectory(input: CreateDirectoryInput): Promise<CreateDirectoryOutput> {
        await this.sendRequest(Methods.FILE_MKDIR, {
            path: input.args.path,
        });
        return {};
    }

    async watchFiles(input: WatchFilesInput): Promise<WatchFilesOutput> {
        const watcher = new LocalFileWatcher(this, input.args.path);
        await watcher.start(input);

        // 注册文件变更回调
        if (input.onFileChange) {
            this.fileChangeCallbacks.push(input.onFileChange);
        }

        return { watcher };
    }

    async createTerminal(_input: CreateTerminalInput): Promise<CreateTerminalOutput> {
        const result = await this.sendRequest(Methods.TERMINAL_CREATE, {
            cwd: this.options.projectPath,
        }) as { terminalId: string };

        const terminal = new LocalTerminal(this, result.terminalId);
        return { terminal };
    }

    async getTask(input: GetTaskInput): Promise<GetTaskOutput> {
        // 本地环境将 dev server 作为 task 返回
        const task = new LocalTask(this, input.args.id);
        return { task };
    }

    async runCommand(input: TerminalCommandInput): Promise<TerminalCommandOutput> {
        // 创建临时终端执行命令
        const termResult = await this.sendRequest(Methods.TERMINAL_CREATE, {
            cwd: this.options.projectPath,
        }) as { terminalId: string };

        await this.sendRequest(Methods.TERMINAL_WRITE, {
            terminalId: termResult.terminalId,
            data: input.args.command + '\n',
        });

        return { output: '' };
    }

    async runBackgroundCommand(
        input: TerminalBackgroundCommandInput,
    ): Promise<TerminalBackgroundCommandOutput> {
        const termResult = await this.sendRequest(Methods.TERMINAL_CREATE, {
            cwd: this.options.projectPath,
        }) as { terminalId: string };

        await this.sendRequest(Methods.TERMINAL_WRITE, {
            terminalId: termResult.terminalId,
            data: input.args.command + '\n',
        });

        const command = new LocalBackgroundCommand(this, termResult.terminalId, input.args.command);
        return { command };
    }

    async gitStatus(_input: GitStatusInput): Promise<GitStatusOutput> {
        // 本地 git 操作暂不通过 WebSocket，直接返回空
        // 可在后续版本中添加扩展端 git 支持
        return { changedFiles: [] };
    }

    async setup(_input: SetupInput): Promise<SetupOutput> {
        return {};
    }

    async createSession(_input: CreateSessionInput): Promise<CreateSessionOutput> {
        // 本地环境不需要创建 session，WebSocket 连接即 session
        return {};
    }

    async reload(): Promise<boolean> {
        try {
            await this.reconnect();
            return true;
        } catch {
            return false;
        }
    }

    async reconnect(): Promise<void> {
        // 清理旧连接
        this.cleanupConnection();

        // 重置重连次数，因为这是主动重连
        this.reconnectAttempts = 0;

        // 建立新连接
        await this.connect();
    }

    async ping(): Promise<boolean> {
        try {
            const result = await this.sendRequest(Methods.PING);
            return (result as { pong: boolean })?.pong === true;
        } catch {
            return false;
        }
    }

    static async createProject(_input: CreateProjectInput): Promise<CreateProjectOutput> {
        // 本地项目创建由 VSCode 扩展处理
        throw new Error('LocalProvider.createProject 应由 VSCode 扩展处理');
    }

    static async createProjectFromGit(_input: {
        repoUrl: string;
        branch: string;
    }): Promise<CreateProjectOutput> {
        throw new Error('LocalProvider.createProjectFromGit 应由 VSCode 扩展处理');
    }

    async pauseProject(_input: PauseProjectInput): Promise<PauseProjectOutput> {
        // 本地环境不需要暂停
        return {};
    }

    async stopProject(_input: StopProjectInput): Promise<StopProjectOutput> {
        // 通知扩展停止 dev server
        await this.sendRequest(Methods.DEV_SERVER_STOP, {
            projectPath: this.options.projectPath,
        });
        return {};
    }

    async listProjects(_input: ListProjectsInput): Promise<ListProjectsOutput> {
        return {};
    }

    async destroy(): Promise<void> {
        this.destroyed = true;

        // 取消重连定时器
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // 拒绝所有待响应的请求
        for (const [id, pending] of this.pendingRequests.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('LocalProvider 已销毁'));
        }
        this.pendingRequests.clear();

        // 清理回调
        this.fileChangeCallbacks = [];
        this.terminalOutputCallbacks.clear();

        // 关闭连接
        this.cleanupConnection();
    }

    /**
     * 清理 WebSocket 连接
     */
    private cleanupConnection(): void {
        if (this.ws) {
            // 移除事件监听，防止 onclose 触发重连
            this.ws.onopen = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            this.ws.onmessage = null;

            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
            this.ws = null;
        }
        this._state = ConnectionState.DISCONNECTED;
    }
}

// ==================== 本地文件监听器 ====================

/**
 * 本地文件监听器
 * 通过 WebSocket 通知扩展端启动/停止 chokidar 监听
 */
export class LocalFileWatcher extends ProviderFileWatcher {
    private provider: LocalProvider;
    private watchPath: string;
    private active = false;

    constructor(provider: LocalProvider, watchPath: string) {
        super();
        this.provider = provider;
        this.watchPath = watchPath;
    }

    async start(input: WatchFilesInput): Promise<void> {
        if (this.active) { return; }

        await this.provider.sendRequest(Methods.FILE_WATCH_START, {
            path: this.watchPath,
            recursive: input.args.recursive,
            excludes: input.args.excludes,
        });
        this.active = true;
    }

    async stop(): Promise<void> {
        if (!this.active) { return; }

        try {
            await this.provider.sendRequest(Methods.FILE_WATCH_STOP, {
                path: this.watchPath,
            });
        } catch {
            // 停止监听失败不阻塞
        }
        this.active = false;
    }

    registerEventCallback(callback: (event: WatchEvent) => Promise<void>): void {
        this.provider.fileChangeCallbacks.push(callback);
    }
}

// ==================== 本地终端 ====================

/**
 * 本地终端
 * 通过 WebSocket 管理扩展端的 VSCode Terminal 实例
 */
export class LocalTerminal extends ProviderTerminal {
    private provider: LocalProvider;
    private _id: string;
    private _name: string;

    constructor(provider: LocalProvider, terminalId: string) {
        super();
        this.provider = provider;
        this._id = terminalId;
        this._name = `Onlook Terminal ${terminalId}`;
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    async open(): Promise<string> {
        // 终端已在扩展端创建，返回 ID
        return this._id;
    }

    async write(input: string): Promise<void> {
        await this.provider.sendRequest(Methods.TERMINAL_WRITE, {
            terminalId: this._id,
            data: input,
        });
    }

    async run(input: string): Promise<void> {
        await this.write(input + '\n');
    }

    async kill(): Promise<void> {
        await this.provider.sendRequest(Methods.TERMINAL_KILL, {
            terminalId: this._id,
        });
        this.provider.unregisterTerminalOutput(this._id);
    }

    onOutput(callback: (data: string) => void): () => void {
        this.provider.registerTerminalOutput(this._id, callback);
        return () => {
            this.provider.unregisterTerminalOutput(this._id);
        };
    }
}

// ==================== 本地任务（Dev Server） ====================

/**
 * 本地任务
 * 将 dev server 作为 task 管理
 */
export class LocalTask extends ProviderTask {
    private provider: LocalProvider;
    private _id: string;

    constructor(provider: LocalProvider, taskId: string) {
        super();
        this.provider = provider;
        this._id = taskId;
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return `Dev Server ${this._id}`;
    }

    get command(): string {
        return this.provider.options.localConfig?.devCommand ?? 'npm run dev';
    }

    async open(): Promise<string> {
        // 本地 provider 无历史输出缓冲，返回空字符串
        return '';
    }

    async run(): Promise<void> {
        await this.provider.sendRequest(Methods.DEV_SERVER_START, {
            projectPath: this.provider.options.projectPath,
            devCommand: this.provider.options.localConfig?.devCommand,
            port: this.provider.options.localConfig?.port,
        });
    }

    async restart(): Promise<void> {
        await this.provider.sendRequest(Methods.DEV_SERVER_RESTART, {
            projectPath: this.provider.options.projectPath,
            devCommand: this.provider.options.localConfig?.devCommand,
            port: this.provider.options.localConfig?.port,
        });
    }

    async stop(): Promise<void> {
        await this.provider.sendRequest(Methods.DEV_SERVER_STOP, {
            projectPath: this.provider.options.projectPath,
        });
    }

    onOutput(callback: (data: string) => void): () => void {
        // 注册回调，用于接收 Dev Server 的 stdout/stderr 输出
        // 使用固定的 'dev' 作为 terminalId，与扩展端的推送保持一致
        this.provider.registerTerminalOutput('dev', callback);
        return () => {
            this.provider.unregisterTerminalOutput('dev');
        };
    }
}

// ==================== 本地后台命令 ====================

/**
 * 本地后台命令
 * 通过终端运行长时命令
 */
export class LocalBackgroundCommand extends ProviderBackgroundCommand {
    private provider: LocalProvider;
    private terminalId: string;
    private _command: string;

    constructor(provider: LocalProvider, terminalId: string, command: string) {
        super();
        this.provider = provider;
        this.terminalId = terminalId;
        this._command = command;
    }

    get name(): string {
        return this._command;
    }

    get command(): string {
        return this._command;
    }

    async open(): Promise<string> {
        return this.terminalId;
    }

    async restart(): Promise<void> {
        await this.provider.sendRequest(Methods.TERMINAL_WRITE, {
            terminalId: this.terminalId,
            data: this._command + '\n',
        });
    }

    async kill(): Promise<void> {
        await this.provider.sendRequest(Methods.TERMINAL_KILL, {
            terminalId: this.terminalId,
        });
    }

    onOutput(callback: (data: string) => void): () => void {
        this.provider.registerTerminalOutput(this.terminalId, callback);
        return () => {
            this.provider.unregisterTerminalOutput(this.terminalId);
        };
    }
}
