/**
 * 终端管理器
 *
 * 管理本地终端实例，支持：
 * - 创建终端（指定工作目录）
 * - 向终端写入数据
 * - 终止终端
 * - 通过 WebSocket 推送终端输出
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { AgentEvents, TerminalCreateParams, TerminalWriteParams, TerminalKillParams } from '../server/protocol';

/** 事件推送回调 */
type EventCallback = (method: string, params: unknown) => void;

/** 终端实例 */
interface TerminalEntry {
    terminal: vscode.Terminal;
    id: string;
    /** Shell 进程（用于 Pseudoterminal） */
    shellProcess?: any;
}

/**
 * Onlook Pseudoterminal - 使用稳定 API 实现的伪终端
 * 不依赖 VSCode proposed API，直接通过 EventEmitter 推送输出
 */
class OnlookPseudoterminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    private shellProcess: any;
    private readonly projectPath: string;
    private readonly eventCallback: EventCallback;
    private readonly terminalId: string;

    // 实现 onDidWrite 属性（Pseudoterminal 接口要求）
    readonly onDidWrite: vscode.Event<string>;

    constructor(
        terminalId: string,
        projectPath: string,
        eventCallback: EventCallback
    ) {
        this.terminalId = terminalId;
        this.projectPath = projectPath;
        this.eventCallback = eventCallback;
        this.onDidWrite = this.writeEmitter.event;
    }

    open(_initialDimensions: vscode.TerminalDimensions): void {
        // 根据平台选择 shell
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
        const shellArgs = process.platform === 'win32' ? ['/c'] : ['-l'];

        this.shellProcess = spawn(shell, shellArgs, {
            cwd: this.projectPath,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        // 将 shell stdout 推送到 VSCode Terminal 和 Web 客户端
        this.shellProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString();
            this.writeEmitter.fire(output);
            // 同时通过 WebSocket 推送到 Web 客户端
            this.eventCallback(AgentEvents.TERMINAL_OUTPUT, {
                terminalId: this.terminalId,
                data: output,
            });
        });

        this.shellProcess.stderr.on('data', (data: Buffer) => {
            const output = data.toString();
            this.writeEmitter.fire(output);
            // 同时通过 WebSocket 推送到 Web 客户端
            this.eventCallback(AgentEvents.TERMINAL_OUTPUT, {
                terminalId: this.terminalId,
                data: output,
            });
        });

        // shell 退出时关闭伪终端
        this.shellProcess.on('exit', (exitCode: number | null) => {
            this.closeEmitter.fire(exitCode ?? 0);
        });
    }

    close(): void {
        if (this.shellProcess) {
            this.shellProcess.kill();
        }
        this.writeEmitter.dispose();
        this.closeEmitter.dispose();
    }

    handleInput(data: string): void {
        if (this.shellProcess) {
            this.shellProcess.stdin.write(data);
        }
    }
}

export class TerminalManager {
    /** 活跃终端 */
    private terminals: Map<string, TerminalEntry> = new Map();

    /** 事件推送回调 */
    private eventCallback: EventCallback;

    constructor(eventCallback: EventCallback) {
        this.eventCallback = eventCallback;

        // 监听终端关闭事件
        vscode.window.onDidCloseTerminal((terminal) => {
            for (const [id, entry] of this.terminals.entries()) {
                if (entry.terminal === terminal) {
                    // 清理 Pseudoterminal 的 shell 进程
                    if (entry.shellProcess) {
                        entry.shellProcess.kill();
                    }
                    this.terminals.delete(id);
                    break;
                }
            }
        });
    }

    /**
     * 创建新终端
     */
    async createTerminal(params: unknown): Promise<{ terminalId: string }> {
        const { cwd } = params as TerminalCreateParams;
        const terminalId = `term_${Date.now()}`;

        // 创建 Pseudoterminal 实例
        const pty = new OnlookPseudoterminal(terminalId, cwd ?? '.', this.eventCallback);

        // 创建 VSCode Terminal（使用 ExtensionTerminalOptions）
        const terminal = vscode.window.createTerminal({
            name: `Onlook Terminal`,
            pty,
        } as vscode.ExtensionTerminalOptions);

        terminal.show(false);

        this.terminals.set(terminalId, {
            terminal,
            id: terminalId,
        });

        console.info(`[Onlook Terminal] 创建终端: ${terminalId}, cwd: ${cwd ?? '默认'}`);
        return { terminalId };
    }

    /**
     * 向终端写入数据
     */
    async writeTerminal(params: unknown): Promise<{ success: boolean }> {
        const { terminalId, data } = params as TerminalWriteParams;
        const entry = this.terminals.get(terminalId);

        if (!entry) {
            throw new Error(`终端不存在: ${terminalId}`);
        }

        entry.terminal.sendText(data);
        return { success: true };
    }

    /**
     * 终止终端
     */
    async killTerminal(params: unknown): Promise<{ success: boolean }> {
        const { terminalId } = params as TerminalKillParams;
        const entry = this.terminals.get(terminalId);

        if (!entry) {
            return { success: true }; // 已不存在
        }

        entry.terminal.dispose();
        this.terminals.delete(terminalId);
        return { success: true };
    }

    /**
     * 终止所有终端
     */
    async killAll(): Promise<void> {
        for (const [id, entry] of this.terminals.entries()) {
            try {
                entry.terminal.dispose();
            } catch (error) {
                console.error(`[Onlook Terminal] 终止 ${id} 失败:`, error);
            }
        }
        this.terminals.clear();
    }
}
