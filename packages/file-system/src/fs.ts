/**
 * Wraps ZenFS to provide a simpler API with automatic path management and recursive operations.
 *
 * For each instance of FileSystem, it treats the base path as the root of the file system.
 * For example, if you do `new FileSystem('/my-project')`, when you call `readFile('/src/index.ts')`,
 * it will read the file from '/my-project/src/index.ts' under the hood for you.
 */

import path from 'path';

import type ZenFS from '@zenfs/core';
import { getFS } from './config';
import { type FileChangeEvent, type FileEntry, type FileInfo } from './types';

export class FileSystem {
    private fs: typeof ZenFS | null = null;
    private basePath: string;
    private watchers = new Map<string, any[]>();
    private watcherTimeouts = new Map<string, NodeJS.Timeout>();
    private isInitialized = false;

    constructor(rootDir: string) {
        this.basePath = path.resolve('/', rootDir);
    }

    get rootPath(): string {
        return this.basePath;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.fs = await getFS();

        // Ensure base directory exists
        try {
            await this.fs.promises.mkdir(this.basePath, { recursive: true });
        } catch (error) {
            if ((error as any)?.code !== 'EEXIST') {
                throw error;
            }
        }

        this.isInitialized = true;
    }

    private isTextContent(buffer: Uint8Array): boolean {
        // Check first 512 bytes for binary content
        const checkLength = Math.min(512, buffer.length);

        for (let i = 0; i < checkLength; i++) {
            const byte = buffer[i];

            // Null bytes are a strong indicator of binary content
            if (byte === 0 || byte === undefined) return false;

            // Check for other control characters (except tab, newline, carriage return)
            if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
                return false;
            }

            // Check for high bytes (> 127) without valid UTF-8 sequences
            if (byte > 127) {
                // Simple check: if we see many high bytes, it's likely binary
                // A more robust check would validate UTF-8 sequences
                let highByteCount = 0;
                for (let j = i; j < Math.min(i + 10, checkLength); j++) {
                    const currentByte = buffer[j];
                    if (currentByte !== undefined && currentByte > 127) highByteCount++;
                }
                if (highByteCount > 7) return false;
            }
        }

