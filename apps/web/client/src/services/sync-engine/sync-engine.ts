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
        const sandboxPaths = await this.getAllSandboxFiles('./');
        const sandboxPathsSet = new Set(sandboxPaths.map((p) => (p.startsWith('/') ? p : `/${p}`)));

        const localFiles = await this.fs.listFiles();

        // Find files to delete (exist locally but not in sandbox)
        const filesToDelete = localFiles.filter((localPath) => {
            if (!this.shouldSync(localPath)) return false;

            const sandboxPath = localPath.startsWith('/') ? localPath.substring(1) : localPath;
            return !sandboxPathsSet.has(localPath) && !sandboxPathsSet.has(sandboxPath);
        });

        for (const path of filesToDelete) {
            try {
                await this.fs.deleteFile(path);
            } catch (error) {
                console.debug(
                    `[Sync] Failed to delete ${path}:`,
                    error instanceof Error ? error.message : 'Unknown error',
                );
            }
        }

        const filesToWrite = [];
        for (const path of sandboxPaths) {
            if (this.shouldSync(path)) {
                try {
                    const result = await this.provider.readFile({ args: { path } });
                    const { file } = result;

                    if ((file.type === 'text' || file.type === 'binary') && file.content) {
                        filesToWrite.push({ path, content: file.content });
                    }
                } catch (error) {
                    console.debug(`[Sync] Skipping ${path}:`, error);
                }
            }
        }

        await this.fs.writeFiles(filesToWrite);

        // Store hashes of files so we can skip syncing if the content hasn't changed later.
        for (const { path, content } of filesToWrite) {
            const hash = await hashContent(content);
            this.fileHashes.set(path, hash);
        }
    }

    private async getAllSandboxFiles(dir: string): Promise<string[]> {
        const files: string[] = [];

        try {
            const result = await this.provider.listFiles({ args: { path: dir } });
            const entries = result.files;

            for (const entry of entries) {
                // Build path - when dir is './', just use entry.name
                const fullPath = dir === './' ? entry.name : `${dir}/${entry.name}`;

                if (entry.type === 'directory') {
                    // Check if directory should be excluded
                    if (!this.excludes.includes(entry.name)) {
                        const subFiles = await this.getAllSandboxFiles(fullPath);
                        files.push(...subFiles);
                    }
                } else {
                    // Only add files that should be synced
                    if (this.shouldSync(fullPath)) {
                        files.push(fullPath);
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
                        for (let path of event.paths) {
                            // Normalize the path to remove any duplicate prefixes
                            const normalizedPath = normalizePath(path);
                            console.log(`[Sync] Path normalized from "${path}" to "${normalizedPath}"`);
                            
                            if (!this.shouldSync(normalizedPath)) {
                                continue;
                            }

                            try {
                                const result = await this.provider.readFile({ args: { path: normalizedPath } });
                                const { file } = result;

                                console.debug(`[Sync] Processing file ${normalizedPath}, type: ${file.type}`);

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
                                        console.log(`[Sync] Updated ${localPath} from sandbox`);
                                    } else {
                                        console.debug(
                                            `[Sync] Skipping ${localPath} - content unchanged`,
                                        );
                                    }
                                }
                            } catch (error) {
                                console.error(`[Sync] Error syncing file ${normalizedPath}:`, error);
                            }
                        }
                    } else if (event.type === 'remove') {
                        for (let path of event.paths) {
                            // Normalize the path to remove any duplicate prefixes
                            const normalizedPath = normalizePath(path);
                            console.log(`[Sync] Path normalized from "${path}" to "${normalizedPath}"`);

                            if (!this.shouldSync(normalizedPath)) {
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
                                        console.log(`[Sync] Deleted directory ${localPath} from local`);
                                    } else {
                                        await this.fs.deleteFile(localPath);
                                        console.log(`[Sync] Deleted file ${localPath} from local`);
                                    }
                                } else {
                                    console.log(
                                        `[Sync] Path ${localPath} already deleted or doesn't exist`,
                                    );
                                }

                                // Remove hash regardless
                                this.fileHashes.delete(localPath);
                            } catch (error) {
                                console.error(
                                    `[Sync] Error deleting ${normalizedPath}:`,
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
                return;
            }

            console.log(`[Sync] Local watcher event: ${type} for path: ${path}`);

            try {
                switch (type) {
                    case 'create':
                    case 'update': {
                        // Check if it's a directory
                        const fileInfo = await this.fs.getInfo(path);
                        if (fileInfo.isDirectory) {
                            // Create directory in provider
                            // For now, providers don't have explicit mkdir, directories are created implicitly
                            // when files are written to them
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
                            console.log(`[Sync] Pushed ${path} to sandbox`);
                        }
                        break;
                    }
                    case 'delete': {
                        // Check if this delete was triggered by a sandbox delete (to avoid loops)
                        // If we don't have a hash for this file, it might have been deleted from sandbox
                        if (!this.fileHashes.has(path)) {
                            console.log(
                                `[Sync] Skipping delete sync to sandbox - file was likely deleted from sandbox`,
                            );
                            break;
                        }

                        try {
                            await this.provider.deleteFiles({
                                args: {
                                    path: sandboxPath,
                                    recursive: true,
                                },
                            });
                            console.log(`[Sync] Deleted ${sandboxPath} from sandbox`);
                        } catch (error) {
                            console.log(
                                `[Sync] Failed to delete from sandbox (might already be deleted):`,
                                error,
                            );
                        }

                        // Remove hash for deleted file
                        this.fileHashes.delete(path);
                        break;
                    }
                    case 'rename': {
                        // Handle rename if oldPath is provided
                        if (event.oldPath) {
                            const oldSandboxPath = event.oldPath.startsWith('/')
                                ? event.oldPath.substring(1)
                                : event.oldPath;
                            await this.provider.renameFile({
                                args: {
                                    oldPath: oldSandboxPath,
                                    newPath: sandboxPath,
                                },
                            });
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
