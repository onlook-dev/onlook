import { beforeEach, describe, expect, mock, test, spyOn } from 'bun:test';
import localforage from 'localforage';
import { StateMachineFileSyncManager } from '../../src/components/store/editor/sandbox/file-sync-state-machine';

// Mock localforage
const mockLocalforage = {
    getItem: mock(async () => null),
    setItem: mock(async () => undefined),
    removeItem: mock(async () => undefined),
} as any;

// Mock convertToBase64 utility
mock.module('@onlook/utility', () => ({
    convertToBase64: mock((data: Uint8Array) => {
        return btoa(String.fromCharCode(...data));
    })
}));

describe('StateMachineFileSyncManager', () => {
    let manager: StateMachineFileSyncManager;
    let mockWriteRemote: ReturnType<typeof mock>;
    let mockReadRemote: ReturnType<typeof mock>;
    let mockWriteBinaryRemote: ReturnType<typeof mock>;
    let mockReadBinaryRemote: ReturnType<typeof mock>;

    beforeEach(() => {
        // Reset mocks
        mockLocalforage.getItem.mockClear();
        mockLocalforage.setItem.mockClear();
        mockLocalforage.removeItem.mockClear();

        // Spy on localforage methods
        spyOn(localforage, 'getItem').mockImplementation(mockLocalforage.getItem);
        spyOn(localforage, 'setItem').mockImplementation(mockLocalforage.setItem);
        spyOn(localforage, 'removeItem').mockImplementation(mockLocalforage.removeItem);

        // Create fresh manager instance
        manager = new StateMachineFileSyncManager();

        // Create mock functions
        mockWriteRemote = mock(async (path: string, content: string) => true);
        mockReadRemote = mock(async (path: string) => `content of ${path}`);
        mockWriteBinaryRemote = mock(async (path: string, content: Uint8Array) => true);
        mockReadBinaryRemote = mock(async (path: string) => new Uint8Array([1, 2, 3]));
    });

    describe('Basic File Operations', () => {
        test('should save file and transition from clean to dirty to syncing to clean', async () => {
            const filePath = 'test.txt';
            const content = 'Hello World';

            // Initial state should be clean
            expect(manager.getFileState(filePath)).toBe('clean');

            // Save file
            const result = await manager.saveFile(filePath, content, mockWriteRemote);

            expect(result).toBe(true);
            expect(mockWriteRemote).toHaveBeenCalledWith(filePath, content);
            
            // Should eventually be clean after sync
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(manager.getFileState(filePath)).toBe('clean');
        });

        test('should read file from cache after saving', async () => {
            const filePath = 'test.txt';
            const content = 'Hello World';

            await manager.saveFile(filePath, content, mockWriteRemote);
            
            const readContent = await manager.readOrFetch(filePath, mockReadRemote);
            
            expect(readContent).toBe(content);
            expect(mockReadRemote).not.toHaveBeenCalled(); // Should read from cache
        });

        test('should read file from remote if not in cache', async () => {
            const filePath = 'test.txt';
            
            const content = await manager.readOrFetch(filePath, mockReadRemote);
            
            expect(content).toBe(`content of ${filePath}`);
            expect(mockReadRemote).toHaveBeenCalledWith(filePath);
            expect(manager.getFileState(filePath)).toBe('clean');
        });
    });

    describe('State Transitions', () => {
        test('should handle rapid writes by queueing during sync', async () => {
            const filePath = 'test.txt';
            
            // Mock slow remote write
            const slowWrite = mock(async (path: string, content: string) => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return true;
            });

            // Start first write
            const promise1 = manager.saveFile(filePath, 'content1', slowWrite);
            
            // Immediately start second write while first is syncing
            const promise2 = manager.saveFile(filePath, 'content2', slowWrite);

            const [result1, result2] = await Promise.all([promise1, promise2]);
            
            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(slowWrite).toHaveBeenCalledTimes(2); // Both writes should eventually complete
        });

        test('should handle write failure by staying in dirty state', async () => {
            const filePath = 'test.txt';
            const content = 'Hello World';
            
            const failingWrite = mock(async () => false);

            await manager.saveFile(filePath, content, failingWrite);
            
            // Should stay dirty after failed write
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(manager.getFileState(filePath)).toBe('dirty');
        });
    });

    describe('Conflict Detection and Resolution', () => {
        test('should detect conflict when remote content differs from local', async () => {
            const filePath = 'test.txt';
            const localContent = 'Local changes';
            const remoteContent = 'Remote changes';

            // Save local content with a failing write to keep it in dirty state
            const failingWrite = mock(async () => false);
            await manager.saveFile(filePath, localContent, failingWrite);
            
            // Give it a moment to fail and stay dirty
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(manager.getFileState(filePath)).toBe('dirty');
            
            // Now simulate remote change - this should create conflict
            const result = await manager.onRemoteChange(filePath, remoteContent);
            
            expect(result.contentChanged).toBe(true);
            expect(result.shouldProcess).toBe(false);
            expect(manager.getFileState(filePath)).toBe('conflict');
            expect(manager.getConflictFiles()).toContain(filePath);
        });

        test('should resolve conflict by accepting local changes', async () => {
            const filePath = 'test.txt';
            const localContent = 'Local changes';
            const remoteContent = 'Remote changes';

            // Create a file in dirty state using failing write
            const failingWrite = mock(async () => false);
            await manager.saveFile(filePath, localContent, failingWrite);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Simulate remote change to create conflict
            await manager.onRemoteChange(filePath, remoteContent);
            
            expect(manager.getFileState(filePath)).toBe('conflict');
            
            // Resolve with local
            const resolved = await manager.resolveConflictWithLocal(filePath, mockWriteRemote);
            
            expect(resolved).toBe(true);
            expect(manager.getFileState(filePath)).toBe('clean');
            expect(manager.getConflictFiles()).not.toContain(filePath);
        });

        test('should resolve conflict by accepting remote changes', async () => {
            const filePath = 'test.txt';
            const localContent = 'Local changes';
            const remoteContent = 'Remote changes';

            // Create a file in dirty state using failing write
            const failingWrite = mock(async () => false);
            await manager.saveFile(filePath, localContent, failingWrite);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Simulate remote change to create conflict
            await manager.onRemoteChange(filePath, remoteContent);
            
            expect(manager.getFileState(filePath)).toBe('conflict');
            
            // Resolve with remote
            const resolved = await manager.resolveConflictWithRemote(filePath);
            
            expect(resolved).toBe(true);
            expect(manager.getFileState(filePath)).toBe('clean');
            
            // Content should be remote content
            const content = await manager.readOrFetch(filePath, mockReadRemote);
            expect(content).toBe(remoteContent);
        });

        test('should handle conflict resolution during new writes', async () => {
            const filePath = 'test.txt';
            const localContent = 'Local changes';
            const remoteContent = 'Remote changes';
            const newContent = 'New local changes';

            // Create a file in dirty state using failing write
            const failingWrite = mock(async () => false);
            await manager.saveFile(filePath, localContent, failingWrite);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Simulate remote change to create conflict
            await manager.onRemoteChange(filePath, remoteContent);
            
            expect(manager.getFileState(filePath)).toBe('conflict');
            
            // New write should resolve conflict by prioritizing local
            await manager.saveFile(filePath, newContent, mockWriteRemote);
            
            expect(manager.getFileState(filePath)).toBe('clean');
            expect(manager.getConflictFiles()).not.toContain(filePath);
        });
    });

    describe('Binary File Operations', () => {
        test('should handle binary file saves', async () => {
            const filePath = 'image.png';
            const content = new Uint8Array([255, 216, 255]); // JPEG header

            const result = await manager.saveBinaryFile(filePath, content, mockWriteBinaryRemote);
            
            expect(result).toBe(true);
            expect(mockWriteBinaryRemote).toHaveBeenCalledWith(filePath, content);
        });

        test('should read binary files from cache', async () => {
            const filePath = 'image.png';
            const content = new Uint8Array([255, 216, 255]);

            await manager.saveBinaryFile(filePath, content, mockWriteBinaryRemote);
            
            const readContent = await manager.readOrFetchBinaryFile(filePath, mockReadBinaryRemote);
            
            expect(readContent).toEqual(content);
            expect(mockReadBinaryRemote).not.toHaveBeenCalled();
        });

        test('should track binary files in batch', async () => {
            const filePaths = ['image1.png', 'image2.jpg', 'image3.gif'];
            
            await manager.trackBinaryFilesBatch(filePaths);
            
            const allFiles = manager.listAllFiles();
            filePaths.forEach(filePath => {
                expect(allFiles).toContain(filePath);
            });
        });
    });

    describe('Batch Operations', () => {
        test('should read multiple files in batch', async () => {
            const filePaths = ['file1.txt', 'file2.txt', 'file3.txt'];
            
            const results = await manager.readOrFetchBatch(filePaths, mockReadRemote);
            
            expect(Object.keys(results)).toHaveLength(3);
            filePaths.forEach(filePath => {
                expect(results[filePath]).toBe(`content of ${filePath}`);
            });
        });

        test('should handle batch read with some failures', async () => {
            const filePaths = ['file1.txt', 'file2.txt', 'file3.txt'];
            
            const flakyRead = mock(async (path: string) => {
                if (path === 'file2.txt') {
                    throw new Error('File not found');
                }
                return `content of ${path}`;
            });
            
            const results = await manager.readOrFetchBatch(filePaths, flakyRead);
            
            expect(Object.keys(results)).toHaveLength(2);
            expect(results['file1.txt']).toBe('content of file1.txt');
            expect(results['file3.txt']).toBe('content of file3.txt');
            expect(results['file2.txt']).toBeUndefined();
        });
    });

    describe('File Management', () => {
        test('should list all files', async () => {
            await manager.saveFile('text1.txt', 'content1', mockWriteRemote);
            await manager.saveBinaryFile('image1.png', new Uint8Array([1, 2, 3]), mockWriteBinaryRemote);
            
            const allFiles = manager.listAllFiles();
            
            expect(allFiles).toContain('text1.txt');
            expect(allFiles).toContain('image1.png');
        });

        test('should list binary files in directory', async () => {
            await manager.saveBinaryFile('assets/image1.png', new Uint8Array([1]), mockWriteBinaryRemote);
            await manager.saveBinaryFile('assets/image2.jpg', new Uint8Array([2]), mockWriteBinaryRemote);
            await manager.saveBinaryFile('other/image3.gif', new Uint8Array([3]), mockWriteBinaryRemote);
            
            const assetsFiles = manager.listBinaryFiles('assets/');
            
            expect(assetsFiles).toContain('assets/image1.png');
            expect(assetsFiles).toContain('assets/image2.jpg');
            expect(assetsFiles).not.toContain('other/image3.gif');
        });

        test('should delete files and clean up state', async () => {
            const filePath = 'test.txt';
            
            await manager.saveFile(filePath, 'content', mockWriteRemote);
            expect(manager.listAllFiles()).toContain(filePath);
            
            await manager.delete(filePath);
            
            expect(manager.listAllFiles()).not.toContain(filePath);
            expect(manager.getFileState(filePath)).toBe('clean'); // Default state
        });

        test('should clear all files and state', async () => {
            await manager.saveFile('text1.txt', 'content1', mockWriteRemote);
            await manager.saveBinaryFile('image1.png', new Uint8Array([1]), mockWriteBinaryRemote);
            
            expect(manager.listAllFiles().length).toBeGreaterThan(0);
            
            await manager.clear();
            
            expect(manager.listAllFiles()).toHaveLength(0);
            expect(mockLocalforage.removeItem).toHaveBeenCalledTimes(2);
        });
    });

    describe('Edge Cases', () => {
        test('should handle remote change on clean file with same content', async () => {
            const filePath = 'test.txt';
            const content = 'same content';

            // Save and let it sync
            await manager.saveFile(filePath, content, mockWriteRemote);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Remote change with same content
            const result = await manager.onRemoteChange(filePath, content);
            
            expect(result.contentChanged).toBe(false);
            expect(result.shouldProcess).toBe(false);
            expect(manager.getFileState(filePath)).toBe('clean');
        });

        test('should handle updateCache compatibility method', async () => {
            const filePath = 'test.txt';
            const content = 'direct cache update';
            
            await manager.updateCache(filePath, content);
            
            expect(manager.getFileState(filePath)).toBe('clean');
            
            const readContent = await manager.readOrFetch(filePath, mockReadRemote);
            expect(readContent).toBe(content);
        });

        test('should handle setState on unknown file gracefully', async () => {
            const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {});
            
            // This should not warn anymore since we now create the file
            // @ts-ignore - Testing private method
            manager.setState('unknown.txt', 'dirty');
            
            // Should create the file instead of warning
            expect(manager.getFileState('unknown.txt')).toBe('dirty');
            expect(consoleSpy).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        test('should handle concurrent sync operations on same file', async () => {
            const filePath = 'test.txt';
            
            // Mock write that takes time
            const slowWrite = mock(async (path: string, content: string) => {
                await new Promise(resolve => setTimeout(resolve, 30));
                return true;
            });

            // Start two concurrent syncs
            const [result1, result2] = await Promise.all([
                manager.saveFile(filePath, 'content1', slowWrite),
                manager.saveFile(filePath, 'content2', slowWrite)
            ]);
            
            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(slowWrite).toHaveBeenCalledTimes(2);
        });
    });

    describe('Storage Persistence', () => {
        test('should save to and restore from localStorage', async () => {
            const filePath = 'persistent.txt';
            const content = 'persistent content';
            
            // Mock storage data
            const mockStorageData = {
                [filePath]: {
                    state: 'clean',
                    content: content,
                    lastModified: Date.now()
                }
            };
            
            mockLocalforage.getItem.mockResolvedValueOnce(mockStorageData);
            
            // Create new manager to test restoration
            const newManager = new StateMachineFileSyncManager();
            
            // Wait for restoration to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockLocalforage.getItem).toHaveBeenCalled();
            
            // Should have restored the file
            const readContent = await newManager.readOrFetch(filePath, mockReadRemote);
            expect(readContent).toBe(content);
            expect(mockReadRemote).not.toHaveBeenCalled(); // Should read from cache
        });

        test('should handle storage errors gracefully', async () => {
            const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
            
            mockLocalforage.getItem.mockRejectedValueOnce(new Error('Storage error'));
            
            // Should not throw
            const errorManager = new StateMachineFileSyncManager();
            
            // Wait for constructor's async operations to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(consoleSpy).toHaveBeenCalledWith('[StateMachine] Error restoring from storage:', expect.any(Error));
            
            consoleSpy.mockRestore();
        });
    });
}); 