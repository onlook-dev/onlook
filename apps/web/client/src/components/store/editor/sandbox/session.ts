import { api } from '@/trpc/client';
import type { Task, Terminal, WebSocketSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { Terminal as XTerm } from '@xterm/xterm';
import { makeAutoObservable } from 'mobx';

enum CLISessionType {
    TERMINAL = 'terminal',
    TASK = 'task',
}

interface CLISession {
    id: string;
    name: string;
    type: CLISessionType;
    terminal?: Terminal;
    // Task is readonly
    task?: Task;
    xterm: XTerm;
}

interface TaskSession extends CLISession {
    type: CLISessionType.TASK;
    task: Task;
}

interface TerminalSession extends CLISession {
    type: CLISessionType.TERMINAL;
    terminal: Terminal;
}

export class SessionManager {
    session: WebSocketSession | null = null;
    isConnecting = false;
    terminalSessions: CLISession[] = [];
    activeTerminalSessionId: string = 'cli';

    constructor() {
        makeAutoObservable(this);
    }

    async start(sandboxId: string, userId: string) {
        this.isConnecting = true;
        this.session = await connectToSandbox({
            session: await api.sandbox.start.mutate({ sandboxId, userId }),
            getSession: async (id) => {
                return await api.sandbox.start.mutate({ sandboxId: id, userId });
            },
        });
        this.isConnecting = false;
        await this.createTerminalSessions();
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.find(terminal => terminal.id === id) as TerminalSession | undefined;
    }

    async createTerminalSessions() {
        const devTask = await this.createDevTaskTerminal();
        if (devTask) {
            const xterm = this.createXTerm();
            this.terminalSessions.push({
                id: 'dev-task',
                name: 'Dev Task',
                type: CLISessionType.TASK,
                task: devTask,
                xterm,
            });

            devTask.onOutput((data: string) => {
                console.log('devTask.onOutput', data);
                xterm.write(data);
            });

            devTask.open();
        }
        const terminal = await this.createTerminal();
        if (terminal) {
            const xterm = this.createXTerm();
            this.terminalSessions.push({
                id: 'cli',
                name: 'CLI',
                type: CLISessionType.TERMINAL,
                terminal,
                xterm,
            });

            terminal.onOutput((data: string) => {
                xterm.write(data);
            });

            xterm.onData((data: string) => {
                terminal.write(data);
            });

            terminal.open();
        }
    }

    createXTerm() {
        return new XTerm({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'monospace',
            convertEol: true,
            allowTransparency: true,
            disableStdin: false,
            allowProposedApi: true,
            macOptionIsMeta: true,
        });
    }

    async createTerminal() {
        return this.session?.terminals.create();
    }

    async createDevTaskTerminal() {
        const task = this.session?.tasks.getTask('dev');
        if (!task) {
            console.error('No dev task found');
            return;
        }
        return task;
    }

    async disposeTerminal(id: string) {
        const terminal = this.terminalSessions.find(terminal => terminal.id === id) as TerminalSession | undefined;
        if (terminal) {
            if (terminal.type === 'terminal') {
                await terminal.terminal?.kill();
                terminal.xterm?.dispose();
            }
            this.terminalSessions = this.terminalSessions.filter(terminal => terminal.id !== id);
        }
    }

    async hibernate(sandboxId: string) {
        await api.sandbox.hibernate.mutate({ sandboxId });
    }

    async reconnect() {
        await this.session?.reconnect();
    }

    async disconnect() {
        if (!this.session) {
            console.error('No session found');
            return;
        }
        await this.session.disconnect();
        this.session = null;
        this.isConnecting = false;
        this.terminalSessions.forEach(terminal => {
            if (terminal.type === 'terminal') {
                terminal.terminal?.kill();
                terminal.xterm?.dispose();
            }
        });
        this.terminalSessions = [];
    }
}
