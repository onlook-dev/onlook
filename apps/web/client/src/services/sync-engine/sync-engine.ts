/**
 * Handles syncing files between a code provider and a local file system.
 *
 * On initial start, it pulls all files from the provider and stores them in the local file system.
 * After this, it watches for changes either in the local file system or the provider and syncs the changes back and forth.
 */
import { type Provider, type ProviderFileWatcher } from '@onlook/code-provider';
import { type FileSystem } from '@onlook/file-system';

import { normalizePath } from '@/components/store/editor/sandbox/helpers';

export interface SyncConfig {
    include?: string[];
    exclude?: string[];
}

const DEFAULT_EXCLUDES = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'];

async function hashContent(content: string | Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const data = typeof content === 'string' ? encoder.encode(content) : new Uint8Array(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class CodeProviderSync {
    private watcher: ProviderFileWatcher | null = null;
    private localWatcher: (() => void) | null = null;
    private isRunning = false;
    private readonly excludes: string[];
    private readonly excludePatterns: string[];
    private fileHashes = new Map<string, string>();

    constructor(
        private provider: Provider,
        private fs: FileSystem,
        private config: SyncConfig = { include: [], exclude: [] },
    ) {
        // Compute excludes once
        this.excludes = [...DEFAULT_EXCLUDES, ...(this.config.exclude ?? [])];
        this.excludePatterns = this.excludes.map((dir) => `${dir}/**`);
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        try {
            await this.pullFromSandbox();
            await this.setupWatching();
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
                console.log(`[Sync] Created directory: ${dirPath}`);
            } catch (error) {
                console.debug(`[Sync] Error creating directory ${dirPath}:`, error);
            }
        }

        await this.fs.writeFiles(filesToWrite);

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
                    console.log(
                        `[Sync] Sandbox watcher fired - event type: ${event.type}, paths:`,
                        event.paths,
                    );
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

                            console.log(`[Sync] Detected rename from "${oldPath}" to "${newPath}"`);

                            if (this.shouldSync(oldPath) && this.shouldSync(newPath)) {
                                try {
                                    // Check if the old file exists locally
                                    if (await this.fs.exists(oldPath)) {
                                        // Rename the file locally
                                        await this.fs.moveFile(oldPath, newPath);
                                        console.log(
                                            `[Sync] Renamed ${oldPath} to ${newPath} locally`,
                                        );

                                        // Update hash tracking
                                        const oldHash = this.fileHashes.get(oldPath);
                                        if (oldHash) {
                                            this.fileHashes.delete(oldPath);
                                            this.fileHashes.set(newPath, oldHash);
                                        }
                                    } else {
                                        // Old file doesn't exist, just create the new one
                                        console.log(
                                            `[Sync] Old file ${oldPath} doesn't exist locally, creating ${newPath}`,
                                        );

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
                                                console.log(
                                                    `[Sync] Created ${newPath} from sandbox`,
                                                );
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
                                console.log(`[Sync] Raw sandbox event path: "${path}"`);
                                
                                // Normalize the path to remove any duplicate prefixes
                                const normalizedPath = normalizePath(path);
                                console.log(
                                    `[Sync] Path normalized from "${path}" to "${normalizedPath}"`,
                                );

                                if (!this.shouldSync(normalizedPath)) {
                                    console.log(`[Sync] Skipping ${normalizedPath} - shouldSync returned false`);
                                    continue;
                                }

                                try {
                                    // First check if it's a directory or file
                                    console.log(`[Sync] Checking type for: ${normalizedPath}`);
                                    const stat = await this.provider.statFile({
                                        args: { path: normalizedPath },
                                    });
                                    console.log(`[Sync] Path ${normalizedPath} is type: ${stat.type}`);

                                    if (stat.type === 'directory') {
                                        // It's a directory, create it locally
                                        const localPath = normalizedPath;
                                        await this.fs.createDirectory(localPath);
                                        console.log(`[Sync] Created directory ${localPath} from sandbox`);
                                    } else {
                                        // It's a file, read and sync it
                                        console.log(`[Sync] Reading file: ${normalizedPath}`);
                                        const result = await this.provider.readFile({
                                            args: { path: normalizedPath },
                                        });
                                        const { file } = result;

                                        console.log(
                                            `[Sync] Successfully read file ${normalizedPath}, type: ${file.type}, content exists: ${!!file.content}`,
                                        );

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
                                                console.log(
                                                    `[Sync] ${event.type === 'add' ? 'Created' : 'Updated'} ${localPath} from sandbox`,
                                                );
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
                            console.log(
                                `[Sync] Sandbox delete event - path normalized from "${path}" to "${normalizedPath}"`,
                            );

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
                                        console.log(
                                            `[Sync] Deleted directory ${localPath} from local (triggered by sandbox)`,
                                        );
                                    } else {
                                        await this.fs.deleteFile(localPath);
                                        console.log(
                                            `[Sync] Deleted file ${localPath} from local (triggered by sandbox)`,
                                        );
                                    }
                                } else {
                                    console.log(
                                        `[Sync] Path ${localPath} already deleted or doesn't exist locally`,
                                    );
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
            const { path, type } = event;

            // Check if file should be synced
            // Need to remove leading / for sandbox path
            const sandboxPath = path.startsWith('/') ? path.substring(1) : path;
            if (!this.shouldSync(sandboxPath)) {
                console.debug(`[Sync] Skipping local ${type} for excluded path: ${path}`);
                return;
            }

            console.log(
                `[Sync] Local watcher event: ${type} for path: ${path} (sandbox: ${sandboxPath})`,
            );

            try {
                switch (type) {
                    case 'create':
                    case 'update': {
                        // Check if it's a directory
                        const fileInfo = await this.fs.getInfo(path);
                        console.log(`[Sync] Local path ${path} is directory: ${fileInfo.isDirectory}`);
                        
                        if (fileInfo.isDirectory) {
                            // Create directory in provider
                            console.log(`[Sync] Attempting to create directory in sandbox: ${sandboxPath}`);
                            await this.provider.createDirectory({
                                args: {
                                    path: sandboxPath,
                                },
                            });
                            console.log(`[Sync] Successfully created directory ${sandboxPath} in sandbox`);
                        } else {
                            // Read from local and write to provider
                            const content = await this.fs.readFile(path);
                            const currentHash = await hashContent(content);

                            // Check if this change was from our own sync
                            if (this.fileHashes.get(path) === currentHash) {
                                console.debug(`[Sync] Skipping ${path} - change was from sync`);
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
                            console.log(
                                `[Sync] Pushed ${path} to sandbox (${type === 'create' ? 'created' : 'updated'})`,
                            );
                        }
                        break;
                    }
                    case 'delete': {
                        // Always attempt to sync local deletions to sandbox
                        // The user initiated this deletion locally, so it should be reflected in the sandbox
                        console.log(
                            `[Sync] Processing local delete for ${path} -> sandbox path: ${sandboxPath}`,
                        );

                        try {
                            await this.provider.deleteFiles({
                                args: {
                                    path: sandboxPath,
                                    recursive: true,
                                },
                            });
                            console.log(`[Sync] Successfully deleted ${sandboxPath} from sandbox`);
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

                            console.log(
                                `[Sync] Local rename detected: "${event.oldPath}" -> "${path}"`,
                            );
                            console.log(
                                `[Sync] Sandbox rename: "${oldSandboxPath}" -> "${sandboxPath}"`,
                            );

                            try {
                                await this.provider.renameFile({
                                    args: {
                                        oldPath: oldSandboxPath,
                                        newPath: sandboxPath,
                                    },
                                });
                                console.log(`[Sync] Successfully renamed in sandbox`);

                                // Update hash tracking for renamed files
                                const oldHash = this.fileHashes.get(event.oldPath);
                                if (oldHash) {
                                    this.fileHashes.delete(event.oldPath);
                                    this.fileHashes.set(path, oldHash);
                                    console.log(`[Sync] Updated hash tracking for renamed path`);
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
