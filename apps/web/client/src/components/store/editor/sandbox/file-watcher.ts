import type { WatchEvent as CodeSandboxWatchEvent, Watcher, WebSocketSession } from '@codesandbox/sdk';
import { FileEventBus } from './file-event-bus';
import type { SandboxSession } from './providers/interface';

// generic watch event interface
interface WatchEvent {
    type: 'add' | 'change' | 'remove';
    paths: string[];
}

interface FileWatcherOptions {
    session: SandboxSession;
    onFileChange: (event: WatchEvent) => Promise<void>;
    excludePatterns?: string[];
    fileEventBus: FileEventBus;
}

export class FileWatcher {
    private watcher: any | null = null;
    private readonly session: SandboxSession;
    private readonly onFileChange: (event: WatchEvent) => Promise<void>;
    private readonly excludePatterns: string[];
    private readonly eventBus: FileEventBus;

    constructor({ session, onFileChange, excludePatterns = [], fileEventBus }: FileWatcherOptions) {
        this.session = session;
        this.onFileChange = onFileChange;
        this.excludePatterns = excludePatterns;
        this.eventBus = fileEventBus;
    }

    async start(): Promise<void> {
        try {
            const watcher = await this.session.fs.watch('./');
            this.watcher = watcher;
            watcher.onEvent(async (event: CodeSandboxWatchEvent) => {
                const genericEvent: WatchEvent = {
                    type: this.mapEventType(event.type),
                    paths: event.paths,
                };

                this.eventBus.publish({
                    type: genericEvent.type,
                    paths: genericEvent.paths,
                    timestamp: Date.now()
                });
    
                await this.onFileChange(genericEvent);
            });
        } catch (error) {
            console.error('Failed to start file watcher:', error);
            throw error;
        }
    }

    private mapEventType(codeSandboxType: string): 'add' | 'change' | 'remove' {
        switch (codeSandboxType) {
            case 'add': return 'add';
            case 'change': return 'change';
            case 'remove': return 'remove';
            default: return 'change';
        }
    }

    dispose(): void {
        this.watcher?.dispose();
        this.watcher = null;
    }
}