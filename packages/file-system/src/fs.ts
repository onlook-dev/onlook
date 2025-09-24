/**
 * Wraps ZenFS to provide a simpler API with automatic path management and recursive operations.
 *
 * For each instance of FileSystem, it treats the base path as the root of the file system.
 * For example, if you do `new FileSystem('/my-project')`, when you call `readFile('/src/index.ts')`,
 * it will read the file from '/my-project/src/index.ts' under the hood for you.
 */

import type ZenFS from '@zenfs/core';
import { getFS } from './config';
import type { FileChangeEvent, FileEntry, FileInfo } from './types';

export class FileSystem {
    private fs: typeof ZenFS | null = null;
    private basePath: string;
    private watchers = new Map<string, any[]>();
    private watcherTimeouts = new Map<string, NodeJS.Timeout>();
    private isInitialized = false;

    constructor(private rootDir: string) {
        // Ensure rootDir starts with /
        this.basePath = rootDir.startsWith('/') ? rootDir : `/${rootDir}`;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.fs = await getFS();

        // Ensure base directory exists
        await this.fs.promises.mkdir(this.basePath, { recursive: true });

        this.isInitialized = true;
    }

    /**
     * Resolve a user path to the full path within the project
     */
    private resolvePath(path: string): string {
        // Normalize path
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        return this.basePath + path;
    }

    private isTextContent(buffer: Buffer | Uint8Array): boolean {
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
    async createFile(path: string, content = ''): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);

        // Ensure parent directory exists
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        if (dir) {
            await this.fs.promises.mkdir(dir, { recursive: true });
        }

