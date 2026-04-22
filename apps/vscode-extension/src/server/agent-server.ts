/**
 * WebSocket 服务器 - Web 客户端与本地环境的桥接层
 *
 * 职责：
 * 1. 启动 WebSocket 服务器，监听指定端口
 * 2. 处理连接握手和 Token 验证
 * 3. 分发请求消息到对应的处理器
 * 4. 推送事件消息到已连接的客户端
 */

import * as vscode from 'vscode';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
    AgentMessage,
    AgentMethods,
    AgentEvents,
    HandshakeParams,
    createResponse,
    createErrorResponse,
    createEvent,
} from './protocol';
import { SecurityManager } from './security';
import { ProjectManager } from '../project/project-manager';
import { DevServerManager } from '../project/dev-server';
import { TerminalManager } from '../project/terminal-manager';
import { FileOpsManager } from '../files/file-ops';
import { FileWatcherManager } from '../files/file-watcher';
import { IdeLauncher } from '../browser/ide-launcher';

/** 已连接的客户端信息 */
interface ConnectedClient {
    ws: WebSocket;
    projectId?: string;
    origin?: string;
    /** 项目本地路径（握手时传入，用于解析文件操作的相对路径） */
    projectPath?: string;
}

export class AgentServer {
    private wss: WebSocketServer | null = null;
    private server: http.Server | null = null;
    private clients: Map<WebSocket, ConnectedClient> = new Map();

    readonly security: SecurityManager;
    readonly projectManager: ProjectManager;
    readonly devServerManager: DevServerManager;
    readonly terminalManager: TerminalManager;
    private fileOpsManager: FileOpsManager | null = null;
    private fileWatcherManager: FileWatcherManager | null = null;
    private ideLauncher: IdeLauncher;

    /** WebSocket 服务器端口 */
    private _port: number = 9527;

    get port(): number {
        return this._port;
    }

    constructor(private context: vscode.ExtensionContext) {
        this.security = new SecurityManager(context);
        this.projectManager = new ProjectManager(context);
        this.devServerManager = new DevServerManager((method, params) => {
            this.broadcastEvent(method, params);
        });
        this.terminalManager = new TerminalManager((method, params) => {
            this.broadcastEvent(method, params);
        });
        this.ideLauncher = new IdeLauncher(context);
    }

    /** 服务器运行状态 */
    get running(): boolean {
        return this.wss !== null;
    }

    /** 获取服务器状态 */
    getStatus(): { running: boolean; port?: number; clients?: number } {
        if (!this.running) {
            return { running: false };
        }
        return {
            running: true,
            port: this._port,
            clients: this.clients.size,
        };
    }

    /**
     * 启动 WebSocket 服务器
     */
    async start(): Promise<void> {
        const configPort = vscode.workspace
            .getConfiguration('onlook')
            .get<number>('agentPort', 9527);

        try {
            await this.startServer(configPort);
            console.log(`[Onlook] WebSocket 服务器已启动，端口: ${this._port}`);
        } catch (error) {
            // 端口冲突时尝试其他端口
            console.warn(`[Onlook] 端口 ${configPort} 已占用，尝试其他端口...`);
            try {
                await this.startServer(configPort + 1);
                console.log(`[Onlook] WebSocket 服务器已启动，端口: ${this._port}`);
            } catch (error2) {
                vscode.window.showErrorMessage(
                    `[Onlook] 无法启动 WebSocket 服务器: ${error2}`
                );
            }
        }
    }

    /**
     * 停止 WebSocket 服务器
     */
    async stop(): Promise<void> {
        // 关闭所有客户端连接
        for (const [ws] of this.clients.entries()) {
            ws.close();
        }
        this.clients.clear();

        // 停止所有 dev server
        await this.devServerManager.stopAll();

        // 终止所有终端
        await this.terminalManager.killAll();

        // 停止文件监听
        this.fileWatcherManager?.dispose();
        this.fileWatcherManager = null;
        this.fileOpsManager = null;

        // 关闭 WebSocket 服务器
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }

        // 关闭 HTTP 服务器
        if (this.server) {
            await new Promise<void>((resolve) => {
                this.server!.close(() => resolve());
            });
            this.server = null;
        }

