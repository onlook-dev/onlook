import { api } from '@/trpc/client';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';
import {
    createClient,
    type Provider,
    CodeProvider,
    CodesandboxProvider,
} from '@onlook/code-provider';

export class SessionManager {
    provider: Provider | null = null;
    // session: WebSocketSession | null = null;
    isConnecting = false;
    terminalSessions: Map<string, CLISession> = new Map();
    activeTerminalSessionId: string = 'cli';

    constructor(private readonly editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async start(sandboxId: string, userId?: string) {
        if (this.isConnecting || this.provider) {
            return;
        }
        this.isConnecting = true;
        this.provider = await createClient(CodeProvider.CodeSandbox, {
            providerOptions: {
                codesandbox: {
                    sandboxId,
                    getSession: async (sandboxId, userId) => {
                        return api.sandbox.start.mutate({ sandboxId, userId });
                    },
                },
            },
        });
        this.isConnecting = false;
        await this.createTerminalSessions(this.provider);
    }

    async restartDevServer(): Promise<boolean> {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }
        return this.provider.reload();
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.get(id) as TerminalSession | undefined;
    }

    private async createTerminalSessions(session: Provider) {
        if (session instanceof CodesandboxProvider && session.client) {
            const task = new CLISessionImpl(
                'Server (readonly)',
                CLISessionType.TASK,
                session.client,
                this.editorEngine.error,
            );
            this.terminalSessions.set(task.id, task);
            const terminal = new CLISessionImpl(
                'CLI',
                CLISessionType.TERMINAL,
                session.client,
                this.editorEngine.error,
            );

            this.terminalSessions.set(terminal.id, terminal);
            this.activeTerminalSessionId = task.id;
        }
    }

    // async disposeTerminal(id: string) {
    //     const terminal = this.terminalSessions.get(id) as TerminalSession | undefined;
    //     if (terminal) {
    //         if (terminal.type === 'terminal') {
    //             await terminal.terminal?.kill();
    //             terminal.xterm?.dispose();
    //         }
    //         this.terminalSessions.delete(id);
    //     }
    // }

    async hibernate(sandboxId: string) {
        await api.sandbox.hibernate.mutate({ sandboxId });
    }

    async reconnect(sandboxId: string, userId?: string) {
        try {
            if (!this.provider) {
                console.error('Provider was not initialized.');
                return;
            }

            // Check if the session is still connected
            const isConnected = await this.ping();
            if (isConnected) {
                return;
            }

            // Attempt soft reconnect
            await this.provider.reconnect();

            const isConnected2 = await this.ping();
            if (isConnected2) {
                return;
            }

            await this.start(sandboxId, userId);
        } catch (error) {
            console.error('Failed to reconnect to sandbox', error);
            this.isConnecting = false;
        }
    }

    async ping() {
        if (!this.provider) return false;
        return this.provider.ping();
    }

    async runCommand(
        command: string,
        streamCallback?: (output: string) => void,
    ): Promise<{
        output: string;
        success: boolean;
        error: string | null;
    }> {
        try {
            if (!this.provider) {
                throw new Error('Provider was not initialized.');
            }
            streamCallback?.(command + '\n');
            const { output } = await this.provider.runTerminalCommand({ args: { command } });
            streamCallback?.(output);
            return {
                output,
                success: true,
                error: null,
            };
        } catch (error) {
            console.error('Error running command:', error);
            return {
                output: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    async clear() {
        if (!this.provider) {
            throw new Error('Provider was not initialized.');
        }
        await this.provider.destroy();
        this.provider = null;
        this.isConnecting = false;
        this.terminalSessions.forEach((terminal) => {
            if (terminal.type === 'terminal') {
                terminal.terminal?.kill();
                terminal.xterm?.dispose();
            }
        });
        this.terminalSessions.clear();
    }
}
