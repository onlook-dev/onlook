import { VFSSyncManager } from '../../src/components/store/editor/sandbox/vfs-sync-manager';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

mock.module('localforage', () => ({
    getItem: mock(async () => null),
    setItem: mock(async () => undefined),
    removeItem: mock(async () => undefined),
}));

describe('VFSSyncManager', () => {
    let syncManager: VFSSyncManager;
    let mockReadFile: any;
    let mockWriteFile: any;

    beforeEach(() => {
        // Create mock file operations
        mockReadFile = mock(async (path: string) => {
            if (path === '/file1.tsx') {
                return '<div>Remote Content 1</div>';
            } else if (path === '/file2.tsx') {
                return '<div>Remote Content 2</div>';
            }
            return null;
        });

        mockWriteFile = mock(async (path: string, content: string) => {
            return true;
        });

        syncManager = new VFSSyncManager();
    });

    afterEach(async () => {
        await syncManager.clear();
    });

    describe('Basic Sync Operations', () => {
        test('should read from VFS if file exists', async () => {
            // Pre-populate VFS
            await syncManager.updateCache('/file1.tsx', '<div>Cached Content</div>');

            const content = await syncManager.readOrFetch('/file1.tsx', mockReadFile);

            expect(content).toBe('<div>Cached Content</div>');
            expect(mockReadFile).not.toHaveBeenCalled();
        });

        test('should fetch from remote if file not in VFS', async () => {
            const content = await syncManager.readOrFetch('/file1.tsx', mockReadFile);

            expect(content).toBe('<div>Remote Content 1</div>');
            expect(mockReadFile).toHaveBeenCalledWith('/file1.tsx');

            // Should now be cached
            expect(syncManager.has('/file1.tsx')).toBe(true);
        });

        test('should write to VFS and remote', async () => {
            const newContent = '<div>New Content</div>';

            const success = await syncManager.write('/file1.tsx', newContent, mockWriteFile);

            expect(success).toBe(true);
            expect(mockWriteFile).toHaveBeenCalledWith('/file1.tsx', newContent);

            // Should be cached in VFS
            const cachedContent = await syncManager.readOrFetch('/file1.tsx', mockReadFile);
            expect(cachedContent).toBe(newContent);
        });

        test('should handle write failures', async () => {
            const failingWriteFile = mock(async () => false);

            // Suppress console.error for this test since we expect an error
            const originalConsoleError = console.error;
            console.error = () => {};

            const success = await syncManager.write('/file1.tsx', 'content', failingWriteFile);

            // Restore console.error
            console.error = originalConsoleError;

            expect(success).toBe(false);
            expect(syncManager.has('/file1.tsx')).toBe(false);
        });
    });

    describe('Binary File Operations', () => {
        test('should handle binary files', async () => {
            const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
            const mockBinaryRead = mock(async () => binaryData);
            const mockBinaryWrite = mock(async () => true);

            // Test read or fetch
            const result = await syncManager.readOrFetchBinaryFile('/image.png', mockBinaryRead);
            expect(result).toEqual(binaryData);

            // Test write
            const success = await syncManager.writeBinary(
                '/image2.png',
                binaryData,
                mockBinaryWrite,
            );
            expect(success).toBe(true);
            expect(mockBinaryWrite).toHaveBeenCalledWith('/image2.png', binaryData);
        });

        test('should track binary files without content', async () => {
            await syncManager.trackBinaryFile('/placeholder.png');

            expect(syncManager.hasBinary('/placeholder.png')).toBe(true);
            expect(syncManager.hasBinaryContent('/placeholder.png')).toBe(false);
        });
    });

    describe('Batch Operations', () => {
        test('should handle batch reads', async () => {
            const filePaths = ['/file1.tsx', '/file2.tsx'];

            const results = await syncManager.readOrFetchBatch(filePaths, mockReadFile);

            expect(results['/file1.tsx']).toBe('<div>Remote Content 1</div>');
            expect(results['/file2.tsx']).toBe('<div>Remote Content 2</div>');
            expect(mockReadFile).toHaveBeenCalledTimes(2);
        });

        test('should handle batch binary tracking', async () => {
            const filePaths = ['/image1.png', '/image2.jpg', '/image3.gif'];

            await syncManager.trackBinaryFilesBatch(filePaths);

            for (const path of filePaths) {
                expect(syncManager.hasBinary(path)).toBe(true);
            }
        });

        test('should handle batch cache updates', async () => {
            const entries = [
                { path: '/file1.tsx', content: 'Content 1' },
                { path: '/file2.tsx', content: 'Content 2' },
            ];

            await syncManager.updateCacheBatch(entries);

            for (const entry of entries) {
                expect(await syncManager.readOrFetch(entry.path, mockReadFile)).toBe(entry.content);
            }
        });
    });

    describe('Directory Operations', () => {
        test('should create directories', async () => {
            const success = await syncManager.mkdir('/test-dir');
            expect(success).toBe(true);

            const stats = await syncManager.stat('/test-dir');
            expect(stats?.isDirectory()).toBe(true);
        });

        test('should list directory contents', async () => {
            await syncManager.updateCache('/dir/file1.txt', 'content1');
            await syncManager.updateCache('/dir/file2.txt', 'content2');

            const entries = await syncManager.readdir('/dir');
            expect(entries).toContain('file1.txt');
            expect(entries).toContain('file2.txt');
        });
    });

    describe('File Listing', () => {
        test('should list all files', async () => {
            await syncManager.updateCache('/file1.txt', 'content1');
            await syncManager.updateCache('/dir/file2.txt', 'content2');

            const allFiles = syncManager.listAllFiles();
            expect(allFiles).toContain('/file1.txt');
            expect(allFiles).toContain('/dir/file2.txt');
        });

        test('should list binary files in directory', async () => {
            await syncManager.trackBinaryFile('/images/photo.jpg');
            await syncManager.trackBinaryFile('/images/icon.png');
            await syncManager.updateCache('/images/readme.txt', 'text file');

            const binaryFiles = syncManager.listBinaryFiles('/images');
            expect(binaryFiles).toContain('/images/photo.jpg');
            expect(binaryFiles).toContain('/images/icon.png');
            expect(binaryFiles).not.toContain('/images/readme.txt');
        });
    });

    describe('Sync Operations', () => {
        test('should sync from remote and detect changes', async () => {
            await syncManager.updateCache('/file1.tsx', 'old content');

            const changed = await syncManager.syncFromRemote('/file1.tsx', 'new content');
            expect(changed).toBe(true);

            const content = await syncManager.readOrFetch('/file1.tsx', mockReadFile);
            expect(content).toBe('new content');
        });

        test('should detect no changes when content is same', async () => {
            const content = 'same content';
            await syncManager.updateCache('/file1.tsx', content);

            const changed = await syncManager.syncFromRemote('/file1.tsx', content);
            expect(changed).toBe(false);
        });
    });

    describe('Path Utilities', () => {
        test('should normalize paths', () => {
            expect(syncManager.normalizePath('test.txt')).toBe('/test.txt');
            expect(syncManager.normalizePath('/test.txt')).toBe('/test.txt');
        });

        test('should provide path utilities', () => {
            expect(syncManager.dirname('/dir/file.txt')).toBe('/dir');
            expect(syncManager.basename('/dir/file.txt')).toBe('file.txt');
            expect(syncManager.join('dir', 'file.txt')).toBe('/dir/file.txt');
        });
    });

    describe('File Operations', () => {
        test('should check file existence', async () => {
            expect(await syncManager.fileExists('/nonexistent.txt')).toBe(false);

            await syncManager.updateCache('/exists.txt', 'content');
            expect(await syncManager.fileExists('/exists.txt')).toBe(true);
        });

        test('should copy files', async () => {
            await syncManager.updateCache('/source.txt', 'original content');

            const success = await syncManager.copy('/source.txt', '/destination.txt');
            expect(success).toBe(true);

            const content = await syncManager.readOrFetch('/destination.txt', mockReadFile);
            expect(content).toBe('original content');
        });

        test('should delete files', async () => {
            await syncManager.updateCache('/delete-me.txt', 'content');
            expect(syncManager.has('/delete-me.txt')).toBe(true);

            await syncManager.delete('/delete-me.txt');
            expect(syncManager.has('/delete-me.txt')).toBe(false);
        });
    });

    describe('VFS Access', () => {
        test('should provide access to underlying VFS', () => {
            const vfs = syncManager.getVFS();
            expect(vfs).toBeDefined();
            expect(typeof vfs.writeFile).toBe('function');
        });
    });
});
