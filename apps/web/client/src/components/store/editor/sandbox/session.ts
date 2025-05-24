import { api } from '@/trpc/client';
import type { WebSocketSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { makeAutoObservable } from 'mobx';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';

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
        await this.createTerminalSessions(this.session);
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.find(terminal => terminal.id === id) as TerminalSession | undefined;
    }

    async createTerminalSessions(session: WebSocketSession) {
        const task = new CLISessionImpl('Server (readonly)', CLISessionType.TASK, session);
        this.terminalSessions.push(task);
        const terminal = new CLISessionImpl('CLI', CLISessionType.TERMINAL, session);
        this.terminalSessions.push(terminal);
        this.activeTerminalSessionId = task.id;
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
