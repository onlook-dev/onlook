import type { Sandbox, FilesystemEvent, FilesystemEventType } from '@e2b/sdk';
import { FileEventBus } from './file-event-bus';

interface FileWatcherOptions {
    session: Sandbox | null;
    onFileChange: (event: { path: string; type: string }) => Promise<void>;
    excludePatterns?: string[];
    fileEventBus: FileEventBus;
}

export class FileWatcher {
    private watchHandle: { stop: () => Promise<void> } | null = null;
    private enabled: boolean = true;

    constructor(private options: FileWatcherOptions) {}

    async start() {
        if (!this.options.session) {
            console.error('No session available for file watching');
            return;
        }

        try {
            // Watch the root directory recursively
            this.watchHandle = await this.options.session.files.watchDir('/', async (event: FilesystemEvent) => {
                if (!this.enabled) {
                    return;
                }

                // Check if the file should be excluded
                if (this.shouldExclude(event.name)) {
                    return;
                }

                // Map E2B event types to our internal types
                const eventType = this.mapEventType(event.type);
                if (eventType) {
                    await this.options.onFileChange({
                        path: event.name,
                        type: eventType,
                    });

                    // Publish to event bus
                    this.options.fileEventBus.publish({
                        type: eventType,
                        paths: [event.name],
                        timestamp: Date.now(),
                    });
                }
            }, {
                recursive: true,
            });

            console.log('File watching started using E2B native watch API');
        } catch (error) {
            console.error('Failed to start file watcher:', error);
            throw error;
        }
    }

    private mapEventType(e2bType: FilesystemEventType): string | null {
        // Map E2B event types to our internal event types
        switch (e2bType) {
            case 'CREATE':
                return 'add';
            case 'WRITE':
                return 'change';
            case 'REMOVE':
                return 'unlink';
            case 'RENAME':
                return 'rename';
            case 'CHMOD':
                // We don't handle chmod events currently
                return null;
            default:
                return null;
        }
    }

    private shouldExclude(path: string): boolean {
        if (!this.options.excludePatterns) {
            return false;
        }
        return this.options.excludePatterns.some(pattern => path.includes(pattern));
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    async dispose() {
        if (this.watchHandle) {
            try {
                await this.watchHandle.stop();
            } catch (error) {
                console.error('Error stopping file watcher:', error);
            }
            this.watchHandle = null;
        }
    }

    updateSession(session: Sandbox) {
        this.options.session = session;
        // Restart watching with the new session
        this.dispose().then(() => this.start());
    }
}