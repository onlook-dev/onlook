import type { Terminal as CsbTerminal, WebSocketSession } from '@codesandbox/sdk';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import type { EditorEngine } from '../engine';

export interface TerminalSession {
    id: string;
    name: string;
    terminal: CsbTerminal | null;
    isConnected: boolean;
}

export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();
    activeSessionId: string | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get activeSessions(): TerminalSession[] {
        return Array.from(this.sessions.values());
    }

    get activeSession(): TerminalSession | null {
        if (!this.activeSessionId) return null;
        return this.sessions.get(this.activeSessionId) || null;
    }

    async createSession(name?: string): Promise<string> {
        const session = this.editorEngine.sandbox.session.session;
        if (!session) {
            throw new Error('No sandbox session available');
        }

        const id = nanoid();
        const sessionName = name || `Terminal ${this.sessions.size + 1}`;
        
        const terminalSession: TerminalSession = {
            id,
            name: sessionName,
            terminal: null,
            isConnected: false,
        };

        this.sessions.set(id, terminalSession);
        
        try {
            const terminal = await session.terminals.create();
            terminalSession.terminal = terminal;
            terminalSession.isConnected = true;
            
            if (!this.activeSessionId) {
                this.activeSessionId = id;
            }
        } catch (error) {
            console.error('Failed to create terminal session:', error);
            this.sessions.delete(id);
            throw error;
        }

        return id;
    }

    closeSession(id: string): void {
        const session = this.sessions.get(id);
        if (session) {
            session.terminal?.kill();
            this.sessions.delete(id);
            
            if (this.activeSessionId === id) {
                const remainingSessions = Array.from(this.sessions.keys());
                this.activeSessionId = remainingSessions.length > 0 ? remainingSessions[0] || null : null;
            }
        }
    }

    setActiveSession(id: string): void {
        if (this.sessions.has(id)) {
            this.activeSessionId = id;
        }
    }

    clear(): void {
        for (const session of this.sessions.values()) {
            session.terminal?.kill();
        }
        this.sessions.clear();
        this.activeSessionId = null;
    }
}
