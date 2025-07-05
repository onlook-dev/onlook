import { api } from '@/trpc/client';
import type { WebSocketSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { makeAutoObservable } from 'mobx';
import { ExponentialBackoff, Heartbeat } from '@onlook/penpal';
import type { EditorEngine } from '../engine';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';

export class SessionManager {
    session: WebSocketSession | null = null;
    isConnecting = false;
    terminalSessions: Map<string, CLISession> = new Map();
    activeTerminalSessionId: string = 'cli';
    private heartbeat: Heartbeat | null = null;
    private reconnectBackoff: ExponentialBackoff | null = null;
    lastPingLatency = 0;
    lastSuccessfulPing = 0;
    lastFailedPing = 0;
    connectionQuality = {
        successRate: 1.0,
        totalPings: 0,
        successfulPings: 0
    };

    constructor(private readonly editorEngine: EditorEngine) {
        makeAutoObservable(this);
        
        this.reconnectBackoff = new ExponentialBackoff(async () => {
            console.log('SessionManager - Attempting reconnection via exponential backoff');
            await this.forceReconnect();
        }, {
            initialDelay: 2000,
            maxDelay: 60000,
            maxAttempts: 10,
            backoffFactor: 2
        });
    }

    async start(sandboxId: string, userId?: string) {
        if (this.isConnecting || this.session) {
            return;
        }
        this.isConnecting = true;
        const session = await api.sandbox.start.mutate({ sandboxId, userId });
        this.session = await connectToSandbox({
            session,
            getSession: async (id) => {
                return await api.sandbox.start.mutate({ sandboxId: id, userId });
            },
        });
        this.session.keepActiveWhileConnected(true);
        this.isConnecting = false;
        await this.createTerminalSessions(this.session);
        this.startHeartbeat();
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.get(id) as TerminalSession | undefined;
    }

    async createTerminalSessions(session: WebSocketSession) {
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

    async hibernate(sandboxId: string) {
        await api.sandbox.hibernate.mutate({ sandboxId });
    }

    async reconnect(sandboxId: string, userId?: string) {
        try {
            if (!this.session) {
                console.error('SessionManager - No session found for reconnection');
                return;
            }

            const isConnected = await this.ping();
            if (isConnected) {
                console.log('SessionManager - Session already connected, no reconnection needed');
                return;
            }

            console.log('SessionManager - Attempting soft reconnect');
            await this.session.reconnect();

            const isConnected2 = await this.ping();
            if (isConnected2) {
                console.log('SessionManager - Soft reconnect successful');
                this.reconnectBackoff?.reset();
                return;
            }

            console.log('SessionManager - Soft reconnect failed, attempting full reconnection');
            await this.start(sandboxId, userId);
        } catch (error) {
            console.error('SessionManager - Failed to reconnect to sandbox', error);
            this.isConnecting = false;
            this.reconnectBackoff?.execute();
        }
    }

    private async forceReconnect() {
        if (this.isConnecting) {
            console.log('SessionManager - Already connecting, skipping force reconnect');
            return;
        }
        
        console.log('SessionManager - Force reconnecting session');
        this.stopHeartbeat();
        
        try {
            if (this.session) {
                await this.session.disconnect();
            }
        } catch (error) {
            console.warn('SessionManager - Error disconnecting old session:', error);
        }
        
        this.session = null;
    }

    async ping() {
        if (!this.session) return false;
        
        this.connectionQuality.totalPings++;
        
        try {
            const startTime = Date.now();
            await this.session.commands.run('echo "ping"');
            this.lastPingLatency = Date.now() - startTime;
            this.lastSuccessfulPing = Date.now();
            this.connectionQuality.successfulPings++;
            this.connectionQuality.successRate = this.connectionQuality.successfulPings / this.connectionQuality.totalPings;
            return true;
        } catch (error) {
            console.error('SessionManager - Failed to ping sandbox', error);
            this.lastFailedPing = Date.now();
            this.connectionQuality.successRate = this.connectionQuality.successfulPings / this.connectionQuality.totalPings;
            return false;
        }
    }

    private startHeartbeat() {
        if (this.heartbeat?.isActive()) {
            return;
        }
        
        this.heartbeat = new Heartbeat(async () => {
            return await this.ping();
        }, {
            interval: 45000,
            maxFailures: 2,
            onHealthy: () => {
                console.log('SessionManager - Connection health restored');
                this.reconnectBackoff?.reset();
            },
            onUnhealthy: () => {
                console.warn('SessionManager - Connection unhealthy, triggering reconnection');
                this.reconnectBackoff?.execute();
            }
        });
        
        this.heartbeat.start();
        console.log('SessionManager - Heartbeat monitoring started');
    }

    private stopHeartbeat() {
        if (this.heartbeat) {
            this.heartbeat.stop();
            this.heartbeat = null;
            console.log('SessionManager - Heartbeat monitoring stopped');
        }
    }

    async runCommand(command: string, streamCallback?: (output: string) => void): Promise<{
        output: string;
        success: boolean;
        error: string | null;
    }> {
        try {
            if (!this.session) {
                throw new Error('No session found');
            }

            const terminalSession = Array.from(this.terminalSessions.values()).find(session => session.type === CLISessionType.TERMINAL) as TerminalSession | undefined;

            if (!terminalSession?.terminal) {
                throw new Error('No terminal session found');
            }

            const cmd = await this.session.commands.runBackground(command, {
                name: 'user command'
            });

            terminalSession.xterm?.write(command + '\n');

            await cmd.open();
            const disposer = cmd.onOutput((output) => {
                streamCallback?.(output);
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

    async clear() {
        this.stopHeartbeat();
        this.reconnectBackoff?.cancel();
        
        await this.session?.disconnect();
        this.session = null;
        this.isConnecting = false;
        this.terminalSessions.forEach(terminal => {
            if (terminal.type === 'terminal') {
                terminal.terminal?.kill();
                terminal.xterm?.dispose();
            }
        });
        this.terminalSessions.clear();
        
        this.lastPingLatency = 0;
        this.lastSuccessfulPing = 0;
        this.lastFailedPing = 0;
        this.connectionQuality = {
            successRate: 1.0,
            totalPings: 0,
            successfulPings: 0
        };
    }
}
