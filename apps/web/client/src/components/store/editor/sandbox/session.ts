import { api } from '@/trpc/client';
import type { WebSocketSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';

export class SessionManager {
    session: WebSocketSession | null = null;
    isConnecting = false;
    terminalSessions: Map<string, CLISession> = new Map();
    activeTerminalSessionId: string = 'cli';

    constructor(private readonly editorEngine: EditorEngine) {
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
        return this.terminalSessions.get(id) as TerminalSession | undefined;
    }

    async createTerminalSessions(session: WebSocketSession) {
        const task = new CLISessionImpl('Server (readonly)', CLISessionType.TASK, session, this.editorEngine.error);
        this.terminalSessions.set(task.id, task);
        const terminal = new CLISessionImpl('CLI', CLISessionType.TERMINAL, session, this.editorEngine.error);
        
        // Wait for terminal initialization to complete
        await terminal.waitForInitialization();
        
        this.terminalSessions.set(terminal.id, terminal);
        this.activeTerminalSessionId = terminal.id;
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

            // Try to get the active terminal session first
            let terminalSession = this.terminalSessions.get(this.activeTerminalSessionId);

            // If active session doesn't have terminal, find any terminal session
            if (!terminalSession || terminalSession.type !== CLISessionType.TERMINAL || !terminalSession.terminal) {
                console.warn(`Active terminal session ${this.activeTerminalSessionId} not found or invalid, searching for alternative`);
                
                terminalSession = undefined;
                for (const [id, session] of this.terminalSessions.entries()) {
                    if (session.type === CLISessionType.TERMINAL && session.terminal) {
                        terminalSession = session;
                        this.activeTerminalSessionId = id; // Update active session
                        console.log(`Switched to terminal session: ${id}`);
                        break;
                    }
                }
            }

            if (!terminalSession || terminalSession?.type !== CLISessionType.TERMINAL || !terminalSession.terminal) {
                throw new Error('No terminal session found. Available sessions: ' + 
                    Array.from(this.terminalSessions.entries())
                        .map(([id, session]) => `${id}(${session.type}, hasTerminal: ${!!session.terminal})`)
                        .join(', '));
            }

            const cmd = await this.session.commands.runBackground(command, {
                name: 'user command'
            });

            terminalSession.xterm?.write(command + '\n');

            await cmd.open();
            const disposer = cmd.onOutput((output) => {
                streamCallback(output);
                terminalSession!.xterm?.write(output);
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
