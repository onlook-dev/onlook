import { api } from '@/trpc/client';
import type { Task, Terminal, WebSocketSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
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
        return this.terminalSessions.find(terminal => terminal.id === id);
    }

    async createTerminalSessions() {
        const devTask = await this.createDevTaskTerminal();
        if (devTask) {
            this.terminalSessions.push({
                id: 'dev-task',
                name: 'Dev Task',
                type: CLISessionType.TASK,
                task: devTask,
            });
        }
        const terminal = await this.createTerminal();
        if (terminal) {
            this.terminalSessions.push({
                id: 'cli',
                name: 'CLI',
                type: CLISessionType.TERMINAL,
                terminal,
            });
        }

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
        const terminal = this.terminalSessions.find(terminal => terminal.id === id);
        if (terminal) {
            if (terminal.type === 'terminal') {
                await terminal.terminal?.kill();
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
            }
        });
        this.terminalSessions = [];
    }
}
