import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { FileSyncManager } from '../../src/components/store/editor/sandbox/file-sync';

mock.module('localforage', () => ({
    getItem: mock(async () => null),
    setItem: mock(async () => undefined),
    removeItem: mock(async () => undefined),
}));

describe('FileSyncManager', async () => {
    let fileSyncManager: FileSyncManager;
    let mockReadFile: any;
    let mockWriteFile: any;

    beforeEach(async () => {
        // Create mock file operations
        mockReadFile = mock(async (path: string) => {
            // Return mock content based on file path
            if (path === 'file1.tsx') {
                return '<div>Test Component</div>';
            } else if (path === 'file2.tsx') {
                return '<div>Another Component</div>';
            }
            return '';
        });

        mockWriteFile = mock(async (path: string, content: string) => {
            // Mock file write operation
            return true;
        });

        // Create FileSyncManager instance
        fileSyncManager = new FileSyncManager();

        // Wait for initialization to complete
        await new Promise((resolve) => setTimeout(resolve, 10));
    });

    afterEach(async () => {
        await fileSyncManager.clear();
    });

    test('should check if file exists in cache', async () => {
        // Initially cache is empty
        expect(fileSyncManager.has('file1.tsx')).toBe(false);

        // Add a file to cache
        await fileSyncManager.updateCache('file1.tsx', '<div>Test Component</div>');

        // Now it should exist
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
    });

    test('should read from cache if available', async () => {
        // Seed the cache
        await fileSyncManager.updateCache('file1.tsx', '<div>Cached Content</div>');

        // Read should return cached content without calling readFile
        const content = await fileSyncManager.readOrFetch('file1.tsx', mockReadFile);

        expect(content).toBe('<div>Cached Content</div>');
        expect(mockReadFile).not.toHaveBeenCalled();
    });

    test('should fetch from filesystem if not in cache', async () => {
        // Read file that is not in cache
        const content = await fileSyncManager.readOrFetch('file1.tsx', mockReadFile);

        expect(content).toBe('<div>Test Component</div>');
        expect(mockReadFile).toHaveBeenCalledWith('file1.tsx');
    });

    test('should write file to filesystem and update cache', async () => {
        const newContent = '<div>New Content</div>';

        await fileSyncManager.write('file1.tsx', newContent, mockWriteFile);

        // Verify file was written to filesystem
        expect(mockWriteFile).toHaveBeenCalledWith('file1.tsx', newContent);

        // Verify cache was updated
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
        expect(await fileSyncManager.readOrFetch('file1.tsx', mockReadFile)).toBe(newContent);
    });

    test('should update cache without writing to filesystem', async () => {
        const content = '<div>Updated Cache</div>';

        await fileSyncManager.updateCache('file1.tsx', content);

        // Verify cache was updated
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
        expect(await fileSyncManager.readOrFetch('file1.tsx', mockReadFile)).toBe(content);

        // Verify filesystem was not written to
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('should delete file from cache', async () => {
        // Seed the cache
        await fileSyncManager.updateCache('file1.tsx', '<div>Test Content</div>');

        // Verify file is in cache
        expect(fileSyncManager.has('file1.tsx')).toBe(true);

        // Delete file from cache
        await fileSyncManager.delete('file1.tsx');

        // Verify file is no longer in cache
        expect(fileSyncManager.has('file1.tsx')).toBe(false);
    });

    test('should list all files in cache', async () => {
        // Seed the cache with multiple files
        await fileSyncManager.updateCache('file1.tsx', '<div>Content 1</div>');
        await fileSyncManager.updateCache('file2.tsx', '<div>Content 2</div>');
        await fileSyncManager.updateCache('file3.tsx', '<div>Content 3</div>');

        // Get list of files
        const files = fileSyncManager.listAllFiles();

        // Verify all files are listed
        expect(files).toContain('file1.tsx');
        expect(files).toContain('file2.tsx');
        expect(files).toContain('file3.tsx');
        expect(files.length).toBe(3);
    });

    test('should clear all files from cache', async () => {
        // Seed the cache with multiple files
        await fileSyncManager.updateCache('file1.tsx', '<div>Content 1</div>');
        await fileSyncManager.updateCache('file2.tsx', '<div>Content 2</div>');

        // Verify files are in cache
        expect(fileSyncManager.listAllFiles().length).toBe(2);

        // Clear cache
        await fileSyncManager.clear();

        // Verify cache is empty
        expect(fileSyncManager.listAllFiles().length).toBe(0);
    });
});
