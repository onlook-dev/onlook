import { api } from '@/trpc/client';
import type { SandboxSession } from './providers/interface';
import { SandboxProviderFactory, SandboxProviderType } from './providers';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';

export class SessionManager {
    session: SandboxSession | null = null;
    isConnecting = false;
    terminalSessions: Map<string, CLISession> = new Map();
    activeTerminalSessionId: string = 'cli';
    private providerFactory = SandboxProviderFactory.getInstance();

    constructor(private readonly editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async start(sandboxId: string, userId: string, providerType: SandboxProviderType = SandboxProviderType.CODESANDBOX) {
        this.isConnecting = true;
        try {
            const provider = this.providerFactory.getProvider(providerType);
            this.session = await provider.start(sandboxId, userId);
            await this.createTerminalSessions(this.session);
        } finally {
            this.isConnecting = false;
        }
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.get(id) as TerminalSession | undefined;
    }

    async createTerminalSessions(session: SandboxSession) {
        const task = new CLISessionImpl('Server (readonly)', CLISessionType.TASK, session, this.editorEngine.error);
        this.terminalSessions.set(task.id, task);
        const terminal = new CLISessionImpl('CLI', CLISessionType.TERMINAL, session, this.editorEngine.error);
        this.terminalSessions.set(terminal.id, terminal);
        this.activeTerminalSessionId = task.id;
    }

    async disposeTerminal(id: string) {
        const terminal = this.terminalSessions.get(id) as TerminalSession | undefined;
        if (terminal) {
            if (terminal.type === 'terminal') {
                await terminal.terminal?.kill();
                terminal.xterm?.dispose();
            }
            this.terminalSessions.delete(id);
        }
    }

    async hibernate(sandboxId: string, providerType: SandboxProviderType = SandboxProviderType.CODESANDBOX) {
        const provider = this.providerFactory.getProvider(providerType);
        await provider.hibernate(sandboxId);
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
        this.terminalSessions.clear();
    }

    async runCommand(command: string, streamCallback: (output: string) => void): Promise<{
        output: string;
        success: boolean;
        error: string | null;
    }> {
        try {
            if (!this.session) {
                throw new Error('No session found');
            }

            const terminalSession = this.terminalSessions.get(this.activeTerminalSessionId) as TerminalSession | undefined;

            if (!terminalSession?.terminal) {
                throw new Error('No terminal session found');
            }

            const cmd = await this.session.commands.runBackground(command, {
                name: 'user command'
            });

            terminalSession.xterm?.write(command + '\n');

            await cmd.open();
            const disposer = cmd.onOutput((output) => {
                streamCallback(output);
                terminalSession.xterm?.write(output);
            });

            const finalOutput = await cmd.waitUntilComplete();

            disposer.dispose();
            return {
                output: finalOutput,
                success: true,
                error: null
            };
        } catch (error) {
            console.error('Error running command:', error);
            return {
                output: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
