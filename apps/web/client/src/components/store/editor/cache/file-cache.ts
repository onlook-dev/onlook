'use client';

import type { SandboxDirectory, SandboxFile } from '@onlook/models';
import { LightningCacheManager } from './lightning-cache';

export class FileCacheManager {
    private fileCache: LightningCacheManager;
    private directoryCache: LightningCacheManager;

    constructor(projectId: string, branchId: string) {
        this.fileCache = new LightningCacheManager(`${projectId}-${branchId}-sandbox-files`);
        this.directoryCache = new LightningCacheManager(`${projectId}-${branchId}-sandbox-directories`);
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

    async getFile(filePath: string): Promise<SandboxFile | undefined> {
        return await this.fileCache.get(filePath);
    }

    async setFile(file: SandboxFile, contentHash?: string): Promise<void> {
        await this.fileCache.set(file.path, file, contentHash);
    }

    async deleteFile(filePath: string): Promise<boolean> {
        return await this.fileCache.delete(filePath);
    }

    // Directory cache methods
    hasDirectory(dirPath: string): boolean {
        return this.directoryCache.hasDirectory(dirPath);
    }

    async setDirectory(directory: SandboxDirectory): Promise<void> {
        await this.directoryCache.setDirectory(directory.path, directory);
    }

    async deleteDirectory(dirPath: string): Promise<boolean> {
        return await this.directoryCache.deleteDirectory(dirPath);
    }

    isFileLoaded(file: SandboxFile): boolean {
        return file && file.content !== null;
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<SandboxFile | null>,
    ): Promise<SandboxFile | null> {
        const cachedFile = await this.getFile(filePath);
        if (cachedFile && cachedFile.content !== null) {
            return cachedFile;
        }

        const newFile = await readFile(filePath);
        if (newFile) {
            await this.setFile(newFile);
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
                await this.setFile(newFile);
            }
            return writeSuccess;
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        const oldFile = await this.getFile(oldPath);
        if (oldFile) {
            const newFile = { ...oldFile, path: newPath };
            await this.setFile(newFile);
            await this.deleteFile(oldPath);
        }
    }

    async renameDirectory(oldPath: string, newPath: string): Promise<void> {
        // Normalize paths to handle trailing slash edge cases
        const normalizeDir = (path: string): string => {
            if (path === '/' || path === '') return '/';
            const normalized = path.replace(/\/+$/, ''); // Remove trailing slashes
            return normalized === '' ? '/' : normalized;
        };

        const normalizedOldPath = normalizeDir(oldPath);
        const normalizedNewPath = normalizeDir(newPath);

        // No-op when paths are identical
        if (normalizedOldPath === normalizedNewPath) {
            return;
        }

        // Guard against renaming root directory
        if (normalizedOldPath === '/') {
            throw new Error('Cannot rename root directory');
        }

        // Create prefix for matching files (handle root case)
        const prefix = normalizedOldPath === '/' ? '/' : normalizedOldPath + '/';

        // Update all files in the directory
        for (const [filePath] of this.fileCache.entries()) {
            if (filePath.startsWith(prefix)) {
                const file = await this.getFile(filePath);
                if (file) {
                    const relativePath = filePath.substring(prefix.length);
                    const newFilePath = normalizedNewPath === '/'
                        ? '/' + relativePath
                        : normalizedNewPath + '/' + relativePath;
                    const updatedFile = { ...file, path: newFilePath };
                    await this.setFile(updatedFile);
                    await this.deleteFile(filePath);
                }
            }
        }

        // Update all nested directories in the directory
        for (const [dirPath] of this.directoryCache.directoryEntries()) {
            if (dirPath.startsWith(prefix)) {
                const relativePath = dirPath.substring(prefix.length);
                const newDirPath = normalizedNewPath === '/'
                    ? '/' + relativePath
                    : normalizedNewPath + '/' + relativePath;
                const updatedDirectory = { type: 'directory' as const, path: newDirPath };
                await this.setDirectory(updatedDirectory);
                await this.deleteDirectory(dirPath);
            }
        }

        // Update directory entry using normalized paths
        if (this.hasDirectory(normalizedOldPath)) {
            const newDirectory = { type: 'directory' as const, path: normalizedNewPath };
            await this.setDirectory(newDirectory);
            await this.deleteDirectory(normalizedOldPath);
        }
    }

    listAllFiles(): string[] {
        return Array.from(this.fileCache.keys());
    }

    listAllDirectories(): string[] {
        return Array.from(this.directoryCache.directoryKeys());
    }

    async writeEmptyFile(filePath: string, type: 'binary'): Promise<void> {
        if (this.hasFile(filePath)) {
            return;
        }

        const emptyFile: SandboxFile = {
            type,
            path: filePath,
            content: null,
        };
        await this.setFile(emptyFile);
    }

    async clear(): Promise<void> {
        try {
            this.fileCache.clear();
            this.directoryCache.clear();

            await Promise.all([
                this.fileCache.clearPersistent(),
                this.directoryCache.clearPersistent(),
            ]);
        } catch (error) {
            console.error('Error clearing file cache persistent storage:', error);
        }
    }

    get fileCount(): number {
        return this.fileCache.size;
    }

    get directoryCount(): number {
        return this.directoryCache.directorySize;
    }
}