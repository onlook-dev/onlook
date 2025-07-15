import { api } from '@/trpc/client';
import { Sandbox } from '@e2b/sdk';
import { env } from '@/env';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';

export class SessionManager {
    session: Sandbox | null = null;
    isConnecting = false;
    terminalSessions: Map<string, CLISession> = new Map();
    activeTerminalSessionId: string = 'cli';

    constructor(private readonly editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get project() {
        return this.editorEngine.project;
    }

    async connect() {
        if (!this.project?.sandbox?.id) {
            console.error('No sandbox ID available');
            return null;
        }

        if (this.session) {
            return this.session;
        }

        this.isConnecting = true;
        try {
            // Start the sandbox through the API
            const sessionData = await api.sandbox.start.mutate({
                sandboxId: this.project.sandbox.id,
                userId: this.editorEngine.user?.id,
            });

            // Connect to E2B sandbox
            this.session = await Sandbox.create({
                id: sessionData.sandboxId,
                apiKey: env.E2B_API_KEY,
            });

            console.log('Connected to E2B sandbox', this.session.sandboxId);
            return this.session;
        } catch (error) {
            console.error('Failed to connect to sandbox', error);
            throw error;
        } finally {
            this.isConnecting = false;
        }
    }

    async disconnect() {
        if (!this.session) {
            return;
        }

        try {
            // Clean up terminal sessions
            for (const [id, session] of this.terminalSessions) {
                await session.kill();
            }
            this.terminalSessions.clear();

            // Kill the sandbox
            await this.session.kill();
            this.session = null;
            
            console.log('Disconnected from E2B sandbox');
        } catch (error) {
            console.error('Failed to disconnect from sandbox', error);
            throw error;
        }
    }

    async runCommand(command: string, onOutput?: (data: string) => void): Promise<{ success: boolean; output?: string; error?: string }> {
        if (!this.session) {
            return { success: false, error: 'No sandbox session available' };
        }

        try {
            const process = await this.session.process.start({
                cmd: command,
                onStdout: onOutput ? (data) => onOutput(data.toString()) : undefined,
                onStderr: onOutput ? (data) => onOutput(data.toString()) : undefined,
            });

            await process.wait();
            
            return {
                success: process.exitCode === 0,
                output: process.stdout,
                error: process.exitCode !== 0 ? process.stderr : undefined,
            };
        } catch (error) {
            console.error('Failed to run command', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    createTerminal(id: string = 'cli'): CLISession {
        if (this.terminalSessions.has(id)) {
            return this.terminalSessions.get(id)!;
        }

        const terminalSession = new CLISessionImpl(id, CLISessionType.TERMINAL, this);
        this.terminalSessions.set(id, terminalSession);
        return terminalSession;
    }

    createTask(id: string, command: string): CLISession {
        if (this.terminalSessions.has(id)) {
            return this.terminalSessions.get(id)!;
        }

        const taskSession = new CLISessionImpl(id, CLISessionType.TASK, this, command);
        this.terminalSessions.set(id, taskSession);
        return taskSession;
    }

    setActiveTerminalSession(id: string) {
        if (this.terminalSessions.has(id)) {
            this.activeTerminalSessionId = id;
        }
    }

    getActiveTerminalSession(): CLISession | undefined {
        return this.terminalSessions.get(this.activeTerminalSessionId);
    }

    async removeTerminalSession(id: string) {
        const session = this.terminalSessions.get(id);
        if (session) {
            await session.kill();
            this.terminalSessions.delete(id);
            if (this.activeTerminalSessionId === id && this.terminalSessions.size > 0) {
                this.activeTerminalSessionId = this.terminalSessions.keys().next().value;
            }
        }
    }
}
