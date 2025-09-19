'use client';

import type { SandboxDirectory, SandboxFile } from '@onlook/models';
import FS from '@isomorphic-git/lightning-fs';

/**
 * Hybrid cache implementation combining Lightning FS persistence with in-memory LRU
 * - Uses LightningFS for persistent storage (IndexedDB)
 * - Maintains in-memory LRU cache for frequently accessed files
 * - Respects memory limits and TTL like the original UnifiedCacheManager
 */
export class LightningCacheManager {
    private fs: FS;
    private fsPromises: any;
    private filesPath: string;
    private directoriesPath: string;
    
    // In-memory indices for sync operations
    private fileIndex = new Set<string>();
    private directoryIndex = new Set<string>();
    
    // In-memory LRU cache for performance
    private memoryCache = new Map<string, { data: any; lastAccessed: number; size: number }>();
    private currentMemorySize = 0;
    
    // Configuration matching original UnifiedCacheManager defaults
    private readonly maxItems: number = 500;
    private readonly maxSizeBytes: number = 50 * 1024 * 1024; // 50MB
    private readonly ttlMs: number = 1000 * 60 * 30; // 30 minutes

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
        // First check in-memory cache
        const cached = this.memoryCache.get(filePath);
        if (cached && this.isValid(cached.lastAccessed)) {
            // Update last accessed time for LRU
            cached.lastAccessed = Date.now();
            return cached.data;
        }

        // If not in memory, try to load from Lightning FS
        try {
            const cachePath = this.getFileCachePath(filePath);
            const content = await this.fsPromises.readFile(cachePath, 'utf8');
            const data = JSON.parse(content);
            
            // Add to memory cache for future access
            this.addToMemoryCache(filePath, data);
            
            return data;
        } catch {
            // Remove from memory cache if it was invalid
            this.memoryCache.delete(filePath);
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
            
            // Write to Lightning FS for persistence
            await this.fsPromises.writeFile(cachePath, JSON.stringify(cachedFile));
            this.fileIndex.add(filePath);
            
            // Add to memory cache for immediate access
            this.addToMemoryCache(filePath, cachedFile);
            
        } catch (error) {
            console.error(`Error caching file ${filePath}:`, error);
        }
    }

    async delete(filePath: string): Promise<boolean> {
        try {
            const cachePath = this.getFileCachePath(filePath);
            await this.fsPromises.unlink(cachePath);
            this.fileIndex.delete(filePath);
            
            // Remove from memory cache
            const cached = this.memoryCache.get(filePath);
            if (cached) {
                this.memoryCache.delete(filePath);
                this.currentMemorySize -= cached.size;
            }
            
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
        this.memoryCache.clear();
        this.currentMemorySize = 0;
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

    // Memory cache management methods
    private isValid(lastAccessed: number): boolean {
        return Date.now() - lastAccessed < this.ttlMs;
    }

    private estimateSize(data: any): number {
        if (!data) return 0;
        if (typeof data === 'string') return data.length * 2; // UTF-16
        if (data instanceof Uint8Array) return data.length;
        // Rough estimation for objects
        return JSON.stringify(data).length * 2;
    }

    private addToMemoryCache(key: string, data: any): void {
        const size = this.estimateSize(data);
        
        // Don't cache if item is too large
        if (size > this.maxSizeBytes * 0.1) { // Don't cache items larger than 10% of max
            return;
        }

        // Remove old entry if exists
        const existing = this.memoryCache.get(key);
        if (existing) {
            this.currentMemorySize -= existing.size;
        }

        // Add new entry
        this.memoryCache.set(key, {
            data,
            lastAccessed: Date.now(),
            size
        });
        this.currentMemorySize += size;

        // Evict if necessary
        this.evictIfNeeded();
    }

    private evictIfNeeded(): void {
        // Evict expired items first
        const now = Date.now();
        for (const [key, entry] of this.memoryCache.entries()) {
            if (!this.isValid(entry.lastAccessed)) {
                this.memoryCache.delete(key);
                this.currentMemorySize -= entry.size;
            }
        }

        // If still over limits, evict LRU items
        while (this.memoryCache.size > this.maxItems || this.currentMemorySize > this.maxSizeBytes) {
            let oldestKey: string | null = null;
            let oldestTime = now;

            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.lastAccessed < oldestTime) {
                    oldestTime = entry.lastAccessed;
                    oldestKey = key;
                }
            }

            if (oldestKey) {
                const entry = this.memoryCache.get(oldestKey)!;
                this.memoryCache.delete(oldestKey);
                this.currentMemorySize -= entry.size;
            } else {
                break; // Safety break
            }
        }
    }
}