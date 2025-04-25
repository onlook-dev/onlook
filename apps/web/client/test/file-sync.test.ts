import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { FileSyncManager } from '../src/components/store/editor/engine/sandbox/file-sync';

describe('FileSyncManager', () => {
    let fileSyncManager: FileSyncManager;
    let mockSession: any;

    beforeEach(() => {
        // Create mock session
        mockSession = {
            fs: {
                readTextFile: mock(async (path: string) => {
                    // Return mock content based on file path
                    if (path === 'file1.tsx') {
                        return '<div>Test Component</div>';
                    } else if (path === 'file2.tsx') {
                        return '<div>Another Component</div>';
                    }
                    return '';
                }),
                writeTextFile: mock(async (path: string, content: string) => {
                    // Mock file write operation
                    return;
                })
            }
        };

        // Create FileSyncManager instance
        fileSyncManager = new FileSyncManager(mockSession);
    });

    afterEach(() => {
        fileSyncManager.clear();
    });

    test('should check if file exists in cache', () => {
        // Initially cache is empty
        expect(fileSyncManager.has('file1.tsx')).toBe(false);

        // Add a file to cache
        fileSyncManager.updateCache('file1.tsx', '<div>Test Component</div>');

        // Now it should exist
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
    });

    test('should read from cache if available', async () => {
        // Seed the cache
        fileSyncManager.updateCache('file1.tsx', '<div>Cached Content</div>');

        // Read should return cached content without calling fs.readTextFile
        const content = await fileSyncManager.readOrFetch('file1.tsx');

        expect(content).toBe('<div>Cached Content</div>');
        expect(mockSession.fs.readTextFile).not.toHaveBeenCalled();
    });

    test('should fetch from filesystem if not in cache', async () => {
        // Read file that is not in cache
        const content = await fileSyncManager.readOrFetch('file1.tsx');

        expect(content).toBe('<div>Test Component</div>');
        expect(mockSession.fs.readTextFile).toHaveBeenCalledWith('file1.tsx');
    });

    test('should write file to filesystem and update cache', async () => {
        const newContent = '<div>New Content</div>';

        await fileSyncManager.write('file1.tsx', newContent);

        // Verify file was written to filesystem
        expect(mockSession.fs.writeTextFile).toHaveBeenCalledWith('file1.tsx', newContent);

        // Verify cache was updated
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
        expect(await fileSyncManager.readOrFetch('file1.tsx')).toBe(newContent);
    });

    test('should update cache without writing to filesystem', async () => {
        const content = '<div>Updated Cache</div>';

        await fileSyncManager.updateCache('file1.tsx', content);

        // Verify cache was updated
        expect(fileSyncManager.has('file1.tsx')).toBe(true);
        expect(await fileSyncManager.readOrFetch('file1.tsx')).toBe(content);

        // Verify filesystem was not written to
        expect(mockSession.fs.writeTextFile).not.toHaveBeenCalled();
    });

    test('should delete file from cache', async () => {
        // Seed the cache
        fileSyncManager.updateCache('file1.tsx', '<div>Test Content</div>');

        // Verify file is in cache
        expect(fileSyncManager.has('file1.tsx')).toBe(true);

        // Delete file from cache
        fileSyncManager.delete('file1.tsx');

        // Verify file is no longer in cache
        expect(fileSyncManager.has('file1.tsx')).toBe(false);
    });

    test('should list all files in cache', async () => {
        // Seed the cache with multiple files
        fileSyncManager.updateCache('file1.tsx', '<div>Content 1</div>');
        fileSyncManager.updateCache('file2.tsx', '<div>Content 2</div>');
        fileSyncManager.updateCache('file3.tsx', '<div>Content 3</div>');

        // Get list of files
        const files = fileSyncManager.listFiles();

        // Verify all files are listed
        expect(files).toContain('file1.tsx');
        expect(files).toContain('file2.tsx');
        expect(files).toContain('file3.tsx');
        expect(files.length).toBe(3);
    });

    test('should clear all files from cache', async () => {
        // Seed the cache with multiple files
        fileSyncManager.updateCache('file1.tsx', '<div>Content 1</div>');
        fileSyncManager.updateCache('file2.tsx', '<div>Content 2</div>');

        // Verify files are in cache
        expect(fileSyncManager.listFiles().length).toBe(2);

        // Clear cache
        fileSyncManager.clear();

        // Verify cache is empty
        expect(fileSyncManager.listFiles().length).toBe(0);
    });

    test('should handle error when session is broken', async () => {
        // Create a session with broken file system methods
        const brokenSession: any = {
            fs: {
                readTextFile: mock(async () => {
                    throw new Error('Failed to read file');
                }),
                writeTextFile: mock(async () => {
                    throw new Error('Failed to write file');
                })
            }
        };

        const errorManager = new FileSyncManager(brokenSession);

        // Attempt to read a file that will cause an error
        try {
            await errorManager.readOrFetch('errorFile.tsx');
            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error) {
            // Expect an error to be thrown
            expect(error).toBeTruthy();
        }

        // Attempt to write a file that will cause an error
        try {
            await errorManager.write('errorFile.tsx', '<div>Error Content</div>');
            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error) {
            // Expect an error to be thrown
            expect(error).toBeTruthy();
        }
    });
}); 