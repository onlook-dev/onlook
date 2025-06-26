import type { SandboxManager, SandboxProvider, SandboxSession } from './types';
import { DaytonaProvider } from './providers/daytona';
import { CodeSandboxProvider } from './providers/codesandbox';

export class ServerSandboxManager implements SandboxManager {
    private providers: Map<'codesandbox' | 'daytona', SandboxProvider> = new Map();
    private sessions: Map<string, SandboxSession> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.initializeProviders();
        this.startCleanupInterval();
    }

    private initializeProviders() {
        const daytonaApiKey = process.env.DAYTONA_API_KEY;
        const codesandboxApiKey = process.env.CODESANDBOX_API_KEY;

        if (daytonaApiKey) {
            this.providers.set('daytona', new DaytonaProvider(daytonaApiKey));
        }

        if (codesandboxApiKey) {
            this.providers.set('codesandbox', new CodeSandboxProvider());
        }
    }

    getProvider(type: 'codesandbox' | 'daytona'): SandboxProvider {
        const provider = this.providers.get(type);
        if (!provider) {
            throw new Error(`Provider ${type} not available. Check API keys configuration.`);
        }
        return provider;
    }

    async createSession(
        sandboxId: string, 
        userId: string, 
        providerType: 'codesandbox' | 'daytona'
    ): Promise<SandboxSession> {
        const provider = this.getProvider(providerType);
        const session = await provider.start(sandboxId, userId);
        
        this.sessions.set(session.id, session);
        return session;
    }

    getSession(sessionId: string): SandboxSession | null {
        return this.sessions.get(sessionId) || null;
    }

    listSessions(): SandboxSession[] {
        return Array.from(this.sessions.values());
    }

    async cleanupSessions(): Promise<void> {
        const now = new Date();
        const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

        for (const [sessionId, session] of this.sessions.entries()) {
            const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
            
            if (timeSinceLastActivity > inactiveThreshold) {
                try {
                    const provider = this.getProvider(session.status === 'running' ? 'codesandbox' : 'daytona');
                    await provider.hibernate(session.sandboxId);
                    this.sessions.delete(sessionId);
                    console.log(`Cleaned up inactive session: ${sessionId}`);
                } catch (error) {
                    console.error(`Error cleaning up session ${sessionId}:`, error);
                }
            }
        }
    }

    private startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupSessions().catch(error => {
                console.error('Error during session cleanup:', error);
            });
        }, 10 * 60 * 1000);
    }

    async shutdown(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        for (const session of this.sessions.values()) {
            try {
                const provider = this.getProvider(session.status === 'running' ? 'codesandbox' : 'daytona');
                await provider.disconnect(session.sandboxId);
            } catch (error) {
                console.error(`Error disconnecting session ${session.id}:`, error);
            }
        }

        this.sessions.clear();
    }
} 