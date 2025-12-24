/**
 * Handles syncing files between a code provider and a local file system.
 *
 * On initial start, it pulls all files from the provider and stores them in the local file system.
 * After this, it watches for changes either in the local file system or the provider and syncs the changes back and forth.
 */
import { type Provider, type ProviderFileWatcher } from '@onlook/code-provider';

import { normalizePath } from '@/components/store/editor/sandbox/helpers';
import type { CodeFileSystem } from '@onlook/file-system';

export interface SyncConfig {
    include?: string[];
    exclude?: string[];
}

const DEFAULT_EXCLUDES = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'];

export async function hashContent(content: string | Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const data = typeof content === 'string' ? encoder.encode(content) : new Uint8Array(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface SyncInstance {
    sync: CodeProviderSync;
    refCount: number;
}

export class CodeProviderSync {
    private static instances = new Map<string, SyncInstance>();

    private watcher: ProviderFileWatcher | null = null;
    private localWatcher: (() => void) | null = null;
    private isRunning = false;
    private isPaused = false;
    private readonly excludes: string[];
    private readonly excludePatterns: string[];
    private fileHashes = new Map<string, string>();
    private instanceKey: string | null = null;

    private constructor(
        private provider: Provider,
        private fs: CodeFileSystem,
        private config: SyncConfig = { include: [], exclude: [] },
    ) {
        // Compute excludes once
        this.excludes = [...DEFAULT_EXCLUDES, ...(this.config.exclude ?? [])];
        this.excludePatterns = this.excludes.map((dir) => `${dir}/**`);
    }

    /**
     * Get or create a sync instance for the given provider and filesystem.
     * Uses reference counting to ensure the same provider+fs combination shares a single sync instance.
     *
     * Note: Config is only applied on first creation. Subsequent calls with the same provider+fs
     * will reuse the existing instance with its original config. In practice, configs are static
     * (EXCLUDED_SYNC_PATHS) so this shouldn't cause issues, but a warning is logged if detected.
     */
    static getInstance(
        provider: Provider,
        fs: CodeFileSystem,
        sandboxId: string,
        config: SyncConfig = { include: [], exclude: [] },
    ): CodeProviderSync {
        const key = CodeProviderSync.generateKey(sandboxId, fs);

        const existing = CodeProviderSync.instances.get(key);
        if (existing) {
            // Warn if configs differ to help debug unexpected behavior
            const sameConfig =
                JSON.stringify(existing.sync.config ?? {}) === JSON.stringify(config ?? {});
            if (!sameConfig) {
                console.warn(
                    `[Sync] getInstance(${key}) called with different config; reusing existing instance config`,
                );
            }
            existing.refCount++;
            console.log(`[Sync] Reusing existing sync instance for ${key} (refCount: ${existing.refCount})`);
            return existing.sync;
        }

        const sync = new CodeProviderSync(provider, fs, config);
        sync.instanceKey = key;
        CodeProviderSync.instances.set(key, { sync, refCount: 1 });
        console.log(`[Sync] Created new sync instance for ${key} (refCount: 1)`);
        return sync;
    }

    /**
     * Generate a unique key for a provider+filesystem combination.
     */
    private static generateKey(sandboxId: string, fs: CodeFileSystem): string {
        return `${sandboxId}:${fs.rootPath}`;
    }

    /**
     * Release a reference to this sync instance.
     * When the last reference is released, the sync will be stopped and removed from the registry.
     */
    release(): void {
        if (!this.instanceKey) {
            console.warn('[Sync] Attempted to release sync instance without a key');
            return;
        }

        const instance = CodeProviderSync.instances.get(this.instanceKey);
        if (!instance) {
            console.warn(`[Sync] Instance ${this.instanceKey} not found in registry`);
            return;
        }

        instance.refCount--;
        console.log(`[Sync] Released reference to ${this.instanceKey} (refCount: ${instance.refCount})`);

        if (instance.refCount <= 0) {
            console.log(`[Sync] Stopping and removing sync instance ${this.instanceKey}`);
            this.stop();
            CodeProviderSync.instances.delete(this.instanceKey);
            this.instanceKey = null;
        }
    }

    /**
     * Pause syncing temporarily. Useful before operations that cause many file changes (e.g., git restore).
     * While paused, file change events are ignored.
     */
    pause(): void {
        this.isPaused = true;
    }

    /**
     * Resume syncing after being paused. Pulls fresh state from sandbox to ensure consistency.
     */
    async unpause(): Promise<void> {
        // Keep paused while reconciling to avoid echoing local writes back to the provider
        if (this.isRunning) {
            try {
                await this.pullFromSandbox();
            } finally {
                this.isPaused = false;
            }
        } else {
            this.isPaused = false;
        }
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        try {
            await this.pullFromSandbox();
            await this.setupWatching();
            // Push any locally modified files (with OIDs) back to sandbox. This is required for the first time sync.
            void this.pushModifiedFilesToSandbox();
        } catch (error) {
            this.isRunning = false;
            throw error;
        }
    }

    stop(): void {
        this.isRunning = false;

        if (this.watcher) {
            void this.watcher.stop();
            this.watcher = null;
        }

        if (this.localWatcher) {
            this.localWatcher();
            this.localWatcher = null;
        }

        // Clear file hashes
        this.fileHashes.clear();
    }

    private async pullFromSandbox(): Promise<void> {
        const sandboxEntries = await this.getAllSandboxFiles('./');
        const sandboxEntriesSet = new Set(
            sandboxEntries.map((e) => (e.path.startsWith('/') ? e.path : `/${e.path}`)),
        );

        const localEntries = await this.fs.listAll();

        // Find entries to delete (exist locally but not in sandbox)
        const entriesToDelete = localEntries.filter((entry) => {
            if (!this.shouldSync(entry.path)) return false;

            const sandboxPath = entry.path.startsWith('/') ? entry.path.substring(1) : entry.path;
            return !sandboxEntriesSet.has(entry.path) && !sandboxEntriesSet.has(sandboxPath);
        });

        for (const entry of entriesToDelete) {
            try {
                if (entry.type === 'file') {
                    await this.fs.deleteFile(entry.path);
                    console.log(`[Sync] Deleted file: ${entry.path}`);
                } else {
                    await this.fs.deleteDirectory(entry.path);
                    console.log(`[Sync] Deleted directory: ${entry.path}`);
                }
            } catch (error) {
                console.debug(
                    `[Sync] Failed to delete ${entry.path}:`,
                    error instanceof Error ? error.message : 'Unknown error',
                );
            }
        }

        // Process sandbox entries
        const directoriesToCreate = [];
        const filesToWrite = [];

        for (const entry of sandboxEntries) {
            if (entry.type === 'directory') {
                directoriesToCreate.push(entry.path);
            } else {
                try {
                    const result = await this.provider.readFile({ args: { path: entry.path } });
                    const { file } = result;

                    if ((file.type === 'text' || file.type === 'binary') && file.content) {
                        filesToWrite.push({ path: entry.path, content: file.content });
                    }
                } catch (error) {
                    console.debug(`[Sync] Skipping ${entry.path}:`, error);
                }
            }
        }

        // Create directories first
        for (const dirPath of directoriesToCreate) {
            try {
                await this.fs.createDirectory(dirPath);
            } catch (error) {
                console.debug(`[Sync] Error creating directory ${dirPath}:`, error);
            }
        }

        // Write files sequentially to avoid race conditions
        for (const { path, content } of filesToWrite) {
            try {
                await this.fs.writeFile(path, content);
            } catch (error) {
                console.error(`[Sync] Failed to write ${path}:`, error);
            }
        }

        // Store hashes of files so we can skip syncing if the content hasn't changed later.
        for (const { path, content } of filesToWrite) {
            const hash = await hashContent(content);
            this.fileHashes.set(path, hash);
        }
    }

    private async getAllSandboxFiles(
        dir: string,
    ): Promise<Array<{ path: string; type: 'file' | 'directory' }>> {
        const files: Array<{ path: string; type: 'file' | 'directory' }> = [];

        try {
            const result = await this.provider.listFiles({ args: { path: dir } });
            const entries = result.files;

            for (const entry of entries) {
                // Build path - when dir is './', just use entry.name
                const fullPath = dir === './' ? entry.name : `${dir}/${entry.name}`;

                if (entry.type === 'directory') {
                    // Check if directory should be excluded
                    if (!this.excludes.includes(entry.name)) {
                        if (this.shouldSync(fullPath)) {
                            files.push({ path: fullPath, type: 'directory' });
                        }
                        const subFiles = await this.getAllSandboxFiles(fullPath);
                        files.push(...subFiles);
                    }
                } else {
                    // Only add files that should be synced
                    if (this.shouldSync(fullPath)) {
                        files.push({ path: fullPath, type: entry.type });
                    }
                }
            }
        } catch (error) {
            console.debug(
                `[Sync] Error reading directory ${dir}:`,
                error instanceof Error ? error.message : 'Unknown error',
            );
        }

        return files;
    }

    private async pushModifiedFilesToSandbox(): Promise<void> {
        console.log('[Sync] Pushing locally modified files back to sandbox...');

        try {
            // Get all local JSX/TSX files that might have been modified with OIDs
            const localFiles = await this.fs.listFiles('/');
            const jsxFiles = localFiles.filter(path => /\.(jsx?|tsx?)$/i.test(path));

            // TODO: Use available batch write API
            await Promise.all(
                jsxFiles.map(async (filePath) => {
                    try {
                        const content = await this.fs.readFile(filePath);
                        if (typeof content === 'string') {
                            // Push to sandbox
                            await this.provider.writeFile({
                                args: {
                                    path: filePath.startsWith('/') ? filePath.substring(1) : filePath,
                                    content,
                                    overwrite: true
                                }
                            });
                            console.log(`[Sync] Pushed ${filePath} to sandbox`);
                        }
                    } catch (error) {
                        console.warn(`[Sync] Failed to push ${filePath} to sandbox:`, error);
                    }
                })
            );
        } catch (error) {
            console.error('[Sync] Error pushing files to sandbox:', error);
        }
    }

    private shouldSync(path: string): boolean {
        // Check if path matches any exclude pattern
        const isExcluded = this.excludes.some((exc) => {
            // Check if path is within excluded directory or is the excluded item itself
            return path === exc || path.startsWith(`${exc}/`) || path.split('/').includes(exc);
        });

        if (isExcluded) {
            return false;
        }

        // Check includes if specified
        if (this.config.include && this.config.include.length > 0) {
            const included = this.config.include.some((inc) => {
                const normalizedInc = inc.startsWith('/') ? inc.substring(1) : inc;
                return path.startsWith(normalizedInc) || path === normalizedInc;
            });
            return included;
        }

        return true;
    }

    private async setupWatching(): Promise<void> {
        try {
            // Watch the current directory (relative to workspace)
            const watchResult = await this.provider.watchFiles({
                args: {
                    path: './',
                    recursive: true,
                    excludes: this.excludePatterns,
                },
                onFileChange: async (event) => {
                    // Skip processing if paused
                    if (this.isPaused) {
                        return;
                    }

                    // Process based on event type
                    if (event.type === 'change' || event.type === 'add') {
                        // Check if this is a rename (change event with 2 paths)
                        if (
                            event.type === 'change' &&
                            event.paths.length === 2 &&
                            event.paths[0] &&
                            event.paths[1]
                        ) {
                            // This is likely a rename operation
                            const oldPath = normalizePath(event.paths[0]);
                            const newPath = normalizePath(event.paths[1]);


                            if (this.shouldSync(oldPath) && this.shouldSync(newPath)) {
                                try {
                                    // Check if the old file exists locally
                                    if (await this.fs.exists(oldPath)) {
                                        // Rename the file locally
                                        await this.fs.moveFile(oldPath, newPath);

                                        // Update hash tracking
                                        const oldHash = this.fileHashes.get(oldPath);
                                        if (oldHash) {
                                            this.fileHashes.delete(oldPath);
                                            this.fileHashes.set(newPath, oldHash);
                                        }
                                    } else {
                                        // Old file doesn't exist, just create the new one

                                        try {
                                            const result = await this.provider.readFile({
                                                args: { path: newPath },
                                            });
                                            const { file } = result;

                                            if (
                                                (file.type === 'text' || file.type === 'binary') &&
                                                file.content
                                            ) {
                                                await this.fs.writeFile(newPath, file.content);
                                                const hash = await hashContent(file.content);
                                                this.fileHashes.set(newPath, hash);
                                            }
                                        } catch (error) {
                                            console.error(
                                                `[Sync] Error creating ${newPath}:`,
                                                error,
                                            );
                                        }
                                    }
                                } catch (error) {
                                    console.error(`[Sync] Error handling rename:`, error);
                                }
                            }
                        } else {
                            // Normal processing for non-rename events
                            for (const path of event.paths) {

                                // Normalize the path to remove any duplicate prefixes
                                const normalizedPath = normalizePath(path);

                                if (!this.shouldSync(normalizedPath)) {
                                    continue;
                                }

                                try {
                                    // First check if it's a directory or file
                                    const stat = await this.provider.statFile({
                                        args: { path: normalizedPath },
                                    });

                                    if (stat.type === 'directory') {
                                        // It's a directory, create it locally
                                        const localPath = normalizedPath;

                                        try {
                                            await this.fs.createDirectory(localPath);

                                            // After creating the directory, recursively sync all its contents
                                            // This is needed because sandbox watcher might only report parent directory creation

                                            // Recursive function to sync directory contents
                                            const syncDirectoryContents = async (sandboxPath: string, localDirPath: string) => {
                                                try {
                                                    const dirContents = await this.provider.listFiles({
                                                        args: { path: sandboxPath },
                                                    });

                                                    if (dirContents.files && dirContents.files.length > 0) {

                                                        for (const item of dirContents.files) {
                                                            const itemSandboxPath = `${sandboxPath}/${item.name}`;
                                                            const itemLocalPath = `${localDirPath}/${item.name}`;

                                                            if (item.type === 'directory') {
                                                                // Create subdirectory
                                                                await this.fs.createDirectory(itemLocalPath);

                                                                // Recursively sync its contents
                                                                await syncDirectoryContents(itemSandboxPath, itemLocalPath);
                                                            } else if (item.type === 'file') {
                                                                // Sync all files including .gitkeep
                                                                try {
                                                                    const fileResult = await this.provider.readFile({
                                                                        args: { path: itemSandboxPath },
                                                                    });
                                                                    if (fileResult.file.content !== undefined) {
                                                                        // Write file even if content is empty (like .gitkeep)
                                                                        await this.fs.writeFile(itemLocalPath, fileResult.file.content || '');
                                                                        // Update hash tracking
                                                                        const hash = await hashContent(fileResult.file.content || '');
                                                                        this.fileHashes.set(itemLocalPath, hash);
                                                                    } else {
                                                                        console.log(`[Sync] File ${itemSandboxPath} has undefined content, skipping`);
                                                                    }
                                                                } catch (fileError) {
                                                                    console.error(`[Sync] Error syncing file ${itemSandboxPath}:`, fileError);
                                                                }
                                                            }
                                                        }
                                                    }
                                                } catch (listError) {
                                                    console.error(`[Sync] Error listing contents of ${sandboxPath}:`, listError);
                                                }
                                            };

                                            // Start recursive sync
                                            await syncDirectoryContents(normalizedPath, localPath);
                                        } catch (dirError) {
                                            console.error(`[Sync] Error creating directory ${localPath}:`, dirError);
                                            // Directory creation might fail if parent doesn't exist
                                            // The createDirectory method should handle this with recursive: true
                                        }
                                    } else {
                                        // It's a file, read and sync it
                                        const result = await this.provider.readFile({
                                            args: { path: normalizedPath },
                                        });
                                        const { file } = result;

                                        if (
                                            (file.type === 'text' || file.type === 'binary') &&
                                            file.content
                                        ) {
                                            const localPath = normalizedPath;

                                            // Check if content has changed
                                            const newHash = await hashContent(file.content);
                                            const existingHash = this.fileHashes.get(localPath);

                                            if (newHash !== existingHash) {
                                                await this.fs.writeFile(localPath, file.content);
                                                this.fileHashes.set(localPath, newHash);
                                            } else {
                                                console.debug(
                                                    `[Sync] Skipping ${localPath} - content unchanged`,
                                                );
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.error(`[Sync] Error processing ${normalizedPath}:`, error);
                                }
                            }
                        }
                    } else if (event.type === 'remove') {
                        for (const path of event.paths) {
                            // Normalize the path to remove any duplicate prefixes
                            const normalizedPath = normalizePath(path);

                            if (!this.shouldSync(normalizedPath)) {
                                console.debug(
                                    `[Sync] Skipping sandbox delete for excluded path: ${normalizedPath}`,
                                );
                                continue;
                            }

                            try {
                                const localPath = normalizedPath;

                                // Check if path exists before trying to delete
                                if (await this.fs.exists(localPath)) {
                                    // Check if it's a directory or file
                                    const fileInfo = await this.fs.getInfo(localPath);

                                    if (fileInfo.isDirectory) {
                                        await this.fs.deleteDirectory(localPath);
                                    } else {
                                        await this.fs.deleteFile(localPath);
                                    }
                                }

                                // Remove hash regardless
                                this.fileHashes.delete(localPath);
                            } catch (error) {
                                console.debug(
                                    `[Sync] Error deleting ${normalizedPath} locally:`,
                                    error instanceof Error ? error.message : 'Unknown error',
                                );
                            }
                        }
                    }
                },
            });

            this.watcher = watchResult.watcher;

            // Setup local file system watching for bidirectional sync
            await this.setupLocalWatching();
        } catch (error) {
            console.error(
                '[Sync] Failed to setup file watching:',
                error instanceof Error ? error.message : 'Unknown error',
            );
            throw error;
        }
    }

    private async setupLocalWatching(): Promise<void> {
        // Watch the root directory for local changes
        this.localWatcher = this.fs.watchDirectory('/', async (event) => {
            // Skip processing if paused
            if (this.isPaused) {
                return;
            }

            const { path, type } = event;

            // Check if file should be synced
            // Need to remove leading / for sandbox path
            const sandboxPath = path.startsWith('/') ? path.substring(1) : path;
            if (!this.shouldSync(sandboxPath)) {
                console.debug(`[Sync] Skipping local ${type} for excluded path: ${path}`);
                return;
            }

            try {
                switch (type) {
                    case 'create':
                    case 'update': {
                        // Check if it's a directory
                        const fileInfo = await this.fs.getInfo(path);

                        if (fileInfo.isDirectory) {
                            // Create directory in provider
                            await this.provider.createDirectory({
                                args: {
                                    path: sandboxPath,
                                },
                            });
                        } else {
                            // Read from local and write to provider
                            const content = await this.fs.readFile(path);
                            const currentHash = await hashContent(content);

                            // Check if this change was from our own sync
                            if (this.fileHashes.get(path) === currentHash) {
                                return;
                            }

                            // Update hash and sync to provider
                            this.fileHashes.set(path, currentHash);
                            await this.provider.writeFile({
                                args: {
                                    path: sandboxPath,
                                    content,
                                    overwrite: true,
                                },
                            });
                        }
                        break;
                    }
                    case 'delete': {
                        // Always attempt to sync local deletions to sandbox
                        // The user initiated this deletion locally, so it should be reflected in the sandbox

                        try {
                            await this.provider.deleteFiles({
                                args: {
                                    path: sandboxPath,
                                    recursive: true,
                                },
                            });
                        } catch (error) {
                            console.debug(
                                `[Sync] Failed to delete ${sandboxPath} from sandbox:`,
                                error instanceof Error ? error.message : 'Unknown error',
                            );
                        }

                        // Remove hash for deleted file (if it exists)
                        if (this.fileHashes.has(path)) {
                            this.fileHashes.delete(path);
                            console.debug(`[Sync] Removed hash entry for deleted file: ${path}`);
                        }
                        break;
                    }
                    case 'rename': {
                        // Handle rename if oldPath is provided
                        if (event.oldPath) {
                            const oldSandboxPath = event.oldPath.startsWith('/')
                                ? event.oldPath.substring(1)
                                : event.oldPath;

                            try {
                                await this.provider.renameFile({
                                    args: {
                                        oldPath: oldSandboxPath,
                                        newPath: sandboxPath,
                                    },
                                });

                                // Update hash tracking for renamed files
                                const oldHash = this.fileHashes.get(event.oldPath);
                                if (oldHash) {
                                    this.fileHashes.delete(event.oldPath);
                                    this.fileHashes.set(path, oldHash);
                                }
                            } catch (error) {
                                console.error(`[Sync] Failed to rename in sandbox:`, error);
                                throw error; // Re-throw to be caught by outer try-catch
                            }
                        } else {
                            console.warn(`[Sync] Rename event received without oldPath`);
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error(
                    `[Sync] Error pushing local ${type} for ${path} to sandbox:`,
                    error instanceof Error ? error.message : 'Unknown error',
                );
            }
        });
    }
}
