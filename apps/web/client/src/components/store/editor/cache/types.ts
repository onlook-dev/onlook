'use client';

export interface CacheConfig {
    name: string;
    maxItems: number;
    maxSizeBytes: number;
    ttlMs: number;
    persistent?: boolean;
}

export interface Serializable {
    [key: string]: any;
}

export interface CachedItem<T> {
    data: T;
    timestamp: number;
    contentHash?: string;
    size: number;
}

export interface PersistentCacheData {
    timestamp: number;
    version: number;
    entries: [string, CachedItem<Serializable>][];
}

export interface CacheBackend<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    delete(key: string): boolean;
    clear(): void;
    has(key: string): boolean;
    size: number;
    entries(): IterableIterator<[string, T]>;
    keys(): IterableIterator<string>;
}