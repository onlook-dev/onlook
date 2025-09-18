'use client';

import type { SandboxDirectory, SandboxFile } from '@onlook/models';
import FS from '@isomorphic-git/lightning-fs';

/**
 * LightningFS-based cache implementation that replaces the UnifiedCacheManager
 * Uses LightningFS for persistent IndexedDB storage instead of LRU + manual IndexedDB
 */
export class LightningCacheManager {
    private fs: FS;
    private fsPromises: any;
    private filesPath: string;
    private directoriesPath: string;
    
    // In-memory indices for sync operations
    private fileIndex = new Set<string>();
    private directoryIndex = new Set<string>();

    constructor(name: string) {
        this.fs = new FS(name);
        this.fsPromises = this.fs.promises;
        this.filesPath = '/cache/files';
        this.directoriesPath = '/cache/directories';
    }

    async init(): Promise<void> {
        try {
            // Ensure cache directories exist
            await this.ensureDir('/cache');
            await this.ensureDir(this.filesPath);
            await this.ensureDir(this.directoriesPath);
            
            // Populate in-memory indices
            await this.populateIndices();
        } catch (error) {
            console.error('Error initializing LightningCacheManager:', error);
        }
    }

    // File operations
    has(filePath: string): boolean {
        return this.fileIndex.has(filePath);
    }

    async get(filePath: string): Promise<SandboxFile | undefined> {
        try {
            const cachePath = this.getFileCachePath(filePath);
            const content = await this.fsPromises.readFile(cachePath, 'utf8');
            return JSON.parse(content);
        } catch {
            return undefined;
        }
    }

    async set(filePath: string, file: SandboxFile, contentHash?: string): Promise<void> {
        try {
            const cachePath = this.getFileCachePath(filePath);
            await this.ensureDir(this.getParentDir(cachePath));
            
            const cachedFile = {
                ...file,
                _cached: true,
                _cachedAt: Date.now(),
                _contentHash: contentHash
            };
            
            await this.fsPromises.writeFile(cachePath, JSON.stringify(cachedFile));
            this.fileIndex.add(filePath);
        } catch (error) {
            console.error(`Error caching file ${filePath}:`, error);
        }
    }

    async delete(filePath: string): Promise<boolean> {
        try {
            const cachePath = this.getFileCachePath(filePath);
            await this.fsPromises.unlink(cachePath);
            this.fileIndex.delete(filePath);
            return true;
        } catch {
            return false;
        }
    }

    keys(): IterableIterator<string> {
        return this.fileIndex.values();
    }

    entries(): IterableIterator<[string, any]> {
        // Note: This is a simplified implementation for compatibility
        // In practice, we'd need to load the actual files, but this is mainly used for iteration
        const entries: [string, any][] = [];
        for (const key of this.fileIndex) {
            entries.push([key, null]); // Placeholder value
        }
        return entries.values();
    }

    get size(): number {
        return this.fileIndex.size;
    }

    clear(): void {
        this.fileIndex.clear();
        // Note: We don't clear the actual files here for performance
        // clearPersistent() handles that
    }

    async clearPersistent(): Promise<void> {
        try {
            await this.deleteDirectoryRecursive('/cache');
            this.fileIndex.clear();
            this.directoryIndex.clear();
            
            // Recreate cache directories
            await this.ensureDir('/cache');
            await this.ensureDir(this.filesPath);
            await this.ensureDir(this.directoriesPath);
        } catch (error) {
            console.error('Error clearing persistent cache:', error);
        }
    }

    // Directory operations (for compatibility with existing code)
    hasDirectory(dirPath: string): boolean {
        return this.directoryIndex.has(dirPath);
    }

    async setDirectory(dirPath: string, directory: SandboxDirectory): Promise<void> {
        try {
            const cachePath = this.getDirectoryCachePath(dirPath);
            await this.ensureDir(this.getParentDir(cachePath));
            
            const cachedDir = {
                ...directory,
                _cached: true,
                _cachedAt: Date.now()
            };
            
            await this.fsPromises.writeFile(cachePath, JSON.stringify(cachedDir));
            this.directoryIndex.add(dirPath);
        } catch (error) {
            console.error(`Error caching directory ${dirPath}:`, error);
        }
    }

