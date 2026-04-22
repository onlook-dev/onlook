/**
 * Dev Server 管理器
 *
 * 管理本地项目的开发服务器生命周期：
 * - 启动 dev server（使用用户配置的命令和端口）
 * - 停止 dev server
 * - 重启 dev server
 * - 监控 dev server 状态
 * - 通过 WebSocket 推送状态变更事件
 *
 * 端口策略：以用户配置的端口为准，端口被占用时报错提示用户修改。
 */

import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import {
    AgentEvents,
    DevServerStartParams,
    DevServerStopParams,
    DevServerRestartParams,
} from '../server/protocol';

/** Dev Server 状态 */
type DevServerStatus = 'starting' | 'running' | 'stopped' | 'error';

/** Dev Server 实例 */
interface DevServerEntry {
    process: ChildProcess;
    projectPath: string;
    port: number;
    status: DevServerStatus;
    /** 启动时间戳 */
    startedAt: number;
}

/** 事件推送回调 */
type EventCallback = (method: string, params: unknown) => void;

/** 输出回调（用于推送 Dev Server stdout/stderr） */
type OutputCallback = (data: string) => void;

/** 解析命令字符串为 command + args */
function parseCommand(cmd: string): string[] {
    // 按空格分割，处理引号内的内容
    return cmd.match(/(?:[^\s"]+|"[^"]*")+/g) ?? ['npm', 'run', 'dev'];
}

export class DevServerManager {
    /** 默认起始端口（避开 3000，因为 Onlook Web 自身通常占用该端口） */
    private static readonly DEFAULT_PORT = 3001;

    /** 默认开发命令 */
    private static readonly DEFAULT_DEV_COMMAND = 'npm run dev';

    /** 活跃的 dev server 实例，按项目路径索引 */
    private servers: Map<string, DevServerEntry> = new Map();

    /** 事件推送回调 */
    private eventCallback: EventCallback;

    constructor(eventCallback: EventCallback) {
        this.eventCallback = eventCallback;
    }

    /**
     * 启动 Dev Server
     * @returns 实际使用的端口
     */
    async startServer(params: unknown, onOutput?: OutputCallback): Promise<{ port: number; status: string }> {
        const { projectPath, devCommand, port: preferredPort } = params as DevServerStartParams;

        // 检查是否已有该项目的 dev server 在运行
        const existing = this.servers.get(projectPath);
        if (existing && existing.status === 'running') {
            return { port: existing.port, status: 'running' };
        }

        const targetPort = preferredPort ?? DevServerManager.DEFAULT_PORT;
        const cmd = devCommand ?? DevServerManager.DEFAULT_DEV_COMMAND;

        // 检查端口是否可用，不可用直接报错
        if (!(await this.isPortAvailable(targetPort))) {
            const error = `Port ${targetPort} is already in use by another process. The previous dev server may still be shutting down. Please wait a few seconds, or change the port in project settings.`;
            this.pushStatus(projectPath, 'error', error);
            throw new Error(error);
        }

        // 更新状态为 starting
        this.pushStatus(projectPath, 'starting');

        // 解析用户命令
        const [command, ...baseArgs] = parseCommand(cmd);

        // 启动 dev server
        return new Promise((resolve, reject) => {
            const isWindows = process.platform === 'win32';
            const finalCommand = isWindows && command === 'npm' ? 'npm.cmd' : command;

            // 通过 PORT 环境变量传递端口（主流框架都支持）
            const env = { ...process.env, PORT: String(targetPort) };

            const devProcess = spawn(finalCommand, baseArgs, {
                cwd: projectPath,
                env,
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            const entry: DevServerEntry = {
                process: devProcess,
                projectPath,
                port: targetPort,
                status: 'starting',
                startedAt: Date.now(),
            };

            this.servers.set(projectPath, entry);

            // 等待 dev server 就绪（监听 stdout 中的 Ready 消息）
            let resolved = false;
            const readyTimeout = setTimeout(() => {
                if (!resolved) {
                    // 30 秒超时
                    resolved = true;
                    entry.status = 'error';
                    this.pushStatus(projectPath, 'error', 'Dev server startup timeout (30s)');
                    reject(new Error('Dev server 启动超时（30秒）'));
                }
            }, 30000);

            devProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                console.log(`[Onlook DevServer] stdout: ${output.trim()}`);

                // 推送输出到 Web 客户端
                onOutput?.(output);

                if (!resolved && (output.includes('Ready') || output.includes('Local:') || output.includes(`localhost:${targetPort}`))) {
                    resolved = true;
                    clearTimeout(readyTimeout);
                    entry.status = 'running';
                    this.pushStatus(projectPath, 'running');
                    resolve({ port: targetPort, status: 'running' });
                }
            });

            devProcess.stderr?.on('data', (data: Buffer) => {
                const output = data.toString();
                console.log(`[Onlook DevServer] stderr: ${output.trim()}`);

                // 推送输出到 Web 客户端
                onOutput?.(output);

                // 某些框架把 Ready 输出到 stderr
                if (!resolved && (output.includes('Ready') || output.includes('Local:') || output.includes(`localhost:${targetPort}`))) {
                    resolved = true;
                    clearTimeout(readyTimeout);
                    entry.status = 'running';
                    this.pushStatus(projectPath, 'running');
                    resolve({ port: targetPort, status: 'running' });
                }
            });

            devProcess.on('error', (error) => {
                console.error(`[Onlook DevServer] 进程错误:`, error);
                if (!resolved) {
                    resolved = true;
                    clearTimeout(readyTimeout);
                    entry.status = 'error';
                    this.pushStatus(projectPath, 'error', error.message);
                    reject(new Error(`Dev server 启动失败: ${error.message}`));
                }
            });

            devProcess.on('exit', (code) => {
                console.log(`[Onlook DevServer] 进程退出，code: ${code}`);
                if (!resolved) {
                    resolved = true;
                    clearTimeout(readyTimeout);
                    entry.status = 'stopped';
                    this.pushStatus(projectPath, 'stopped');
                    reject(new Error(`Dev server 意外退出，code: ${code}`));
                } else {
                    entry.status = 'stopped';
                    this.pushStatus(projectPath, 'stopped');
                }
                this.servers.delete(projectPath);
            });
        });
    }

    /**
     * 停止 Dev Server
     * 等待进程真正退出后再返回，避免端口残留
     */
    async stopServer(params: unknown): Promise<{ success: boolean }> {
        const { projectPath } = params as DevServerStopParams;
        const entry = this.servers.get(projectPath);

        if (!entry) {
            return { success: true }; // 已经停止
        }

        try {
            // 等待进程退出
            const exited = await this.killProcess(entry.process);
            if (!exited) {
                // SIGTERM 失败，使用 SIGKILL 强制杀死
                entry.process.kill('SIGKILL');
                // 再等待一次
                await this.waitForExit(entry.process, 3000);
            }

            this.servers.delete(projectPath);
            this.pushStatus(projectPath, 'stopped');
            return { success: true };
        } catch (error) {
            throw new Error(`停止 Dev Server 失败: ${error}`);
        }
    }

    /**
     * 杀死进程并等待退出
     * 先发 SIGTERM，最多等 5 秒；超时返回 false（由调用方决定是否 SIGKILL）
     */
    private async killProcess(process: ChildProcess): Promise<boolean> {
        try {
            process.kill('SIGTERM');
        } catch {
            // 进程可能已退出
            return true;
        }
        return this.waitForExit(process, 5000);
    }

    /**
     * 等待进程退出
     * @returns true 如果进程在 timeout 内退出，false 如果超时
     */
    private waitForExit(process: ChildProcess, timeoutMs: number): Promise<boolean> {
        return new Promise((resolve) => {
            if (process.killed || process.exitCode !== null) {
                resolve(true);
                return;
            }

            const timer = setTimeout(() => {
                resolve(false);
            }, timeoutMs);

            process.once('exit', () => {
                clearTimeout(timer);
                resolve(true);
            });
        });
    }

    /**
     * 重启 Dev Server
     */
    async restartServer(params: unknown): Promise<{ port: number; status: string }> {
        const { projectPath, devCommand, port } = params as DevServerRestartParams;
        const entry = this.servers.get(projectPath);

        if (!entry) {
            // 没有运行中的 server，直接启动
            return this.startServer({ projectPath, devCommand, port } as DevServerStartParams);
        }

        // 保留原端口和命令，或使用传入的新值
        const targetPort = port ?? entry.port;
        const targetCommand = devCommand; // 如果传了新命令就用，否则由 startServer 使用默认值

        await this.stopServer({ projectPath } as DevServerStopParams);
        return this.startServer({ projectPath, devCommand: targetCommand, port: targetPort } as DevServerStartParams);
    }

    /**
     * 停止所有 Dev Server
     */
    async stopAll(): Promise<void> {
        for (const [projectPath, entry] of this.servers.entries()) {
            try {
                entry.process.kill('SIGTERM');
                this.pushStatus(projectPath, 'stopped');
            } catch (error) {
                console.error(`[Onlook DevServer] 停止 ${projectPath} 失败:`, error);
            }
        }
        this.servers.clear();
    }

    /**
     * 获取项目 Dev Server 状态
     */
    getStatus(projectPath: string): { status: DevServerStatus; port?: number } | null {
        const entry = this.servers.get(projectPath);
        if (!entry) {
            return null;
        }
        return { status: entry.status, port: entry.port };
    }

    /**
     * 检查端口是否可用
     *
     * 使用 exclusive: true 禁用 SO_REUSEADDR，避免 TIME_WAIT 状态导致的误报
     */
    private isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
                    resolve(false);
                } else {
                    // 其他错误也认为端口不可用
                    resolve(false);
                }
            });
            // 使用 exclusive: true 避免 TIME_WAIT 状态的端口被误判为可用
            server.listen({ port, host: 'localhost', exclusive: true }, () => {
                server.close(() => resolve(true));
            });
        });
    }

    /**
     * 推送 Dev Server 状态变更事件
     */
    private pushStatus(projectPath: string, status: DevServerStatus, error?: string): void {
        this.eventCallback(AgentEvents.DEV_SERVER_STATUS, {
            status,
            projectPath,
            error,
        });
    }
}
