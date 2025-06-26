import { makeAutoObservable } from 'mobx';
import { VirtualFileSystem, type VirtualFileSystemInterface } from './virtual-fs';

/**
 * VFS-based sync manager that replaces the old FileSyncManager
 * Provides the same interface but uses a proper virtual file system underneath
 */
export class VFSSyncManager {
    private vfs: VirtualFileSystemInterface;

    constructor() {
        this.vfs = new VirtualFileSystem({
            persistenceKey: 'vfs-file-sync-cache',
            enablePersistence: true,
        });
        makeAutoObservable(this);
    }

    // Basic file operations
    has(filePath: string): boolean {
        return this.vfs.has(filePath);
    }

    hasBinary(filePath: string): boolean {
        return this.vfs.hasBinary(filePath);
    }

    // Track binary file path without reading content (using empty placeholder)
    async trackBinaryFile(filePath: string): Promise<void> {
        await this.vfs.trackBinaryFile(filePath);
    }

    // Check if binary file has actual content loaded
    hasBinaryContent(filePath: string): boolean {
        return this.vfs.hasBinaryContent(filePath);
    }

    async readOrFetchBinaryFile(
        filePath: string,
        readFile: (path: string) => Promise<Uint8Array | null>,
    ): Promise<Uint8Array | null> {
        // If we have the file and it has content, return it
        if (this.hasBinary(filePath) && this.hasBinaryContent(filePath)) {
            return await this.vfs.readBinaryFile(filePath);
        }

        // Otherwise, fetch from remote
        try {
            const content = await readFile(filePath);
            if (content === null) {
                throw new Error(`File content for ${filePath} not found`);
            }

            await this.vfs.writeBinaryFile(filePath, content);
            return content;
        } catch (error) {
            console.error(`Error reading binary file ${filePath}:`, error);
            return null;
        }
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<string | null>,
    ): Promise<string | null> {
        // If we have the file, return it
        if (this.has(filePath)) {
            return await this.vfs.readFile(filePath);
        }

        // Otherwise, fetch from remote
        try {
            const content = await readFile(filePath);
            if (content === null) {
                throw new Error(`File content for ${filePath} not found`);
            }

            await this.vfs.writeFile(filePath, content);
            return content;
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }

    async write(
        filePath: string,
        content: string,
        writeFile: (path: string, content: string) => Promise<boolean>,
    ): Promise<boolean> {
        try {
            // Write to VFS first
            await this.vfs.writeFile(filePath, content);

            // Then write to remote
            const success = await writeFile(filePath, content);
            if (!success) {
                throw new Error(`Failed to write file ${filePath}`);
            }
            return success;
        } catch (error) {
            // If any error occurs, remove from VFS
            await this.delete(filePath);
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async writeBinary(
        filePath: string,
        content: Uint8Array,
        writeFile: (path: string, content: Uint8Array) => Promise<boolean>,
    ): Promise<boolean> {
        try {
            // Write to VFS first
            await this.vfs.writeBinaryFile(filePath, content);

            // Then write to remote
            const success = await writeFile(filePath, content);

            if (!success) {
                throw new Error(`Failed to write file ${filePath}`);
            }
            return success;
        } catch (error) {
            // If any error occurs, remove from VFS
            await this.delete(filePath);
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async updateBinaryCache(filePath: string, content: Uint8Array): Promise<void> {
        await this.vfs.writeBinaryFile(filePath, content);
    }

    async updateCache(filePath: string, content: string): Promise<void> {
        await this.vfs.writeFile(filePath, content);
    }

    async delete(filePath: string): Promise<void> {
        await this.vfs.delete(filePath, false);
    }

    listAllFiles(): string[] {
        return this.vfs.listAllFiles();
    }

    listBinaryFiles(dir: string): string[] {
        return this.vfs.listBinaryFiles(dir);
    }

    async clear(): Promise<void> {
        await this.vfs.clear();
    }

    async syncFromRemote(filePath: string, remoteContent: string): Promise<boolean> {
        return await this.vfs.syncFromRemote(filePath, remoteContent);
    }

    // Batch operations for performance
    async updateCacheBatch(entries: Array<{ path: string; content: string }>): Promise<void> {
        await this.vfs.updateCacheBatch(entries);
    }

    async updateBinaryCacheBatch(
        entries: Array<{ path: string; content: Uint8Array }>,
    ): Promise<void> {
        await this.vfs.updateBinaryCacheBatch(entries);
    }

    // Additional VFS-specific methods
    async mkdir(dirPath: string, recursive: boolean = true): Promise<boolean> {
        return await this.vfs.mkdir(dirPath, recursive);
    }

    async readdir(dirPath: string): Promise<string[]> {
        return await this.vfs.readdir(dirPath);
    }

    async stat(filePath: string) {
        return await this.vfs.stat(filePath);
    }

    async fileExists(filePath: string): Promise<boolean> {
        return await this.vfs.fileExists(filePath);
    }

    async copy(
        source: string,
        destination: string,
        recursive: boolean = false,
        overwrite: boolean = false,
    ): Promise<boolean> {
        return await this.vfs.copy(source, destination, recursive, overwrite);
    }

    // Path utilities
    normalizePath(path: string): string {
        return this.vfs.normalizePath(path);
    }

    dirname(path: string): string {
        return this.vfs.dirname(path);
    }

    basename(path: string): string {
        return this.vfs.basename(path);
    }

    join(...paths: string[]): string {
        return this.vfs.join(...paths);
    }

    // Direct access to VFS for advanced operations
    getVFS(): VirtualFileSystemInterface {
        return this.vfs;
    }

    // Additional batch methods needed by SandboxManager
    async trackBinaryFilesBatch(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            await this.trackBinaryFile(filePath);
        }
    }

    async readOrFetchBatch(
        filePaths: string[],
        readFile: (path: string) => Promise<string | null>,
    ): Promise<Record<string, string>> {
        const results: Record<string, string> = {};

        for (const filePath of filePaths) {
            const content = await this.readOrFetch(filePath, readFile);
            if (content !== null) {
                results[filePath] = content;
            }
        }

        return results;
    }
}
