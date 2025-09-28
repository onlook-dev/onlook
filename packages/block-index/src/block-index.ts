import type { TemplateNode } from '@onlook/models';
import type {
    BlockIndexConfig,
    BlockLocation,
    FileSnapshot,
    FileVersion,
    StorageBackend,
    MemoryCache,
    NegativeCache,
    BlockIndexEvent,
    BlockIndexEventListener,
    BlockIndexEventType,
} from './types';

export class BlockIndex {
    private config: Required<BlockIndexConfig>;
    private basePath: string;
    private memoryCache: MemoryCache | null = null;
    private storageBackend: StorageBackend | null = null;
    private negativeCache: NegativeCache | null = null;
    private fileVersions = new Map<string, number>();
    private eventListeners = new Map<BlockIndexEventType, Set<BlockIndexEventListener>>();
    private initialized = false;

    constructor(rootDir: string, config: BlockIndexConfig = {}) {
        // Ensure rootDir starts with /
        this.basePath = rootDir.startsWith('/') ? rootDir : `/${rootDir}`;
        
        this.config = {
            name: config.name ?? `block-index-${this.basePath.replace(/\//g, '-')}`,
            maxMemoryItems: config.maxMemoryItems ?? 10000,
            persistToDisk: config.persistToDisk ?? true,
            indexedDbName: config.indexedDbName ?? 'onlook-block-index',
            indexedDbVersion: config.indexedDbVersion ?? 1,
        };
    }

    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
    }

    /**
     * Resolve a user path to the full path within the root directory
     */
    private resolvePath(path: string): string {
        // Normalize path
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        // Ensure basePath doesn't end with / and path starts with /
        // to avoid double slashes when concatenating
        const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;

        return base + path;
    }

    /**
     * Get the relative path from a full resolved path
     */
    private getRelativePath(fullPath: string): string {
        const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
        if (fullPath.startsWith(base)) {
            return fullPath.substring(base.length) || '/';
        }
        return fullPath;
    }

    /**
     * Apply a complete snapshot for a file - atomically replaces all old blocks
     * @param path - File path (relative to root directory)
     * @param blocks - Array of TemplateNodes for this file
     * @param nowMs - Optional timestamp, defaults to Date.now()
     * @returns Promise that resolves when snapshot is applied
     */
    async applyFileSnapshot(path: string, blocks: TemplateNode[], nowMs?: number): Promise<void> {
        if (!this.initialized) {
            throw new Error('BlockIndex not initialized. Call init() first.');
        }

        const resolvedPath = this.resolvePath(path);
        const timestamp = nowMs ?? Date.now();
        const currentVersion = this.fileVersions.get(resolvedPath) ?? 0;
        const newVersion = currentVersion + 1;

        this.fileVersions.set(resolvedPath, newVersion);

        this.emitEvent({
            type: 'snapshot-applied',
            path: path, // Keep original relative path in event
            blockIds: blocks.map(block => this.generateBlockId(block, resolvedPath)),
            timestamp,
        });
    }

    /**
     * Resolve a blockId to its current location
     * @param blockId - The block ID to resolve
     * @returns BlockLocation if valid, null if invalid/not found
     */
    async resolve(blockId: string): Promise<BlockLocation | null> {
        if (!this.initialized) {
            throw new Error('BlockIndex not initialized. Call init() first.');
        }

        if (this.negativeCache?.has(blockId)) {
            return null;
        }

        return null;
    }

    /**
     * List all current blocks for a given file path
     * @param path - File path (relative to root directory) to get blocks for
     * @returns Array of BlockLocations for the latest snapshot
     */
    async listByPath(path: string): Promise<BlockLocation[]> {
        if (!this.initialized) {
            throw new Error('BlockIndex not initialized. Call init() first.');
        }

        const resolvedPath = this.resolvePath(path);
        
        // TODO: Implementation will get blocks from storage
        // For now return empty array
        return [];
    }

    /**
     * Get the current version counter for a file
     * @param path - File path (relative to root directory)
     * @returns Current version number
     */
    async getFileVersion(path: string): Promise<number> {
        if (!this.initialized) {
            throw new Error('BlockIndex not initialized. Call init() first.');
        }

        const resolvedPath = this.resolvePath(path);
        return this.fileVersions.get(resolvedPath) ?? 0;
    }

    /**
     * Get file version information including metadata
     * @param path - File path (relative to root directory)
     * @returns FileVersion object with metadata
     */
    async getFileVersionInfo(path: string): Promise<FileVersion | null> {
        if (!this.initialized) {
            throw new Error('BlockIndex not initialized. Call init() first.');
        }

        const resolvedPath = this.resolvePath(path);
        const version = this.fileVersions.get(resolvedPath);
        if (version === undefined) {
            return null;
        }

        const blocks = await this.listByPath(path);

        return {
            path, // Return relative path to user
            version,
            timestamp: Date.now(), // This would come from storage in real implementation
            blockCount: blocks.length,
        };
    }

    /**
     * Clear all data from the index
     */
    async clear(): Promise<void> {
        if (!this.initialized) {
            throw new Error('BlockIndex not initialized. Call init() first.');
        }

        this.fileVersions.clear();
        this.memoryCache?.clear();
        this.negativeCache?.clear();
        await this.storageBackend?.clear();

        this.emitEvent({
            type: 'cache-cleared',
            timestamp: Date.now(),
        });
    }

    /**
     * Add event listener for block index events
     */
    addEventListener(type: BlockIndexEventType, listener: BlockIndexEventListener): void {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, new Set());
        }
        this.eventListeners.get(type)!.add(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(type: BlockIndexEventType, listener: BlockIndexEventListener): void {
        this.eventListeners.get(type)?.delete(listener);
    }

    /**
     * Close the block index and clean up resources
     */
    async close(): Promise<void> {
        if (!this.initialized) {
            return;
        }

        await this.storageBackend?.close();
        this.eventListeners.clear();
        this.initialized = false;
    }

    private generateBlockId(templateNode: TemplateNode, resolvedPath: string): string {
        // Use the resolved path for consistent block IDs within this root directory
        return `${resolvedPath}:${templateNode.startTag.start.line}:${templateNode.startTag.start.column}`;
    }

    private emitEvent(event: BlockIndexEvent): void {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    console.error(`Error in BlockIndex event listener:`, error);
                }
            });
        }
    }
}