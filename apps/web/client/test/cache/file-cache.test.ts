import type { SandboxDirectory, SandboxFile } from '@onlook/models';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { FileCacheManager } from '../../src/components/store/editor/cache/file-cache';

// Mock localforage
mock.module('localforage', () => ({
    createInstance: mock(() => ({
        getItem: mock(async () => null),
        setItem: mock(async () => undefined),
        removeItem: mock(async () => undefined),
        clear: mock(async () => undefined),
    })),
}));

describe('FileCacheManager', () => {
    let fileCacheManager: FileCacheManager;
    let mockReadFile: any;
    let mockWriteFile: any;

    beforeEach(async () => {
        fileCacheManager = new FileCacheManager();
        await fileCacheManager.init();

        mockReadFile = mock(async (path: string): Promise<SandboxFile | null> => {
            if (path === 'test.tsx') {
                return {
                    type: 'text',
                    path: 'test.tsx',
                    content: '<div>Test Component</div>'
                };
            } else if (path === 'image.png') {
                return {
                    type: 'binary',
                    path: 'image.png',
                    content: new Uint8Array([1, 2, 3, 4])
                };
            }
            return null;
        });

        mockWriteFile = mock(async (path: string, content: string | Uint8Array) => {
            return true;
        });
    });

    afterEach(async () => {
        await fileCacheManager.clear();
    });

    test('should store and retrieve text files', () => {
        const textFile: SandboxFile = {
            type: 'text',
            path: 'test.tsx',
            content: '<div>Hello World</div>'
        };

        fileCacheManager.setFile(textFile);
        const retrieved = fileCacheManager.getFile('test.tsx');

        expect(retrieved).toEqual(textFile);
    });

    test('should store and retrieve binary files', () => {
        const binaryFile: SandboxFile = {
            type: 'binary',
            path: 'image.png',
            content: new Uint8Array([1, 2, 3, 4])
        };

        fileCacheManager.setFile(binaryFile);
        const retrieved = fileCacheManager.getFile('image.png');

        expect(retrieved).toEqual(binaryFile);
    });

    test('should handle files with null content', () => {
        const emptyFile: SandboxFile = {
            type: 'text',
            path: 'empty.tsx',
            content: null
        };

        fileCacheManager.setFile(emptyFile);
        const retrieved = fileCacheManager.getFile('empty.tsx');

        expect(retrieved).toEqual(emptyFile);
    });

    test('should check if file exists', () => {
        const testFile: SandboxFile = {
            type: 'text',
            path: 'test.tsx',
            content: 'content'
        };

        expect(fileCacheManager.hasFile('test.tsx')).toBe(false);

        fileCacheManager.setFile(testFile);
        expect(fileCacheManager.hasFile('test.tsx')).toBe(true);
    });

    test('should delete files', () => {
        const testFile: SandboxFile = {
            type: 'text',
            path: 'test.tsx',
            content: 'content'
        };

        fileCacheManager.setFile(testFile);
        expect(fileCacheManager.hasFile('test.tsx')).toBe(true);

        const deleted = fileCacheManager.deleteFile('test.tsx');
        expect(deleted).toBe(true);
        expect(fileCacheManager.hasFile('test.tsx')).toBe(false);
    });

    test('should handle directories', () => {
        const directory: SandboxDirectory = {
            type: 'directory',
            path: 'src/components'
        };

        expect(fileCacheManager.hasDirectory('src/components')).toBe(false);

        fileCacheManager.setDirectory(directory);
        expect(fileCacheManager.hasDirectory('src/components')).toBe(true);

        const deleted = fileCacheManager.deleteDirectory('src/components');
        expect(deleted).toBe(true);
        expect(fileCacheManager.hasDirectory('src/components')).toBe(false);
    });

    test('should check if file is loaded', async () => {
        const loadedFile: SandboxFile = {
            type: 'text',
            path: 'loaded.tsx',
            content: 'content'
        };

        const unloadedFile: SandboxFile = {
            type: 'text',
            path: 'unloaded.tsx',
            content: null
        };

        expect(fileCacheManager.isFileLoaded(loadedFile)).toBe(true);
        expect(fileCacheManager.isFileLoaded(unloadedFile)).toBe(false);
    });

    test('should read from cache or fetch from filesystem', async () => {
        // Test cache hit
        const cachedFile: SandboxFile = {
            type: 'text',
            path: 'cached.tsx',
            content: 'cached content'
        };
        fileCacheManager.setFile(cachedFile);

        const result1 = await fileCacheManager.readOrFetch('cached.tsx', mockReadFile);
        expect(result1).toEqual(cachedFile);
        expect(mockReadFile).not.toHaveBeenCalled();

        // Test cache miss
        mockReadFile.mockClear();
        const result2 = await fileCacheManager.readOrFetch('test.tsx', mockReadFile);
        expect(result2).toEqual({
            type: 'text',
            path: 'test.tsx',
            content: '<div>Test Component</div>'
        });
        expect(mockReadFile).toHaveBeenCalledWith('test.tsx');

        // Verify file was cached
        expect(fileCacheManager.hasFile('test.tsx')).toBe(true);
    });

    test('should handle null file from readFile function', async () => {
        const result = await fileCacheManager.readOrFetch('nonexistent.tsx', mockReadFile);
        expect(result).toBeNull();
        expect(mockReadFile).toHaveBeenCalledWith('nonexistent.tsx');
    });

    test('should write file to filesystem and cache', async () => {
        const content = '<div>New Content</div>';
        const result = await fileCacheManager.write('new.tsx', content, mockWriteFile);

        expect(result).toBe(true);
        expect(mockWriteFile).toHaveBeenCalledWith('new.tsx', content);

        // Verify file was cached
        const cachedFile = fileCacheManager.getFile('new.tsx');
        expect(cachedFile).toEqual({
            type: 'text',
            path: 'new.tsx',
            content: content
        });
    });

    test('should write binary file to filesystem and cache', async () => {
        const content = new Uint8Array([1, 2, 3, 4]);
        const result = await fileCacheManager.write('new.png', content, mockWriteFile);

        expect(result).toBe(true);
        expect(mockWriteFile).toHaveBeenCalledWith('new.png', content);

        // Verify file was cached
        const cachedFile = fileCacheManager.getFile('new.png');
        expect(cachedFile).toEqual({
            type: 'binary',
            path: 'new.png',
            content: content
        });
    });

    test('should handle write failures', async () => {
        const failingWriteFile = mock(async () => {
            throw new Error('Write failed');
        });

        // Suppress console.error for this test
        const originalConsoleError = console.error;
        console.error = mock(() => { });

        const result = await fileCacheManager.write('fail.tsx', 'content', failingWriteFile);
        expect(result).toBe(false);

        // Restore console.error
        console.error = originalConsoleError;
    });

    test('should rename files in cache', () => {
        const originalFile: SandboxFile = {
            type: 'text',
            path: 'original.tsx',
            content: 'content'
        };

        fileCacheManager.setFile(originalFile);
        fileCacheManager.rename('original.tsx', 'renamed.tsx');

        expect(fileCacheManager.hasFile('original.tsx')).toBe(false);
        expect(fileCacheManager.hasFile('renamed.tsx')).toBe(true);

        const renamedFile = fileCacheManager.getFile('renamed.tsx');
        expect(renamedFile).toEqual({
            type: 'text',
            path: 'renamed.tsx',
            content: 'content'
        });
    });

    test('should handle renaming non-existent file', () => {
        fileCacheManager.rename('nonexistent.tsx', 'new.tsx');
        expect(fileCacheManager.hasFile('new.tsx')).toBe(false);
    });

    test('should rename directories and all contained files', () => {
        // Add files in directory
        const file1: SandboxFile = {
            type: 'text',
            path: 'src/components/Button.tsx',
            content: 'button content'
        };
        const file2: SandboxFile = {
            type: 'text',
            path: 'src/components/Input.tsx',
            content: 'input content'
        };
        const file3: SandboxFile = {
            type: 'text',
            path: 'src/utils/helper.ts',
            content: 'helper content'
        };

        fileCacheManager.setFile(file1);
        fileCacheManager.setFile(file2);
        fileCacheManager.setFile(file3);

        // Add directory
        const directory: SandboxDirectory = {
            type: 'directory',
            path: 'src/components'
        };
        fileCacheManager.setDirectory(directory);

        // Rename directory
        fileCacheManager.renameDirectory('src/components', 'src/ui');

        // Check files were moved
        expect(fileCacheManager.hasFile('src/components/Button.tsx')).toBe(false);
        expect(fileCacheManager.hasFile('src/components/Input.tsx')).toBe(false);
        expect(fileCacheManager.hasFile('src/ui/Button.tsx')).toBe(true);
        expect(fileCacheManager.hasFile('src/ui/Input.tsx')).toBe(true);

        // File outside directory should be unchanged
        expect(fileCacheManager.hasFile('src/utils/helper.ts')).toBe(true);

        // Directory should be renamed
        expect(fileCacheManager.hasDirectory('src/components')).toBe(false);
        expect(fileCacheManager.hasDirectory('src/ui')).toBe(true);

        // Check file contents and paths were updated
        const movedFile = fileCacheManager.getFile('src/ui/Button.tsx');
        expect(movedFile).toEqual({
            type: 'text',
            path: 'src/ui/Button.tsx',
            content: 'button content'
        });
    });

    test('should list all files', () => {
        const files: SandboxFile[] = [
            { type: 'text', path: 'file1.tsx', content: 'content1' },
            { type: 'text', path: 'file2.tsx', content: 'content2' },
            { type: 'binary', path: 'image.png', content: new Uint8Array([1, 2]) }
        ];

        files.forEach(file => fileCacheManager.setFile(file));

        const fileList = fileCacheManager.listAllFiles();
        expect(fileList).toHaveLength(3);
        expect(fileList).toContain('file1.tsx');
        expect(fileList).toContain('file2.tsx');
        expect(fileList).toContain('image.png');
    });

    test('should list all directories', () => {
        const directories: SandboxDirectory[] = [
            { type: 'directory', path: 'src' },
            { type: 'directory', path: 'src/components' },
            { type: 'directory', path: 'public' }
        ];

        directories.forEach(dir => fileCacheManager.setDirectory(dir));

        const dirList = fileCacheManager.listAllDirectories();
        expect(dirList).toHaveLength(3);
        expect(dirList).toContain('src');
        expect(dirList).toContain('src/components');
        expect(dirList).toContain('public');
    });

    test('should write empty file to cache', () => {
        fileCacheManager.writeEmptyFile('empty.png', 'binary');

        expect(fileCacheManager.hasFile('empty.png')).toBe(true);
        const emptyFile = fileCacheManager.getFile('empty.png');
        expect(emptyFile).toEqual({
            type: 'binary',
            path: 'empty.png',
            content: null
        });
    });

    test('should not overwrite existing file with writeEmptyFile', () => {
        const existingFile: SandboxFile = {
            type: 'binary',
            path: 'existing.png',
            content: new Uint8Array([1, 2, 3])
        };

        fileCacheManager.setFile(existingFile);
        fileCacheManager.writeEmptyFile('existing.png', 'binary');

        const file = fileCacheManager.getFile('existing.png');
        expect(file).toEqual(existingFile); // Should remain unchanged
    });

    test('should clear all files and directories', async () => {
        // Add files and directories
        fileCacheManager.setFile({ type: 'text', path: 'file.tsx', content: 'content' });
        fileCacheManager.setDirectory({ type: 'directory', path: 'src' });

        expect(fileCacheManager.fileCount).toBe(1);
        expect(fileCacheManager.directoryCount).toBe(1);

        await fileCacheManager.clear();

        expect(fileCacheManager.fileCount).toBe(0);
        expect(fileCacheManager.directoryCount).toBe(0);
        expect(fileCacheManager.listAllFiles()).toHaveLength(0);
        expect(fileCacheManager.listAllDirectories()).toHaveLength(0);
    });

    test('should track file and directory counts', () => {
        expect(fileCacheManager.fileCount).toBe(0);
        expect(fileCacheManager.directoryCount).toBe(0);

        fileCacheManager.setFile({ type: 'text', path: 'file1.tsx', content: 'content' });
        fileCacheManager.setFile({ type: 'text', path: 'file2.tsx', content: 'content' });
        fileCacheManager.setDirectory({ type: 'directory', path: 'src' });

        expect(fileCacheManager.fileCount).toBe(2);
        expect(fileCacheManager.directoryCount).toBe(1);

        fileCacheManager.deleteFile('file1.tsx');
        expect(fileCacheManager.fileCount).toBe(1);

        fileCacheManager.deleteDirectory('src');
        expect(fileCacheManager.directoryCount).toBe(0);
    });

    test('should handle content hash with files', () => {
        const testFile: SandboxFile = {
            type: 'text',
            path: 'test.tsx',
            content: 'original content'
        };

        // Set file with content hash
        fileCacheManager.setFile(testFile, 'hash123');

        // File should be in cache
        expect(fileCacheManager.hasFile('test.tsx')).toBe(true);
        expect(fileCacheManager.getFile('test.tsx')).toEqual(testFile);
    });

    test('should rename nested directories when renaming parent directory', () => {
        // Add nested directories and files
        const nestedDir1: SandboxDirectory = {
            type: 'directory',
            path: 'src/components/ui'
        };
        const nestedDir2: SandboxDirectory = {
            type: 'directory',
            path: 'src/components/forms'
        };
        const nestedDir3: SandboxDirectory = {
            type: 'directory',
            path: 'src/components/ui/buttons'
        };
        const parentDir: SandboxDirectory = {
            type: 'directory',
            path: 'src/components'
        };
        const unrelatedDir: SandboxDirectory = {
            type: 'directory',
            path: 'src/utils'
        };

        // Add files in nested directories
        const nestedFile: SandboxFile = {
            type: 'text',
            path: 'src/components/ui/Button.tsx',
            content: 'button'
        };

        fileCacheManager.setDirectory(parentDir);
        fileCacheManager.setDirectory(nestedDir1);
        fileCacheManager.setDirectory(nestedDir2);
        fileCacheManager.setDirectory(nestedDir3);
        fileCacheManager.setDirectory(unrelatedDir);
        fileCacheManager.setFile(nestedFile);

        // Rename parent directory
        fileCacheManager.renameDirectory('src/components', 'src/widgets');

        // Check that all nested directories were renamed
        expect(fileCacheManager.hasDirectory('src/components')).toBe(false);
        expect(fileCacheManager.hasDirectory('src/components/ui')).toBe(false);
        expect(fileCacheManager.hasDirectory('src/components/forms')).toBe(false);
        expect(fileCacheManager.hasDirectory('src/components/ui/buttons')).toBe(false);

        expect(fileCacheManager.hasDirectory('src/widgets')).toBe(true);
        expect(fileCacheManager.hasDirectory('src/widgets/ui')).toBe(true);
        expect(fileCacheManager.hasDirectory('src/widgets/forms')).toBe(true);
        expect(fileCacheManager.hasDirectory('src/widgets/ui/buttons')).toBe(true);

        // Unrelated directory should remain unchanged
        expect(fileCacheManager.hasDirectory('src/utils')).toBe(true);

        // Files in nested directories should also be renamed
        expect(fileCacheManager.hasFile('src/components/ui/Button.tsx')).toBe(false);
        expect(fileCacheManager.hasFile('src/widgets/ui/Button.tsx')).toBe(true);

        const renamedFile = fileCacheManager.getFile('src/widgets/ui/Button.tsx');
        expect(renamedFile?.path).toBe('src/widgets/ui/Button.tsx');
        expect(renamedFile?.content).toBe('button');
    });

    test('should prevent renaming root directory', () => {
        expect(() => {
            fileCacheManager.renameDirectory('/', '/new-root');
        }).toThrow('Cannot rename root directory');

        expect(() => {
            fileCacheManager.renameDirectory('', '/new-root');
        }).toThrow('Cannot rename root directory');

        // Test with trailing slashes that normalize to root
        expect(() => {
            fileCacheManager.renameDirectory('///', '/new-root');
        }).toThrow('Cannot rename root directory');
    });
});