    async deleteDirectory(dirPath: string): Promise<boolean> {
        try {
            const cachePath = this.getDirectoryCachePath(dirPath);
            await this.fsPromises.unlink(cachePath);
            this.directoryIndex.delete(dirPath);
            return true;
        } catch {
            return false;
        }
    }

    directoryKeys(): IterableIterator<string> {
        return this.directoryIndex.values();
    }

    directoryEntries(): IterableIterator<[string, any]> {
        const entries: [string, any][] = [];
        for (const key of this.directoryIndex) {
            entries.push([key, null]); // Placeholder value
        }
        return entries.values();
    }

    get directorySize(): number {
        return this.directoryIndex.size;
    }

    // Helper methods
    private getFileCachePath(filePath: string): string {
        const safePath = filePath.replace(/[^a-zA-Z0-9\/\-_.]/g, '_');
        return `${this.filesPath}${safePath}.json`;
    }

    private getDirectoryCachePath(dirPath: string): string {
        const safePath = dirPath.replace(/[^a-zA-Z0-9\/\-_.]/g, '_');
        return `${this.directoriesPath}${safePath}.json`;
    }

    private getParentDir(path: string): string {
        const parts = path.split('/').filter(Boolean);
        if (parts.length <= 1) {
            return '/';
        }
        return '/' + parts.slice(0, -1).join('/');
    }

    private async ensureDir(dirPath: string): Promise<void> {
        try {
            await this.fsPromises.stat(dirPath);
        } catch {
            const parentDir = this.getParentDir(dirPath);
            if (parentDir !== '/' && parentDir !== dirPath) {
                await this.ensureDir(parentDir);
            }
            try {
                await this.fsPromises.mkdir(dirPath);
            } catch (error) {
                if ((error as any).code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    private async deleteDirectoryRecursive(dirPath: string): Promise<void> {
        try {
            const entries = await this.fsPromises.readdir(dirPath);
            for (const entry of entries) {
                const entryPath = `${dirPath}/${entry}`;
                const stats = await this.fsPromises.stat(entryPath);
                
                if (stats.isDirectory()) {
                    await this.deleteDirectoryRecursive(entryPath);
                } else {
                    await this.fsPromises.unlink(entryPath);
                }
            }
            await this.fsPromises.rmdir(dirPath);
        } catch (error) {
            // Ignore errors if directory doesn't exist
        }
    }

    private async populateIndices(): Promise<void> {
        try {
            await this.populateFileIndex();
            await this.populateDirectoryIndex();
        } catch (error) {
            console.debug('Error populating cache indices:', error);
        }
    }

    private async populateFileIndex(): Promise<void> {
        try {
            const entries = await this.fsPromises.readdir(this.filesPath);
            for (const entry of entries) {
                if (entry.endsWith('.json')) {
                    const entryPath = `${this.filesPath}/${entry}`;
                    try {
                        const content = await this.fsPromises.readFile(entryPath, 'utf8');
                        const file = JSON.parse(content) as SandboxFile;
                        this.fileIndex.add(file.path);
                    } catch {
                        // Skip corrupted cache files
                    }
                }
            }
        } catch {
            // Directory might not exist yet
        }
    }

    private async populateDirectoryIndex(): Promise<void> {
        try {
            const entries = await this.fsPromises.readdir(this.directoriesPath);
            for (const entry of entries) {
                if (entry.endsWith('.json')) {
                    const entryPath = `${this.directoriesPath}/${entry}`;
                    try {
                        const content = await this.fsPromises.readFile(entryPath, 'utf8');
                        const dir = JSON.parse(content) as SandboxDirectory;
                        this.directoryIndex.add(dir.path);
                    } catch {
                        // Skip corrupted cache files
                    }
                }
            }
        } catch {
            // Directory might not exist yet
        }
    }
}