        // Create the file
        await this.fs.promises.writeFile(fullPath, content);
    }

    /**
     * Read a file - automatically detects text files and returns string in that case. Otherwise, returns buffer.
     */
    async readFile(path: string): Promise<string | Buffer> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);

        // Need to read as buffer first and check content to ensure it's not binary before converting to string
        const buffer = await this.fs.promises.readFile(fullPath);
        if (this.isTextContent(buffer)) {
            return buffer.toString('utf8');
        }

        return buffer;
    }

    /**
     * Write/update a file
     */
    async writeFile(path: string, content: string | Buffer): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);

        // Ensure parent directory exists
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        if (dir) {
            await this.fs.promises.mkdir(dir, { recursive: true });
        }

        await this.fs.promises.writeFile(fullPath, content);
    }

    /**
     * Delete a file
     */
    async deleteFile(path: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);
        await this.fs.promises.unlink(fullPath);
    }

    /**
     * Move/rename a file
     */
    async moveFile(from: string, to: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fromPath = this.resolvePath(from);
        const toPath = this.resolvePath(to);

        // Ensure destination directory exists
        const toDir = toPath.substring(0, toPath.lastIndexOf('/'));
        if (toDir) {
            await this.fs.promises.mkdir(toDir, { recursive: true });
        }

        await this.fs.promises.rename(fromPath, toPath);
    }

    /**
     * Copy a file
     */
    async copyFile(from: string, to: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const content = await this.readFile(from);
        await this.writeFile(to, content);
    }

    /**
     * Create a directory (always recursive)
     */
    async createDirectory(path: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);
        await this.fs.promises.mkdir(fullPath, { recursive: true });
    }

    /**
     * Read a directory recursively
     */
    async readDirectory(path = '/'): Promise<FileEntry[]> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);

        const readDirRecursive = async (dirPath: string): Promise<FileEntry[]> => {
            try {
                const names = await this.fs!.promises.readdir(dirPath);
                const entries: FileEntry[] = [];

                for (const name of names) {
                    const entryPath = dirPath === '/' ? `/${name}` : `${dirPath}/${name}`;
                    const stats = await this.fs!.promises.stat(entryPath);

                    const entry: FileEntry = {
                        name,
                        path: entryPath.substring(this.basePath.length), // Remove base path
                        isDirectory: stats.isDirectory(),
                        size: stats.size,
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

    /**
     * Delete a directory recursively
     */
    async deleteDirectory(path: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);

        const deleteRecursive = async (dirPath: string): Promise<void> => {
            const entries = await this.fs!.promises.readdir(dirPath);

            for (const entry of entries) {
                const entryPath = `${dirPath}/${entry}`;
                const stats = await this.fs!.promises.stat(entryPath);

                if (stats.isDirectory()) {
                    await deleteRecursive(entryPath);
                } else {
                    await this.fs!.promises.unlink(entryPath);
                }
            }

            await this.fs!.promises.rmdir(dirPath);
        };

        await deleteRecursive(fullPath);
    }

    /**
     * Move/rename a directory
     */
    async moveDirectory(from: string, to: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fromPath = this.resolvePath(from);
        const toPath = this.resolvePath(to);

        // Ensure destination parent exists
        const toDir = toPath.substring(0, toPath.lastIndexOf('/'));
        if (toDir) {
            await this.fs.promises.mkdir(toDir, { recursive: true });
        }

        await this.fs.promises.rename(fromPath, toPath);
    }

    /**
     * Copy a directory recursively
     */
    async copyDirectory(from: string, to: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');

        const fromPath = this.resolvePath(from);
        const toPath = this.resolvePath(to);

        const copyRecursive = async (src: string, dest: string): Promise<void> => {
            const stats = await this.fs!.promises.stat(src);

            if (stats.isDirectory()) {
                await this.fs!.promises.mkdir(dest, { recursive: true });
                const entries = await this.fs!.promises.readdir(src);

                for (const entry of entries) {
                    await copyRecursive(`${src}/${entry}`, `${dest}/${entry}`);
                }
            } else {
                const content = await this.fs!.promises.readFile(src);
                await this.fs!.promises.writeFile(dest, content);
            }
        };

        await copyRecursive(fromPath, toPath);
    }

    /**
     * Watch a file for changes
     */
    watchFile(path: string, callback: (event: FileChangeEvent) => void) {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);
        const timeoutKey = `watch-file:${path}`;

        const watcher = this.fs.watch(fullPath, (eventType, filename) => {
            // Clear any existing timeout
            const existingTimeout = this.watcherTimeouts.get(timeoutKey);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Debounce the callback. This is required since the watcher will fire off way before the file is actually written to, resulting in broken states.
            const timeout = setTimeout(() => {
                callback({
                    type: eventType === 'rename' ? 'rename' : 'update',
                    path,
                });
                this.watcherTimeouts.delete(timeoutKey);
            }, 50);

            this.watcherTimeouts.set(timeoutKey, timeout);
        });

        // Store watcher for cleanup
        const watcherList = this.watchers.get(path) || [];
        watcherList.push(watcher);
        this.watchers.set(path, watcherList);

        // Return cleanup function
        return () => {
            watcher.close();
            const list = this.watchers.get(path) || [];
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

    /**
     * Watch a directory recursively for changes
     */
    watchDirectory(path: string, callback: (event: FileChangeEvent) => void) {
        if (!this.fs) throw new Error('File system not initialized');

        const watchers: any[] = [];
        const watchedPaths = new Set<string>();

        const setupWatcher = (dirPath: string) => {
            if (watchedPaths.has(dirPath)) return;
            watchedPaths.add(dirPath);

            const watcher = this.fs!.watch(dirPath, async (eventType, filename) => {
                if (!filename) return;

                const relativePath = dirPath.substring(this.basePath.length);
                const filePath =
                    relativePath === '/' ? `/${filename}` : `${relativePath}/${filename}`;

                const timeoutKey = `watch-dir:${filePath}`;

                const existingTimeout = this.watcherTimeouts.get(timeoutKey);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }

                const timeout = setTimeout(() => {
                    callback({
                        type: eventType === 'rename' ? 'rename' : 'update',
                        path: filePath,
                    });
                    this.watcherTimeouts.delete(timeoutKey);
                }, 50);

                this.watcherTimeouts.set(timeoutKey, timeout);

                // If it's a new directory, start watching it
                if (eventType === 'rename') {
                    const fullPath = this.resolvePath(filePath);
                    try {
                        const stats = await this.fs!.promises.stat(fullPath);
                        if (stats.isDirectory() && !watchedPaths.has(fullPath)) {
                            await setupWatchersRecursive(fullPath);
                        }
                    } catch (err) {
                        // File might have been deleted
                    }
                }
            });

            watchers.push(watcher);
        };

        const setupWatchersRecursive = async (dirPath: string): Promise<void> => {
            setupWatcher(dirPath);

            try {
                const entries = await this.fs!.promises.readdir(dirPath);
                for (const entry of entries) {
                    const entryPath = `${dirPath}/${entry}`;
                    const stats = await this.fs!.promises.stat(entryPath);
                    if (stats.isDirectory()) {
                        await setupWatchersRecursive(entryPath);
                    }
                }
            } catch (err) {
                // Directory might not exist
            }
        };

        const fullPath = this.resolvePath(path);
        setupWatchersRecursive(fullPath);

        // Return cleanup function
        return () => {
            watchers.forEach((w) => w.close());
        };
    }

    /**
     * Check if a file or directory exists
     */
    async exists(path: string): Promise<boolean> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);
        return await this.fs.promises.exists(fullPath);
    }

    /**
     * Get detailed information about a file or directory
     */
    async getInfo(path: string): Promise<FileInfo> {
        if (!this.fs) throw new Error('File system not initialized');

        const fullPath = this.resolvePath(path);
        const stats = await this.fs.promises.stat(fullPath);
        const name = path.substring(path.lastIndexOf('/') + 1);

        return {
            path,
            name,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            size: stats.size,
            createdTime: stats.ctime,
            modifiedTime: stats.mtime,
            accessedTime: stats.atime,
        };
    }

    /**
     * List all files matching a pattern (glob-like)
     */
    async listFiles(pattern = '**/*'): Promise<string[]> {
        if (!this.fs) throw new Error('File system not initialized');

        const files: string[] = [];

        const listRecursive = async (dirPath: string): Promise<void> => {
            try {
                const entries = await this.fs!.promises.readdir(dirPath);

                for (const entry of entries) {
                    const entryPath = `${dirPath}/${entry}`;
                    const stats = await this.fs!.promises.stat(entryPath);

                    if (stats.isFile()) {
                        const relativePath = entryPath.substring(this.basePath.length);
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