        return true;
    }

    /**
     * Create a new file with content
     */
    async createFile(inputPath: string, content = ''): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);

        // Ensure parent directory exists
        const dir = path.dirname(fullPath);
        if (dir) {
            await this.fs.promises.mkdir(dir, { recursive: true });
        }

        // Create the file
        await this.fs.promises.writeFile(fullPath, content);
    }

    /**
     * Check if a file exists
     */
    async fileExists(inputPath: string): Promise<boolean> {
        if (!this.fs) throw new Error('File system not initialized');

        try {
            const fullPath = path.join(this.basePath, inputPath);
            await this.fs.promises.stat(fullPath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Read a file - automatically detects text files and returns string in that case. Otherwise, returns Uint8Array.
     */
    async readFile(inputPath: string): Promise<string | Uint8Array> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);

        // Need to read as buffer first and check content to ensure it's not binary before converting to string
        const buffer = await this.fs.promises.readFile(fullPath);
        if (this.isTextContent(buffer)) {
            return buffer.toString('utf8');
        }

        return buffer;
    }

    async writeFile(inputPath: string, content: string | Uint8Array): Promise<void> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);

        // Ensure parent directory exists
        const dir = path.dirname(fullPath);
        if (dir) {
            await this.fs.promises.mkdir(dir, { recursive: true });
        }

        await this.fs.promises.writeFile(fullPath, content);
    }

    async writeFiles(files: Array<{ path: string; content: string | Uint8Array }>): Promise<void> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        // Group files by directory to batch mkdir operations
        const dirSet = new Set<string>();
        for (const { path: filePath } of files) {
            const dir = path.dirname(path.join(this.basePath, filePath));
            if (dir) {
                dirSet.add(dir);
            }
        }

        // Create all directories in parallel
        const BATCH_SIZE = 50;
        const dirs = Array.from(dirSet);
        for (let i = 0; i < dirs.length; i += BATCH_SIZE) {
            const batch = dirs.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(dir =>
                    this.fs!.promises.mkdir(dir, { recursive: true }).catch(() => {
                        // Ignore errors if directory already exists
                    })
                )
            );
        }

        // Write all files in parallel batches for better IndexedDB performance
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);

            await Promise.all(
                batch.map(async ({ path: filePath, content }) => {
                    try {
                        const fullPath = path.join(this.basePath, filePath);
                        await this.fs!.promises.writeFile(fullPath, content);
                    } catch (error) {
                        console.error(`[FileSystem] Failed to write ${filePath}:`, error);
                    }
                })
            );
        }
    }

    async deleteFile(inputPath: string): Promise<void> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);

        // Check if it's a directory to use recursive deletion
        try {
            const stats = await this.fs.promises.stat(fullPath);
            if (stats.isDirectory()) {
                await this.fs.promises.rm(fullPath, { recursive: true });
            } else {
                await this.fs.promises.rm(fullPath);
            }
        } catch (error) {
            // If stat fails, try to delete anyway (let rm handle the error)
            await this.fs.promises.rm(fullPath, { recursive: true });
        }
    }

    async moveFile(from: string, to: string): Promise<void> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        const fromPath = path.join(this.basePath, from);
        const toPath = path.join(this.basePath, to);

        // Ensure destination directory exists
        const toDir = path.dirname(toPath);
        if (toDir) {
            await this.fs.promises.mkdir(toDir, { recursive: true });
        }

        await this.fs.promises.rename(fromPath, toPath);
    }

    async copyFile(from: string, to: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const content = await this.readFile(from);
        await this.writeFile(to, content);
    }

    async createDirectory(inputPath: string): Promise<void> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);
        await this.fs.promises.mkdir(fullPath, { recursive: true });
    }

    async readDirectory(inputPath = '/'): Promise<FileEntry[]> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);

        const readDirRecursive = async (dirPath: string): Promise<FileEntry[]> => {
            try {
                const names = await this.fs!.promises.readdir(dirPath);
                const entries: FileEntry[] = [];

                for (const name of names) {
                    const entryPath = path.join(dirPath, name);
                    const stats = await this.fs!.promises.stat(entryPath);

                    const entry: FileEntry = {
                        name,
                        path: path.relative(this.basePath, entryPath), // Remove base path
                        isDirectory: stats.isDirectory(),
                        size: Number(stats.size), // Convert BigInt to number
                        modifiedTime: stats.mtime,
                    };

                    if (entry.isDirectory) {
                        entry.children = await readDirRecursive(entryPath);
                    }

                    entries.push(entry);
                }

                // Sort: directories first, then alphabetically
                entries.sort((a, b) => {
                    if (a.isDirectory !== b.isDirectory) {
                        return a.isDirectory ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });

                return entries;
            } catch (err) {
                if ((err as any).code === 'ENOENT') {
                    return [];
                }
                throw err;
            }
        };

        return await readDirRecursive(fullPath);
    }

    async deleteDirectory(inputPath: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);
        console.log('Deleting directory', fullPath);
        await this.fs.promises.rm(fullPath, { recursive: true });
    }

    async moveDirectory(from: string, to: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fromPath = path.join(this.basePath, from);
        const toPath = path.join(this.basePath, to);

        // Ensure destination parent exists
        const toDir = path.dirname(toPath);
        if (toDir) {
            await this.fs.promises.mkdir(toDir, { recursive: true });
        }

        await this.fs.promises.rename(fromPath, toPath);
    }

    async copyDirectory(from: string, to: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fromPath = path.join(this.basePath, from);
        const toPath = path.join(this.basePath, to);

        const copyRecursive = async (src: string, dest: string): Promise<void> => {
            const stats = await this.fs!.promises.stat(src);

            if (stats.isDirectory()) {
                await this.fs!.promises.mkdir(dest, { recursive: true });
                const entries = await this.fs!.promises.readdir(src);

                for (const entry of entries) {
                    await copyRecursive(path.join(src, entry), path.join(dest, entry));
                }
            } else {
                const content = await this.fs!.promises.readFile(src);
                await this.fs!.promises.writeFile(dest, content);
            }
        };

        await copyRecursive(fromPath, toPath);
    }

    watchFile(inputPath: string, callback: (event: FileChangeEvent) => void) {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);
        const timeoutKey = `watch-file:${inputPath}`;

        const watcher = this.fs.watch(fullPath, async (eventType, filename) => {
            // Clear any existing timeout
            const existingTimeout = this.watcherTimeouts.get(timeoutKey);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Debounce the callback. This is required since the watcher will fire off way before the file is actually written to, resulting in broken states.
            const timeout = setTimeout(async () => {
                // For rename events, check if the file exists to determine if it's a delete
                if (eventType === 'rename') {
                    try {
                        await this.fs!.promises.stat(fullPath);
                        // File exists, it's either a create or rename
                        // For single file watching, we'll treat it as an update
                        callback({
                            type: 'update',
                            path: inputPath,
                        });
                    } catch (error) {
                        callback({
                            type: 'delete',
                            path: inputPath,
                        });
                    }
                } else {
                    // Change event is an update
                    callback({
                        type: 'update',
                        path: inputPath,
                    });
                }
                this.watcherTimeouts.delete(timeoutKey);
            }, 50);

            this.watcherTimeouts.set(timeoutKey, timeout);
        });

        // Store watcher for cleanup
        const watcherList = this.watchers.get(inputPath) || [];
        watcherList.push(watcher);
        this.watchers.set(inputPath, watcherList);

        // Return cleanup function
        return () => {
            watcher.close();
            const list = this.watchers.get(inputPath) || [];
            const index = list.indexOf(watcher);
            if (index > -1) {
                list.splice(index, 1);
            }

            // Clear any pending timeout
            const timeout = this.watcherTimeouts.get(timeoutKey);
            if (timeout) {
                clearTimeout(timeout);
                this.watcherTimeouts.delete(timeoutKey);
            }
        };
    }

    watchDirectory(inputPath: string, callback: (event: FileChangeEvent) => void) {
        if (!this.fs) throw new Error('File system not initialized');

        const watchers: any[] = [];
        const watchedPaths = new Set<string>();

        const setupWatcher = (dirPath: string) => {
            if (watchedPaths.has(dirPath)) return;
            watchedPaths.add(dirPath);

            const watcher = this.fs!.watch(dirPath, async (eventType, filename) => {
                if (!filename) return;

                const relativePath = path.relative(this.basePath, dirPath);
                const filePath = path.join(relativePath, filename);

                const timeoutKey = `watch-dir:${filePath}`;

                const existingTimeout = this.watcherTimeouts.get(timeoutKey);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }

                const timeout = setTimeout(async () => {
                    const fullPath = path.join(this.basePath, filePath);

                    // For rename events, check if the file exists to determine the actual event type
                    if (eventType === 'rename') {
                        try {
                            const stats = await this.fs!.promises.stat(fullPath);

                            // File exists - determine if it's create or update
                            if (watchedPaths.has(fullPath)) {
                                // Path was already being watched, so it's an update
                                callback({
                                    type: 'update',
                                    path: filePath,
                                });
                            } else {
                                // New path, it's a create
                                console.log(`[FileSystem] Detected create for ${filePath}`);
                                callback({
                                    type: 'create',
                                    path: filePath,
                                });

                                // If it's a new directory, start watching it
                                if (stats.isDirectory()) {
                                    await setupWatchersRecursive(fullPath);
                                }
                            }
                        } catch (error) {
                            // File doesn't exist, it was deleted
                            console.log(`[FileSystem] Detected delete for ${filePath}`);
                            callback({
                                type: 'delete',
                                path: filePath,
                            });

                            // Remove from watched paths if it was a directory
                            watchedPaths.delete(fullPath);
                        }
                    } else {
                        // Change event is an update
                        callback({
                            type: 'update',
                            path: filePath,
                        });
                    }

                    this.watcherTimeouts.delete(timeoutKey);
                }, 50);

                this.watcherTimeouts.set(timeoutKey, timeout);
            });

            watchers.push(watcher);
        };

        const setupWatchersRecursive = async (dirPath: string): Promise<void> => {
            setupWatcher(dirPath);

            try {
                const entries = await this.fs!.promises.readdir(dirPath);
                for (const entry of entries) {
                    const entryPath = path.join(dirPath, entry);
                    const stats = await this.fs!.promises.stat(entryPath);
                    if (stats.isDirectory()) {
                        await setupWatchersRecursive(entryPath);
                    }
                }
            } catch (err) {
                // Directory might not exist
            }
        };

        const fullPath = path.join(this.basePath, inputPath);
        setupWatchersRecursive(fullPath);

        // Return cleanup function
        return () => {
            watchers.forEach((w) => w.close());
        };
    }

    async exists(inputPath: string): Promise<boolean> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);
        return await this.fs.promises.exists(fullPath);
    }

    async getInfo(inputPath: string): Promise<FileInfo> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = path.join(this.basePath, inputPath);
        const stats = await this.fs.promises.stat(fullPath);
        const name = path.basename(inputPath);

        return {
            path: inputPath,
            name,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            size: Number(stats.size),
            createdTime: stats.ctime,
            modifiedTime: stats.mtime,
            accessedTime: stats.atime,
        };
    }

    async listFiles(pattern = '**/*'): Promise<string[]> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        const files: string[] = [];

        const listRecursive = async (dirPath: string): Promise<void> => {
            try {
                const entries = await this.fs!.promises.readdir(dirPath);

                for (const entry of entries) {
                    const entryPath = path.join(dirPath, entry);
                    const stats = await this.fs!.promises.stat(entryPath);

                    if (stats.isFile()) {
                        const relativePath = path.relative(this.basePath, entryPath);
                        files.push(relativePath);
                    } else if (stats.isDirectory()) {
                        await listRecursive(entryPath);
                    }
                }
            } catch (err) {
                // Ignore errors
            }
        };

        await listRecursive(this.basePath);

        // Simple pattern matching (not full glob)
        if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return files.filter((f) => regex.test(f));
        }

        return files;
    }

    async listAll(): Promise<Array<{ path: string; type: 'file' | 'directory' }>> {
        await this.initialize();
        if (!this.fs) throw new Error('File system not initialized');

        const allPaths: Array<{ path: string; type: 'file' | 'directory' }> = [];

        const listRecursive = async (
            dirPath: string,
        ): Promise<Array<{ path: string; type: 'file' | 'directory' }>> => {
            try {
                const entries = await this.fs!.promises.readdir(dirPath);

                // First, stat all entries in parallel
                const entryStats = await Promise.all(
                    entries.map(async (entry) => {
                        const entryPath = path.join(dirPath, entry);
                        try {
                            const stats = await this.fs!.promises.stat(entryPath);
                            const relativePath = entryPath.substring(this.basePath.length);
                            return {
                                entryPath,
                                relativePath,
                                isDirectory: stats.isDirectory(),
                                isFile: stats.isFile(),
                            };
                        } catch (err) {
                            return null;
                        }
                    }),
                );

                const results: Array<{ path: string; type: 'file' | 'directory' }> = [];
                const subdirPromises: Promise<
                    Array<{ path: string; type: 'file' | 'directory' }>
                >[] = [];

                for (const entryStat of entryStats) {
                    if (!entryStat) continue;

                    if (entryStat.isDirectory) {
                        results.push({ path: entryStat.relativePath, type: 'directory' });
                        // Recursively list subdirectories in parallel
                        subdirPromises.push(listRecursive(entryStat.entryPath));
                    } else if (entryStat.isFile) {
                        results.push({ path: entryStat.relativePath, type: 'file' });
                    }
                }

                // Wait for all subdirectories to be processed
                const subdirResults = await Promise.all(subdirPromises);

                // Flatten results
                for (const subdirResult of subdirResults) {
                    results.push(...subdirResult);
                }

                return results;
            } catch (err) {
                // Ignore errors
                return [];
            }
        };

        const results = await listRecursive(this.basePath);
        return results;
    }

    cleanup(): void {
        // Clear all watchers
        for (const watchers of this.watchers.values()) {
            watchers.forEach((w) => w.close());
        }
        this.watchers.clear();

        // Clear all pending timeouts
        for (const timeout of this.watcherTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.watcherTimeouts.clear();
    }
}
