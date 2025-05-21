import type { SandboxSession, WatchEvent, Watcher } from '@codesandbox/sdk';
import { FileEventBus } from './file-event-bus';

interface FileWatcherOptions {
    session: SandboxSession;
    onFileChange: (event: WatchEvent) => Promise<void>;
    excludePatterns?: string[];
    fileEventBus: FileEventBus;
}

export class FileWatcher {
    private watcher: Watcher | null = null;
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
            this.watcher = await this.session.fs.watch('./', {
                recursive: true,
                excludes: this.excludePatterns,
            });

            this.watcher.onEvent(async (event) => {
                // Publish the event to all subscribers
                this.eventBus.publish({
                    type: event.type,
                    paths: event.paths,
                    timestamp: Date.now()
                });

                // Notify about file changes
                await this.onFileChange(event);
            });
        } catch (error) {
            console.error('Failed to start file watcher:', error);
            throw error;
        }
    }

    dispose(): void {
        this.watcher?.dispose();
        this.watcher = null;
    }
}