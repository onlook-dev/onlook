import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { FileSyncManager } from '../../src/components/store/editor/sandbox/file-sync';
import type { SandboxFile } from '@onlook/models';

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
        mockReadFile = mock(async (path: string): Promise<SandboxFile | null> => {
            // Return mock content based on file path
            if (path === 'file1.tsx') {
                return {
                    type: 'text',
                    path: 'file1.tsx',
                    content: '<div>Test Component</div>'
                };
            } else if (path === 'file2.tsx') {
                return {
                    type: 'text',
                    path: 'file2.tsx',
                    content: '<div>Another Component</div>'
                };
            }
            return null;
        });

        mockWriteFile = mock(async (path: string, content: string | Uint8Array) => {
            // Mock file write operation
            return true;
        });

        // Create FileSyncManager instance (no arguments needed)
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
        const testFile: SandboxFile = {
            type: 'text',
            path: 'file1.tsx',
            content: '<div>Test Component</div>'
        };
        fileSyncManager.updateCache(testFile);

        // Now it should exist
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
    });

    test('should read from cache if available', async () => {
        // Seed the cache
        const cachedFile: SandboxFile = {
            type: 'text',
            path: 'file1.tsx',
            content: '<div>Cached Content</div>'
        };
        fileSyncManager.updateCache(cachedFile);

        // Read should return cached content without calling readFile
        const content = await fileSyncManager.readOrFetch('file1.tsx', mockReadFile);

        expect(content).toEqual(cachedFile);
        expect(mockReadFile).not.toHaveBeenCalled();
    });

    test('should fetch from filesystem if not in cache', async () => {
        // Read file that is not in cache
        const content = await fileSyncManager.readOrFetch('file1.tsx', mockReadFile);

        expect(content).toEqual({
            type: 'text',
            path: 'file1.tsx',
            content: '<div>Test Component</div>'
        });
        expect(mockReadFile).toHaveBeenCalledWith('file1.tsx');
    });

    test('should write file to filesystem and update cache', async () => {
        const newContent = '<div>New Content</div>';

        await fileSyncManager.write('file1.tsx', newContent, mockWriteFile);

        // Verify file was written to filesystem
        expect(mockWriteFile).toHaveBeenCalledWith('file1.tsx', newContent);

        // Verify cache was updated
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
        const cachedFile = await fileSyncManager.readOrFetch('file1.tsx', mockReadFile);
        expect(cachedFile).toEqual({
            type: 'text',
            path: 'file1.tsx',
            content: newContent
        });
    });

    test('should update cache without writing to filesystem', async () => {
        const testFile: SandboxFile = {
            type: 'text',
            path: 'file1.tsx',
            content: '<div>Updated Cache</div>'
        };

        fileSyncManager.updateCache(testFile);

        // Verify cache was updated
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
        const cachedFile = await fileSyncManager.readOrFetch('file1.tsx', mockReadFile);
        expect(cachedFile).toEqual(testFile);

        // Verify filesystem was not written to
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('should delete file from cache', async () => {
        // Seed the cache
        const testFile: SandboxFile = {
            type: 'text',
            path: 'file1.tsx',
            content: '<div>Test Content</div>'
        };
        fileSyncManager.updateCache(testFile);

        // Verify file is in cache
        expect(fileSyncManager.has('file1.tsx')).toBe(true);

        // Delete file from cache
        await fileSyncManager.delete('file1.tsx');

        // Verify file is no longer in cache
        expect(fileSyncManager.has('file1.tsx')).toBe(false);
    });

    test('should list all files in cache', async () => {
        // Seed the cache with multiple files
        const files: SandboxFile[] = [
            { type: 'text', path: 'file1.tsx', content: '<div>Content 1</div>' },
            { type: 'text', path: 'file2.tsx', content: '<div>Content 2</div>' },
            { type: 'text', path: 'file3.tsx', content: '<div>Content 3</div>' }
        ];
        
        files.forEach(file => fileSyncManager.updateCache(file));

        // Get list of files
        const fileList = fileSyncManager.listAllFiles();

        // Verify all files are listed
        expect(fileList).toContain('file1.tsx');
        expect(fileList).toContain('file2.tsx');
        expect(fileList).toContain('file3.tsx');
        expect(fileList.length).toBe(3);
    });

    test('should clear all files from cache', async () => {
        // Seed the cache with multiple files
        const files: SandboxFile[] = [
            { type: 'text', path: 'file1.tsx', content: '<div>Content 1</div>' },
            { type: 'text', path: 'file2.tsx', content: '<div>Content 2</div>' }
        ];
        
        files.forEach(file => fileSyncManager.updateCache(file));

        // Verify files are in cache
        expect(fileSyncManager.listAllFiles().length).toBe(2);

        // Clear cache
        await fileSyncManager.clear();

        // Verify cache is empty
        expect(fileSyncManager.listAllFiles().length).toBe(0);
    });
});
