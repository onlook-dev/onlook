import { api } from '@/trpc/client';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';
import { CodeProvider, Provider, createCodeProviderClient } from '@onlook/code-provider';

export class SessionManager {
    provider: Provider | null = null;
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
        this.provider = await createCodeProviderClient(CodeProvider.CodeSandbox, {
            providerOptions: {
                codesandbox: {
                    sandboxId,
                    userId,
                    getSession: async (sandboxId, userId) => {
                        return api.sandbox.start.mutate({ sandboxId, userId });
                    },
                },
            },
        });
        await this.createTerminalSessions(this.provider);
        this.isConnecting = false;
    }

    async restartDevServer(): Promise<boolean> {
        if (!this.provider) {
            console.error('No provider found in restartDevServer');
            return false;
        }
        const { task } = await this.provider.getTask({
            args: {
                id: 'dev',
            },
        });
        if (task) {
            await task.restart();
            return true;
        }
        return false;
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.get(id) as TerminalSession | undefined;
    }

    async createTerminalSessions(provider: Provider) {
        const task = new CLISessionImpl(
            'Server (readonly)',
            CLISessionType.TASK,
            provider,
            this.editorEngine.error,
        );
        this.terminalSessions.set(task.id, task);
        const terminal = new CLISessionImpl(
            'CLI',
            CLISessionType.TERMINAL,
            provider,
            this.editorEngine.error,
        );

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

    async hibernate(sandboxId: string) {
        await api.sandbox.hibernate.mutate({ sandboxId });
    }

    async reconnect(sandboxId: string, userId?: string) {
        try {
            if (!this.provider) {
                console.error('No provider found in reconnect');
                return;
            }

            // Check if the session is still connected
            const isConnected = await this.ping();
            if (isConnected) {
                return;
            }

            // Attempt soft reconnect
            await this.provider?.reconnect();

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
        try {
            await this.provider.runCommand({ args: { command: 'echo "ping"' } });
            return true;
        } catch (error) {
            console.error('Failed to connect to sandbox', error);
            return false;
        }
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
                throw new Error('No provider found in runCommand');
            }
            streamCallback?.(command + '\n');
            const { output } = await this.provider.runCommand({ args: { command } });
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
        // probably need to be moved in `Provider.destroy()`
        this.terminalSessions.forEach((terminal) => {
            if (terminal.type === 'terminal') {
                terminal.terminal?.kill();
                terminal.xterm?.dispose();
            }
        });
        if (this.provider) {
            await this.provider.destroy();
        }
        this.provider = null;
        this.isConnecting = false;
        this.terminalSessions.clear();
    }
}
