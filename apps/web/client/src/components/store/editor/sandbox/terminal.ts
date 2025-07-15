import type { ProcessManager } from '@e2b/sdk';
import { Terminal as XTerm } from '@xterm/xterm';
import { v4 as uuidv4 } from 'uuid';
import type { SessionManager } from './session';

export enum CLISessionType {
    TERMINAL = 'terminal',
    TASK = 'task',
}

export interface CLISession {
    id: string;
    type: CLISessionType;
    terminal?: ProcessManager;
    xterm?: XTerm;
    onOutput?: (data: string) => void;
    onExit?: (code: number) => void;
    write: (data: string) => void;
    kill: () => Promise<void>;
    start: () => Promise<void>;
}

export interface TerminalSession extends CLISession {
    terminal: ProcessManager;
    xterm: XTerm;
}

export class CLISessionImpl implements CLISession {
    id: string;
    type: CLISessionType;
    terminal?: ProcessManager;
    xterm?: XTerm;
    onOutput?: (data: string) => void;
    onExit?: (code: number) => void;
    private command?: string;

    constructor(
        id: string,
        type: CLISessionType,
        private sessionManager: SessionManager,
        command?: string
    ) {
        this.id = id || uuidv4();
        this.type = type;
        this.command = command;
    }

    async start() {
        if (!this.sessionManager.session) {
            throw new Error('No E2B session available');
        }

        if (this.type === CLISessionType.TERMINAL) {
            // Create XTerm instance for terminal UI
            this.xterm = new XTerm({
                convertEol: true,
                theme: {
                    background: '#1e1e1e',
                    foreground: '#d4d4d4',
                },
            });

            // Start an interactive shell process
            const process = await this.sessionManager.session.process.start({
                cmd: '/bin/bash',
                onStdout: (data) => {
                    const output = data.toString();
                    this.xterm?.write(output);
                    this.onOutput?.(output);
                },
                onStderr: (data) => {
                    const output = data.toString();
                    this.xterm?.write(output);
                    this.onOutput?.(output);
                },
            });

            this.terminal = process;

            // Handle terminal input
            this.xterm.onData(async (data) => {
                if (this.terminal) {
                    await this.terminal.sendStdin(data);
                }
            });
        } else if (this.type === CLISessionType.TASK && this.command) {
            // For tasks, run the command directly
            const process = await this.sessionManager.session.process.start({
                cmd: this.command,
                onStdout: (data) => {
                    const output = data.toString();
                    this.onOutput?.(output);
                },
                onStderr: (data) => {
                    const output = data.toString();
                    this.onOutput?.(output);
                },
            });

            this.terminal = process;

            // Wait for task completion
            process.wait().then((result) => {
                this.onExit?.(result.exitCode);
            });
        }
    }

    write(data: string) {
        if (this.type === CLISessionType.TERMINAL && this.xterm) {
            this.xterm.write(data);
        }
        this.onOutput?.(data);
    }

    async kill() {
        try {
            if (this.terminal) {
                await this.terminal.kill();
            }
            if (this.xterm) {
                this.xterm.dispose();
            }
        } catch (error) {
            console.error('Failed to kill terminal session:', error);
        }
    }
}
