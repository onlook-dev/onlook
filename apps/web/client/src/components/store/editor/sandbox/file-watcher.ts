import type { Sandbox } from '@e2b/sdk';
import { E2B_FILE_WATCHER_DEBOUNCE } from '@onlook/constants';
import { FileEventBus } from './file-event-bus';

interface FileWatcherOptions {
    session: Sandbox | null;
    onFileChange: (event: { path: string; type: string }) => Promise<void>;
    excludePatterns?: string[];
    fileEventBus: FileEventBus;
}

export class FileWatcher {
    private pollingInterval: NodeJS.Timeout | null = null;
    private enabled: boolean = true;
    private lastFileStates: Map<string, { size: number; mtime: number }> = new Map();

    constructor(private options: FileWatcherOptions) {}

    async start() {
        if (!this.options.session) {
            console.error('No session available for file watching');
            return;
        }

        // E2B doesn't have built-in file watching, so we'll implement polling
        // In a production environment, you might want to use a more efficient approach
        this.startPolling();
    }

    private startPolling() {
        // Poll every second for file changes
        this.pollingInterval = setInterval(async () => {
            if (!this.enabled || !this.options.session) {
                return;
            }

            try {
                await this.checkForChanges();
            } catch (error) {
                console.error('Error during file polling:', error);
            }
        }, E2B_FILE_WATCHER_DEBOUNCE || 1000);
    }

    private async checkForChanges() {
        if (!this.options.session) {
            return;
        }

        // This is a simplified implementation
        // In production, you'd want to recursively check directories
        // and compare file states more efficiently
        const files = await this.listAllFiles('/');
        
        const currentFileStates = new Map<string, { size: number; mtime: number }>();
        
        for (const file of files) {
            if (this.shouldExclude(file.path)) {
                continue;
            }

            const stat = await this.options.session.filesystem.stat(file.path);
            if (stat) {
                currentFileStates.set(file.path, {
                    size: stat.size,
                    mtime: stat.mtime,
                });

                const lastState = this.lastFileStates.get(file.path);
                if (!lastState) {
                    // New file
                    await this.options.onFileChange({ path: file.path, type: 'add' });
                } else if (lastState.size !== stat.size || lastState.mtime !== stat.mtime) {
                    // Modified file
                    await this.options.onFileChange({ path: file.path, type: 'change' });
                }
            }
        }

        // Check for deleted files
        for (const [path] of this.lastFileStates) {
            if (!currentFileStates.has(path)) {
                await this.options.onFileChange({ path, type: 'unlink' });
            }
        }

        this.lastFileStates = currentFileStates;
    }

    private async listAllFiles(dir: string): Promise<{ path: string }[]> {
        if (!this.options.session) {
            return [];
        }

        const result: { path: string }[] = [];
        try {
            const files = await this.options.session.filesystem.list(dir);
            for (const file of files) {
                const fullPath = `${dir}/${file.name}`.replace(/\/+/g, '/');
                if (file.isDir) {
                    const subFiles = await this.listAllFiles(fullPath);
                    result.push(...subFiles);
                } else {
                    result.push({ path: fullPath });
                }
            }
        } catch (error) {
            console.error(`Error listing files in ${dir}:`, error);
        }
        return result;
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

    dispose() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.lastFileStates.clear();
    }

    updateSession(session: Sandbox) {
        this.options.session = session;
    }
}