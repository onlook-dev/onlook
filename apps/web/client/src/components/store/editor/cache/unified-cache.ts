'use client';

import { jsonClone } from '@onlook/utility';
import localforage from 'localforage';
import { LRUCache } from 'lru-cache';
import type { CacheConfig, CachedItem, PersistentCacheData, Serializable } from './types';

export class UnifiedCacheManager<T extends Serializable = Serializable> {
    private memoryCache: LRUCache<string, CachedItem<T>>;
    private persistentStore?: LocalForage;
    private config: CacheConfig;
    private initialized = false;

    constructor(config: CacheConfig) {
        this.config = config;

        this.memoryCache = new LRUCache({
            max: config.maxItems,
            maxSize: config.maxSizeBytes,
            sizeCalculation: (item: CachedItem<T>) => item.size,
            ttl: config.ttlMs,
        });

        if (config.persistent && typeof window !== 'undefined') {
            this.persistentStore = localforage.createInstance({
                name: `onlook-cache-${config.name}`,
                storeName: 'cache',
                description: `Unified cache for ${config.name}`,
            });
        }
    }

    async init(): Promise<void> {
        if (this.initialized) return;

        if (this.persistentStore && this.memoryCache.size === 0) {
            await this.loadFromPersistent();
        }

        this.initialized = true;
    }

    get(key: string): T | undefined {
        const cached = this.memoryCache.get(key);
        return cached?.data;
    }

    set(key: string, data: T, contentHash?: string): void {
        const size = this.estimateSize(data);
        const item: CachedItem<T> = {
            data,
            timestamp: Date.now(),
            contentHash,
            size,
        };

        this.memoryCache.set(key, item);

        // Trigger periodic persistence
        if (this.shouldPersist()) {
            this.saveToPersistent().catch(console.warn);
        }
    }

    has(key: string): boolean {
        return this.memoryCache.has(key);
    }

    delete(key: string): boolean {
        return this.memoryCache.delete(key);
    }

    clear(): void {
        this.memoryCache.clear();
    }

    get size(): number {
        return this.memoryCache.size;
    }

    entries(): IterableIterator<[string, T]> {
        const entries: [string, T][] = [];
        for (const [key, cached] of this.memoryCache.entries()) {
            entries.push([key, cached.data]);
        }
        return entries[Symbol.iterator]();
    }

    keys(): IterableIterator<string> {
        return this.memoryCache.keys();
    }

    // Content-based cache checking
    getCached(key: string, currentContentHash?: string): T | undefined {
        const cached = this.memoryCache.get(key);
        if (!cached) return undefined;

        if (currentContentHash && cached.contentHash !== currentContentHash) {
            this.delete(key);
            return undefined;
        }

        return cached.data;
    }

    private async loadFromPersistent(): Promise<void> {
        if (!this.persistentStore) return;

        try {
            const data = await this.persistentStore.getItem<PersistentCacheData>('cache-data');
            if (!data) return;

            // Check if cache is too old (24 hours)
            if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                await this.persistentStore.removeItem('cache-data');
                return;
            }

            // Restore cache entries (jsonClone already handled serialization)
            for (const [key, item] of data.entries) {
                this.memoryCache.set(key, item as CachedItem<T>);
            }

        } catch (error) {
            console.warn(`[UnifiedCache:${this.config.name}] Failed to load from persistent storage:`, error);
        }
    }

    async saveToPersistent(): Promise<void> {
        if (!this.persistentStore || this.memoryCache.size === 0) return;

        try {
            const entries: [string, any][] = [];
            for (const [key, item] of this.memoryCache.entries()) {
                try {
                    // Use jsonClone to strip MobX observables and create serializable data
                    const serializedItem = jsonClone(item);
                    entries.push([key, serializedItem]);
                } catch (serializationError) {
                    console.warn(`[UnifiedCache:${this.config.name}] Skipping non-serializable item with key: ${key}`, serializationError);
                    continue;
                }
            }

            if (entries.length === 0) {
                return;
            }

            const data: PersistentCacheData = {
                timestamp: Date.now(),
                version: 1,
                entries,
            };

            await this.persistentStore.setItem('cache-data', data);
        } catch (error) {
            console.warn(`[UnifiedCache:${this.config.name}] Failed to save to persistent storage:`, error);
        }
    }

    async clearPersistent(): Promise<void> {
        if (!this.persistentStore) return;
        await this.persistentStore.clear();
    }

    private shouldPersist(): boolean {
        if (!this.persistentStore) return false;
        return this.memoryCache.size % 10 === 0 || this.memoryCache.size <= 3;
    }

    private estimateSize(data: T): number {
        try {
            return new TextEncoder().encode(JSON.stringify(data)).length;
        } catch (error) {
            // If data is not serializable, estimate based on object properties
            if (typeof data === 'object' && data !== null) {
                let size = 0;
                try {
                    for (const [key, value] of Object.entries(data)) {
                        size += key.length * 2; // UTF-16 encoding
                        if (typeof value === 'string') {
                            size += value.length * 2;
                        } else if (value instanceof Uint8Array) {
                            size += value.length;
                        } else if (typeof value === 'number' || typeof value === 'boolean') {
                            size += 8; // Approximate
                        } else {
                            size += 100; // Fallback for complex objects
                        }
                    }
                    return size;
                } catch {
                    return 1000; // Final fallback
                }
            }
            return 1000; // Fallback size
        }
    }
}
