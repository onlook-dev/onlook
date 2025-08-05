import { FileEventBus } from './file-event-bus';
import type { Provider, ProviderFileWatcher, WatchEvent } from '@onlook/code-provider';

interface FileWatcherOptions {
    provider: Provider;
    onFileChange: (event: WatchEvent) => Promise<void>;
    excludePatterns?: string[];
    fileEventBus: FileEventBus;
}

export class FileWatcher {
    private watcher: ProviderFileWatcher | null = null;
    private readonly provider: Provider;
    private readonly onFileChange: (event: WatchEvent) => Promise<void>;
    private readonly excludePatterns: string[];
    private readonly eventBus: FileEventBus;

    constructor({
        provider,
        onFileChange,
        excludePatterns = [],
        fileEventBus,
    }: FileWatcherOptions) {
        this.provider = provider;
        this.onFileChange = onFileChange;
        this.excludePatterns = excludePatterns;
        this.eventBus = fileEventBus;
    }

    async start(): Promise<void> {
        try {
            const res = await this.provider.watchFiles({
                args: {
                    path: './',
                    recursive: true,
                    excludes: this.excludePatterns,
                },
                onFileChange: async (event) => {
                    this.eventBus.publish({
                        type: event.type,
                        paths: event.paths,
                        timestamp: Date.now(),
                    });
                    await this.onFileChange(event);
                },
            });
            this.watcher = res.watcher;
        } catch (error) {
            console.error('Failed to start file watcher:', error);
            throw error;
        }
    }

    dispose(): void {
        this.watcher?.stop();
        this.watcher = null;
    }
}
