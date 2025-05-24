import { api } from '@/trpc/client';
import type { Terminal, WebSocketSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { makeAutoObservable } from 'mobx';

interface TerminalSession {
    id: string;
    name: string;
    terminal: Terminal;
}

export class SessionManager {
    session: WebSocketSession | null = null;
    isConnecting = false;
    terminalSessions: TerminalSession[] = [];
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

    get activeTerminalSession() {
        return this.terminalSessions.find(terminal => terminal.id === this.activeTerminalSessionId);
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.find(terminal => terminal.id === id);
    }

    async createTerminalSessions() {
        const terminal = await this.createTerminal();
        if (terminal) {
            this.terminalSessions.push({
                id: 'cli',
                name: 'CLI',
                terminal,
            });
        }
        const terminal1 = await this.createTerminal();
        if (terminal1) {
            this.terminalSessions.push({
                id: 'dev-task',
                name: 'Dev Task',
                terminal: terminal1,
            });
        }
    }

    async createTerminal() {
        return this.session?.terminals.create();
    }

    async disposeTerminal(id: string) {
        const terminal = this.terminalSessions.find(terminal => terminal.id === id);
        if (terminal) {
            await terminal.terminal.kill();
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
            terminal.terminal.kill();
        });
        this.terminalSessions = [];
    }
}
