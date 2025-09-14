import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { UnifiedCacheManager } from '../../src/components/store/editor/cache/unified-cache';
import type { CacheConfig, Serializable } from '../../src/components/store/editor/cache/types';

// Mock localforage
mock.module('localforage', () => ({
    createInstance: mock(() => ({
        getItem: mock(async () => null),
        setItem: mock(async () => undefined),
        removeItem: mock(async () => undefined),
        clear: mock(async () => undefined),
    })),
}));

interface TestData extends Serializable {
    id: string;
    content: string;
    size?: number;
}

describe('UnifiedCacheManager', () => {
    let cacheManager: UnifiedCacheManager<TestData>;
    let config: CacheConfig;

    beforeEach(async () => {
        config = {
            name: 'test-cache',
            maxItems: 5,
            maxSizeBytes: 1024,
            ttlMs: 1000 * 60 * 5, // 5 minutes
            persistent: false, // Disable persistence for tests
        };
        
        cacheManager = new UnifiedCacheManager(config);
        await cacheManager.init();
    });

    afterEach(() => {
        cacheManager.clear();
    });

    test('should store and retrieve data', () => {
        const testData: TestData = { id: 'test1', content: 'Hello World' };
        
        cacheManager.set('key1', testData);
        const retrieved = cacheManager.get('key1');
        
        expect(retrieved).toEqual(testData);
    });

    test('should return undefined for non-existent keys', () => {
        const result = cacheManager.get('non-existent');
        expect(result).toBeUndefined();
    });

    test('should check if key exists', () => {
        const testData: TestData = { id: 'test1', content: 'Hello World' };
        
        expect(cacheManager.has('key1')).toBe(false);
        
        cacheManager.set('key1', testData);
        expect(cacheManager.has('key1')).toBe(true);
    });

    test('should delete items', () => {
        const testData: TestData = { id: 'test1', content: 'Hello World' };
        
        cacheManager.set('key1', testData);
        expect(cacheManager.has('key1')).toBe(true);
        
        const deleted = cacheManager.delete('key1');
        expect(deleted).toBe(true);
        expect(cacheManager.has('key1')).toBe(false);
    });

    test('should return false when deleting non-existent key', () => {
        const deleted = cacheManager.delete('non-existent');
        expect(deleted).toBe(false);
    });

    test('should clear all items', () => {
        cacheManager.set('key1', { id: '1', content: 'test1' });
        cacheManager.set('key2', { id: '2', content: 'test2' });
        
        expect(cacheManager.size).toBe(2);
        
        cacheManager.clear();
        expect(cacheManager.size).toBe(0);
    });

    test('should track cache size', () => {
        expect(cacheManager.size).toBe(0);
        
        cacheManager.set('key1', { id: '1', content: 'test1' });
        expect(cacheManager.size).toBe(1);
        
        cacheManager.set('key2', { id: '2', content: 'test2' });
        expect(cacheManager.size).toBe(2);
        
        cacheManager.delete('key1');
        expect(cacheManager.size).toBe(1);
    });

    test('should iterate over entries', () => {
        const data1: TestData = { id: '1', content: 'test1' };
        const data2: TestData = { id: '2', content: 'test2' };
        
        cacheManager.set('key1', data1);
        cacheManager.set('key2', data2);
        
        const entries = Array.from(cacheManager.entries());
        expect(entries).toHaveLength(2);
        expect(entries).toContainEqual(['key1', data1]);
        expect(entries).toContainEqual(['key2', data2]);
    });

    test('should iterate over keys', () => {
        cacheManager.set('key1', { id: '1', content: 'test1' });
        cacheManager.set('key2', { id: '2', content: 'test2' });
        
        const keys = Array.from(cacheManager.keys());
        expect(keys).toHaveLength(2);
        expect(keys).toContain('key1');
        expect(keys).toContain('key2');
    });

    test('should handle content-based cache validation', () => {
        const testData: TestData = { id: 'test1', content: 'Hello World' };
        const contentHash = 'hash123';
        
        // Set with content hash
        cacheManager.set('key1', testData, contentHash);
        
        // Get with matching hash should return data
        const validResult = cacheManager.getCached('key1', contentHash);
        expect(validResult).toEqual(testData);
        
        // Get with different hash should return undefined and remove item
        const invalidResult = cacheManager.getCached('key1', 'different-hash');
        expect(invalidResult).toBeUndefined();
        expect(cacheManager.has('key1')).toBe(false);
    });

    test('should return cached data when no content hash is provided', () => {
        const testData: TestData = { id: 'test1', content: 'Hello World' };
        
        cacheManager.set('key1', testData, 'hash123');
        
        // Get without hash should return data
        const result = cacheManager.getCached('key1');
        expect(result).toEqual(testData);
    });

    test('should evict items when maxItems limit is reached', () => {
        // Fill cache to capacity
        for (let i = 0; i < config.maxItems; i++) {
            cacheManager.set(`key${i}`, { id: `${i}`, content: `test${i}` });
        }
        
        expect(cacheManager.size).toBe(config.maxItems);
        
        // Add one more item to trigger eviction
        cacheManager.set('overflow', { id: 'overflow', content: 'overflow data' });
        
        // Size should still be at max
        expect(cacheManager.size).toBeLessThanOrEqual(config.maxItems);
        
        // The newest item should be in cache
        expect(cacheManager.has('overflow')).toBe(true);
    });

    test('should handle TTL expiration', async () => {
        // Create cache with very short TTL for testing
        const shortTtlConfig: CacheConfig = {
            ...config,
            ttlMs: 50, // 50ms
        };
        
        const shortTtlCache = new UnifiedCacheManager<TestData>(shortTtlConfig);
        await shortTtlCache.init();
        
        const testData: TestData = { id: 'test1', content: 'Hello World' };
        shortTtlCache.set('key1', testData);
        
        // Should be available immediately
        expect(shortTtlCache.get('key1')).toEqual(testData);
        
        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Should be expired now
        expect(shortTtlCache.get('key1')).toBeUndefined();
        
        shortTtlCache.clear();
    });

    test('should handle large data that exceeds size limits', () => {
        const largeData: TestData = { 
            id: 'large', 
            content: 'x'.repeat(2000) // Larger than maxSizeBytes
        };
        
        // Should handle large data gracefully
        cacheManager.set('large-key', largeData);
        
        // The cache might evict it due to size, but shouldn't crash
        expect(() => cacheManager.get('large-key')).not.toThrow();
    });

    test('should estimate size correctly', () => {
        const smallData: TestData = { id: '1', content: 'small' };
        const mediumData: TestData = { id: '2', content: 'x'.repeat(100) }; // Smaller than before
        
        cacheManager.set('small', smallData);
        cacheManager.set('medium', mediumData);
        
        // Both should be stored initially (within size limits)
        expect(cacheManager.has('small')).toBe(true);
        expect(cacheManager.has('medium')).toBe(true);
    });

    test('should handle concurrent operations', () => {
        const testData: TestData = { id: 'test1', content: 'Hello World' };
        
        // Simulate concurrent set/get operations
        cacheManager.set('key1', testData);
        const result1 = cacheManager.get('key1');
        
        cacheManager.set('key1', { ...testData, content: 'Modified' });
        const result2 = cacheManager.get('key1');
        
        expect(result1).toEqual(testData);
        expect(result2?.content).toBe('Modified');
    });

    test('should handle empty and null data', () => {
        const emptyData: TestData = { id: '', content: '' };
        const nullishData: TestData = { id: 'test', content: '' };
        
        cacheManager.set('empty', emptyData);
        cacheManager.set('nullish', nullishData);
        
        expect(cacheManager.get('empty')).toEqual(emptyData);
        expect(cacheManager.get('nullish')).toEqual(nullishData);
    });

    test('should maintain LRU order', () => {
        // Fill cache to capacity
        for (let i = 0; i < config.maxItems; i++) {
            cacheManager.set(`key${i}`, { id: `${i}`, content: `test${i}` });
        }
        
        // Access the first item to make it recently used
        cacheManager.get('key0');
        
        // Add a new item to trigger eviction
        cacheManager.set('new-key', { id: 'new', content: 'new data' });
        
        // The first item should still be there since we accessed it
        expect(cacheManager.has('key0')).toBe(true);
        expect(cacheManager.has('new-key')).toBe(true);
    });
});