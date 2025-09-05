'use client';

import type { SandboxDirectory, SandboxFile } from '@onlook/models';
import { UnifiedCacheManager } from './unified-cache';

export class FileCacheManager {
    private fileCache: UnifiedCacheManager<SandboxFile>;
    private directoryCache: UnifiedCacheManager<SandboxDirectory>;

    constructor() {
        this.fileCache = new UnifiedCacheManager({
            name: 'sandbox-files',
            maxItems: 500,
            maxSizeBytes: 50 * 1024 * 1024, // 50MB
            ttlMs: 1000 * 60 * 30, // 30 minutes
            persistent: true,
        });

        this.directoryCache = new UnifiedCacheManager({
            name: 'sandbox-directories',
            maxItems: 1000,
            maxSizeBytes: 5 * 1024 * 1024, // 5MB
            ttlMs: 1000 * 60 * 60, // 1 hour
            persistent: false, // Directories are lightweight, no need to persist
        });
    }

    async init(): Promise<void> {
        await Promise.all([
            this.fileCache.init(),
            this.directoryCache.init(),
        ]);
    }

    // File cache methods
    hasFile(filePath: string): boolean {
        return this.fileCache.has(filePath);
    }

    getFile(filePath: string): SandboxFile | undefined {
        return this.fileCache.get(filePath);
    }

    setFile(file: SandboxFile, contentHash?: string): void {
        this.fileCache.set(file.path, file, contentHash);
    }

    deleteFile(filePath: string): boolean {
        return this.fileCache.delete(filePath);
    }

    // Directory cache methods
    hasDirectory(dirPath: string): boolean {
        return this.directoryCache.has(dirPath);
    }

    setDirectory(directory: SandboxDirectory): void {
        this.directoryCache.set(directory.path, directory);
    }

    deleteDirectory(dirPath: string): boolean {
        return this.directoryCache.delete(dirPath);
    }

    // Utility methods
    async isFileLoaded(file: SandboxFile): Promise<boolean> {
        return file && file.content !== null;
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<SandboxFile | null>,
    ): Promise<SandboxFile | null> {
        const cachedFile = this.getFile(filePath);
        if (cachedFile && cachedFile.content !== null) {
            return cachedFile;
        }

        const newFile = await readFile(filePath);
        if (newFile) {
            this.setFile(newFile);
        }
        return newFile;
    }

    async write(
        filePath: string,
        content: string | Uint8Array,
        writeFile: (path: string, content: string | Uint8Array) => Promise<boolean>,
    ): Promise<boolean> {
        try {
            const writeSuccess = await writeFile(filePath, content);
            if (writeSuccess) {
                const type = content instanceof Uint8Array ? 'binary' : 'text';
                const newFile: SandboxFile = {
                    type,
                    path: filePath,
                    content,
                } as SandboxFile;
                this.setFile(newFile);
            }
            return writeSuccess;
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    rename(oldPath: string, newPath: string): void {
        const oldFile = this.getFile(oldPath);
        if (oldFile) {
            const newFile = { ...oldFile, path: newPath };
            this.setFile(newFile);
            this.deleteFile(oldPath);
        }
    }

    renameDirectory(oldPath: string, newPath: string): void {
        // Update all files in the directory
        for (const [filePath, file] of this.fileCache.entries()) {
            if (filePath.startsWith(oldPath + '/')) {
                const relativePath = filePath.substring(oldPath.length);
                const newFilePath = newPath + relativePath;
                const updatedFile = { ...file, path: newFilePath };
                this.setFile(updatedFile);
                this.deleteFile(filePath);
            }
        }

        // Update directory entry
        const directory = this.directoryCache.get(oldPath);
        if (directory) {
            const newDirectory = { ...directory, path: newPath };
            this.setDirectory(newDirectory);
            this.deleteDirectory(oldPath);
        }
    }

    listAllFiles(): string[] {
        return Array.from(this.fileCache.keys());
    }

    listAllDirectories(): string[] {
        return Array.from(this.directoryCache.keys());
    }

    writeEmptyFile(filePath: string, type: 'binary'): void {
        if (this.hasFile(filePath)) {
            return;
        }

        const emptyFile: SandboxFile = {
            type,
            path: filePath,
            content: null,
        };
        this.setFile(emptyFile);
    }

    clear(): void {
        this.fileCache.clear();
        this.directoryCache.clear();
    }

    get fileCount(): number {
        return this.fileCache.size;
    }

    get directoryCount(): number {
        return this.directoryCache.size;
    }
}