        console.log('[Onlook] WebSocket 服务器已停止');
    }

    /**
     * 处理 URI（vscode://onlook.onlook-local）
     */
    async handleUri(uri: vscode.Uri): Promise<void> {
        const params = new URLSearchParams(uri.query);
        const action = params.get('action') || uri.path.replace('/', '');

        switch (action) {
            case 'connect': {
                const token = params.get('token');
                const origin = params.get('origin');
                const projectId = params.get('projectId');

                if (!token) {
                    vscode.window.showErrorMessage('[Onlook] 连接缺少 token 参数');
                    return;
                }

                // 注册 URI 中传入的 token（而非生成新 token）
                this.security.registerExternalToken(token, origin ?? undefined, projectId ?? undefined);
                console.info(`[Onlook] 收到连接请求，projectId: ${projectId}，token 已注册`);

                vscode.window.showInformationMessage(
                    `[Onlook] 正在等待 Web 客户端连接 (端口: ${this._port})...`
                );
                break;
            }

            case 'createProject': {
                const projectName = params.get('name') || 'my-app';
                const parentPath = params.get('parentPath');
                const token = params.get('token');
                const projectId = params.get('projectId');
                const onlookUrl = params.get('onlookUrl');

                if (token) {
                    // 注册 URI 中传入的 token
                    this.security.registerExternalToken(token, undefined, projectId ?? undefined);
                }

                if (parentPath) {
                    try {
                        const result = await this.projectManager.createProject(projectName, parentPath);
                        vscode.window.showInformationMessage(`[Onlook] 项目 "${projectName}" 创建成功，正在打开浏览器...`);

                        // 打开浏览器跳转到 Onlook Web，附带本地 Agent 连接参数
                        if (onlookUrl && token) {
                            const browserUrl = new URL(onlookUrl);
                            browserUrl.searchParams.set('localAgent', String(this._port));
                            browserUrl.searchParams.set('token', token);
                            browserUrl.searchParams.set('workspacePath', result.projectPath);
                            await this.ideLauncher.openUrl(browserUrl.toString());
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(`[Onlook] 创建项目失败: ${error}`);
                    }
                } else {
                    // 没有指定路径，让用户选择
                    vscode.commands.executeCommand('onlook.createProject');
                }
                break;
            }

            default:
                vscode.window.showWarningMessage(`[Onlook] 未知操作: ${action}`);
        }
    }

    /**
     * 在浏览器中打开 Onlook Web
     */
    async openInBrowser(): Promise<void> {
        await this.ideLauncher.openOnlook(this._port, this.security);
    }

    /**
     * 向所有已连接的客户端推送事件
     */
    broadcastEvent(method: string, params?: unknown): void {
        const event = createEvent(method, params);
        const data = JSON.stringify(event);

        for (const [ws] of this.clients.entries()) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 启动 HTTP + WebSocket 服务器
     */
    private startServer(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            // 创建 HTTP 服务器（用于健康检查）
            this.server = http.createServer((req, res) => {
                // 允许跨域访问（Web 端健康检测需要）
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

                // 处理 CORS 预检请求
                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                if (req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'ok',
                        port: this._port,
                        clients: this.clients.size,
                        version: '0.1.0',
                    }));
                } else if (req.url?.startsWith('/token')) {
                    // 为 Web 客户端生成一次性连接 token
                    const urlParams = new URL(req.url, `http://localhost:${this._port}`);
                    const projectId = urlParams.searchParams.get('projectId') ?? undefined;
                    const token = this.security.registerToken(undefined, projectId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ token }));
                } else if (req.url?.startsWith('/stop')) {
                    // 接收来自 Web 端 sendBeacon 的停止请求
                    const urlParams = new URL(req.url, `http://localhost:${this._port}`);
                    const projectPath = urlParams.searchParams.get('projectPath');
                    const token = urlParams.searchParams.get('token');

                    if (!projectPath || !token) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing projectPath or token' }));
                        return;
                    }

                    // 验证 token
                    const valid = this.security.validateConnection(token);
                    if (!valid.valid) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid token' }));
                        return;
                    }

                    // 停止 Dev Server
                    this.devServerManager.stopServer({ projectPath }).then(() => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                        console.info(`[Onlook] 收到 sendBeacon 停止请求，已停止 Dev Server: ${projectPath}`);
                    }).catch((error) => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: String(error) }));
                    });
                    return;
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });

            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`端口 ${port} 已被占用`));
                } else {
                    reject(err);
                }
            });

            this.server.listen(port, 'localhost', () => {
                this._port = port;

                // 创建 WebSocket 服务器
                this.wss = new WebSocketServer({ server: this.server! });

                this.wss.on('connection', (ws, req) => {
                    this.handleConnection(ws, req);
                });

                // 初始化文件操作管理器
                this.fileOpsManager = new FileOpsManager();

                // 初始化文件监听管理器
                this.fileWatcherManager = new FileWatcherManager((method, params) => {
                    this.broadcastEvent(method, params);
                });

                resolve();
            });
        });
    }

    /**
     * 处理新的 WebSocket 连接
     */
    private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
        const origin = req.headers.origin;

        console.log(`[Onlook] 新连接，来源: ${origin ?? '未知'}`);

        // 等待握手消息
        let authenticated = false;
        const handshakeTimeout = setTimeout(() => {
            if (!authenticated) {
                console.warn('[Onlook] 握手超时，关闭连接');
                ws.close(4001, 'Handshake timeout');
            }
        }, 10000);

        ws.on('message', (data: Buffer) => {
            try {
                const message: AgentMessage = JSON.parse(data.toString());

                if (!authenticated) {
                    // 未认证，只处理握手消息
                    if (message.method === AgentMethods.HANDSHAKE) {
                        const result = this.handleHandshake(message, ws, origin);
                        authenticated = result.valid;
                        if (authenticated) {
                            clearTimeout(handshakeTimeout);
                            ws.send(JSON.stringify(createResponse(
                                message.id,
                                message.method,
                                { success: true, port: this._port }
                            )));
                        } else {
                            ws.send(JSON.stringify(createErrorResponse(
                                message.id,
                                message.method,
                                4003,
                                'Invalid token'
                            )));
                            ws.close(4003, 'Authentication failed');
                        }
                    } else {
                        ws.send(JSON.stringify(createErrorResponse(
                            message.id,
                            message.method,
                            4001,
                            'Not authenticated, send handshake first'
                        )));
                    }
                    return;
                }

                // 已认证，分发消息
                this.dispatchMessage(message, ws);
            } catch (error) {
                console.error('[Onlook] 消息解析失败:', error);
            }
        });

        ws.on('close', () => {
            clearTimeout(handshakeTimeout);
            const client = this.clients.get(ws);
            if (client) {
                console.log(`[Onlook] 客户端断开，projectId: ${client.projectId ?? '未知'}`);
                this.clients.delete(ws);
                // 停止该客户端相关的文件监听
                this.fileWatcherManager?.stopAll();

                // 延迟停止 Dev Server（避免页面刷新误停）
                if (client.projectPath) {
                    const projectPath = client.projectPath;
                    setTimeout(() => {
                        // 检查是否还有其他客户端连接同一项目
                        const hasOtherClients = [...this.clients.values()]
                            .some(c => c.projectPath === projectPath);
                        if (!hasOtherClients) {
                            console.info(`[Onlook] 无客户端连接 ${projectPath}，停止 Dev Server`);
                            this.devServerManager.stopServer({ projectPath }).catch(err => {
                                console.warn(`[Onlook] 停止 Dev Server 失败:`, err);
                            });
                        }
                    }, 5000);
                }
            }
        });

        ws.on('error', (error) => {
            console.error('[Onlook] WebSocket 错误:', error);
            clearTimeout(handshakeTimeout);
            this.clients.delete(ws);
        });
    }

    /**
     * 处理握手消息
     */
    private handleHandshake(
        message: AgentMessage,
        ws: WebSocket,
        origin?: string
    ): { valid: boolean; projectId?: string } {
        const params = message.params as HandshakeParams;
        if (!params?.token) {
            return { valid: false };
        }

        const result = this.security.validateConnection(params.token, origin);

        if (result.valid) {
            const clientProjectPath = params.projectPath;
            this.clients.set(ws, {
                ws,
                projectId: result.projectId ?? params.projectId,
                origin,
                projectPath: clientProjectPath,
            });

            // 将 projectPath 设置到 FileOpsManager，用于解析文件操作的相对路径
            if (clientProjectPath && this.fileOpsManager) {
                this.fileOpsManager.projectPath = clientProjectPath;
            }

            // 将 projectPath 设置到 FileWatcherManager，用于解析监听路径和转换事件路径
            if (clientProjectPath && this.fileWatcherManager) {
                this.fileWatcherManager.projectPath = clientProjectPath;
            }

            console.info(`[Onlook] 客户端已认证，projectId: ${result.projectId ?? '未知'}，projectPath: ${clientProjectPath ?? '未知'}`);
        }

        return result;
    }

    /**
     * 分发消息到对应的处理器
     */
    private async dispatchMessage(message: AgentMessage, ws: WebSocket): Promise<void> {
        const { method, id } = message;

        try {
            let result: unknown;

            switch (method) {
                // 连接
                case AgentMethods.PING:
                    result = { pong: true, timestamp: Date.now() };
                    break;

                // 文件操作
                case AgentMethods.FILE_READ:
                    result = await this.fileOpsManager!.readFile(message.params);
                    break;
                case AgentMethods.FILE_WRITE:
                    result = await this.fileOpsManager!.writeFile(message.params);
                    break;
                case AgentMethods.FILE_DELETE:
                    result = await this.fileOpsManager!.deleteFile(message.params);
                    break;
                case AgentMethods.FILE_LIST:
                    result = await this.fileOpsManager!.listFiles(message.params);
                    break;
                case AgentMethods.FILE_RENAME:
                    result = await this.fileOpsManager!.renameFile(message.params);
                    break;
                case AgentMethods.FILE_STAT:
                    result = await this.fileOpsManager!.statFile(message.params);
                    break;
                case AgentMethods.FILE_MKDIR:
                    result = await this.fileOpsManager!.mkdir(message.params);
                    break;

                // 文件监听
                case AgentMethods.FILE_WATCH_START:
                    result = await this.fileWatcherManager!.startWatch(message.params);
                    break;
                case AgentMethods.FILE_WATCH_STOP:
                    result = await this.fileWatcherManager!.stopWatch(message.params);
                    break;

                // 项目
                case AgentMethods.PROJECT_CREATE:
                    result = await this.projectManager.createProjectFromParams(message.params);
                    break;

                // Dev Server
                case AgentMethods.DEV_SERVER_START:
                    result = await this.devServerManager.startServer(
                        message.params,
                        // 推送 Dev Server 输出到 Web 客户端
                        (data: string) => this.broadcastEvent(AgentEvents.TERMINAL_OUTPUT, {
                            terminalId: 'dev',
                            data,
                        })
                    );
                    break;
                case AgentMethods.DEV_SERVER_STOP:
                    result = await this.devServerManager.stopServer(message.params);
                    break;
                case AgentMethods.DEV_SERVER_RESTART:
                    result = await this.devServerManager.restartServer(message.params);
                    break;

                // 终端
                case AgentMethods.TERMINAL_CREATE:
                    result = await this.terminalManager.createTerminal(message.params);
                    break;
                case AgentMethods.TERMINAL_WRITE:
                    result = await this.terminalManager.writeTerminal(message.params);
                    break;
                case AgentMethods.TERMINAL_KILL:
                    result = await this.terminalManager.killTerminal(message.params);
                    break;

                // IDE
                case AgentMethods.IDE_OPEN_FILE:
                    result = await this.ideLauncher.openFile(message.params);
                    break;
                case AgentMethods.IDE_OPEN_FOLDER:
                    result = await this.ideLauncher.openFolder(message.params);
                    break;

                default:
                    ws.send(JSON.stringify(createErrorResponse(
                        id, method, 404, `Unknown method: ${method}`
                    )));
                    return;
            }

            ws.send(JSON.stringify(createResponse(id, method, result)));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Onlook] 处理 ${method} 失败:`, errorMessage);
            ws.send(JSON.stringify(createErrorResponse(id, method, 500, errorMessage)));
        }
    }
}
