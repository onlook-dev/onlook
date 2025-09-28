import type { TemplateNode } from '@onlook/models';

export interface BlockLocation {
    blockId: string;
    path: string; // This is the resolved path (includes basePath)
    relativePath: string; // This is the user-facing relative path
    version: number;
    timestamp: number;
    templateNode: TemplateNode;
}

export interface FileSnapshot {
    path: string; // User provides relative path
    blocks: TemplateNode[];
    timestamp?: number;
}

export interface FileVersion {
    path: string; // Returns relative path to user
    version: number;
    timestamp: number;
    blockCount: number;
}

export interface BlockIndexConfig {
    name?: string;
    maxMemoryItems?: number;
    persistToDisk?: boolean;
    indexedDbName?: string;
    indexedDbVersion?: number;
}

export interface StorageBackend {
    init(basePath: string): Promise<void>;
    getBlock(blockId: string): Promise<BlockLocation | null>;
    setBlocks(resolvedPath: string, blocks: BlockLocation[]): Promise<void>;
    getBlocksByPath(resolvedPath: string): Promise<BlockLocation[]>;
    getFileVersion(resolvedPath: string): Promise<FileVersion | null>;
    deleteBlocksByPath(resolvedPath: string): Promise<void>;
    clear(): Promise<void>;
    close(): Promise<void>;
}

export interface MemoryCache {
    init(basePath: string): void;
    get(blockId: string): BlockLocation | null;
    set(blockId: string, block: BlockLocation): void;
    delete(blockId: string): void;
    getByPath(resolvedPath: string): BlockLocation[];
    deleteByPath(resolvedPath: string): void;
    clear(): void;
    size(): number;
}

export interface NegativeCache {
    init(basePath: string): void;
    add(blockId: string): void;
    has(blockId: string): boolean;
    delete(blockId: string): void;
    clear(): void;
    size(): number;
}

export type BlockIndexEventType = 'snapshot-applied' | 'block-invalidated' | 'cache-cleared';

export interface BlockIndexEvent {
    type: BlockIndexEventType;
    path?: string;
    blockIds?: string[];
    timestamp: number;
}

export type BlockIndexEventListener = (event: BlockIndexEvent) => void;