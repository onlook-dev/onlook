import { VirtualFileSystem } from '../../src/components/store/editor/sandbox/virtual-fs';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

mock.module('localforage', () => ({
    getItem: mock(async () => null),
    setItem: mock(async () => undefined),
    removeItem: mock(async () => undefined),
}));

describe('VirtualFileSystem', () => {
    let vfs: VirtualFileSystem;

    beforeEach(() => {
        vfs = new VirtualFileSystem({
            persistenceKey: 'test-vfs',
            enablePersistence: false, // Disable persistence for tests
        });
    });

    afterEach(async () => {
        await vfs.clear();
    });

    describe('Basic File Operations', () => {
        test('should write and read text files', async () => {
            const content = '<div>Hello World</div>';
            const success = await vfs.writeFile('/test.tsx', content);

            expect(success).toBe(true);

            const readContent = await vfs.readFile('/test.tsx');
            expect(readContent).toBe(content);
        });

        test('should check file existence', async () => {
            expect(await vfs.fileExists('/nonexistent.tsx')).toBe(false);

            await vfs.writeFile('/exists.tsx', 'content');
            expect(await vfs.fileExists('/exists.tsx')).toBe(true);
        });

        test('should delete files', async () => {
            await vfs.writeFile('/delete-me.tsx', 'content');
            expect(await vfs.fileExists('/delete-me.tsx')).toBe(true);

            const success = await vfs.delete('/delete-me.tsx');
            expect(success).toBe(true);
            expect(await vfs.fileExists('/delete-me.tsx')).toBe(false);
        });

        test('should handle binary files', async () => {
            const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
            const success = await vfs.writeBinaryFile('/test.bin', binaryData);

            expect(success).toBe(true);

            const readData = await vfs.readBinaryFile('/test.bin');
            expect(readData).toEqual(binaryData);
        });
    });

    describe('Directory Operations', () => {
        test('should create directories', async () => {
            const success = await vfs.mkdir('/test-dir', true);
            expect(success).toBe(true);

            const stats = await vfs.stat('/test-dir');
            expect(stats?.isDirectory()).toBe(true);
        });

        test('should create nested directories', async () => {
            await vfs.writeFile('/deep/nested/file.txt', 'content');

            expect(await vfs.fileExists('/deep/nested/file.txt')).toBe(true);

            const stats = await vfs.stat('/deep');
            expect(stats?.isDirectory()).toBe(true);
        });

        test('should list directory contents', async () => {
            await vfs.writeFile('/dir/file1.txt', 'content1');
            await vfs.writeFile('/dir/file2.txt', 'content2');
            await vfs.mkdir('/dir/subdir');

            const entries = await vfs.readdir('/dir');
            expect(entries).toContain('file1.txt');
            expect(entries).toContain('file2.txt');
            expect(entries).toContain('subdir');
        });

        test('should remove directories', async () => {
            await vfs.mkdir('/remove-me');
            await vfs.writeFile('/remove-me/file.txt', 'content');

            const success = await vfs.rmdir('/remove-me', true);
            expect(success).toBe(true);
            expect(await vfs.fileExists('/remove-me')).toBe(false);
        });
    });

    describe('Path Utilities', () => {
        test('should normalize paths', () => {
            expect(vfs.normalizePath('test.txt')).toBe('/test.txt');
            expect(vfs.normalizePath('/test.txt')).toBe('/test.txt');
            expect(vfs.normalizePath('dir\\file.txt')).toBe('/dir/file.txt');
            expect(vfs.normalizePath('/dir//file.txt')).toBe('/dir/file.txt');
        });

        test('should get directory name', () => {
            expect(vfs.dirname('/dir/file.txt')).toBe('/dir');
            expect(vfs.dirname('/file.txt')).toBe('/');
            expect(vfs.dirname('file.txt')).toBe('/');
        });

        test('should get base name', () => {
            expect(vfs.basename('/dir/file.txt')).toBe('file.txt');
            expect(vfs.basename('/file.txt')).toBe('file.txt');
            expect(vfs.basename('file.txt')).toBe('file.txt');
        });

        test('should join paths', () => {
            expect(vfs.join('dir', 'file.txt')).toBe('/dir/file.txt');
            expect(vfs.join('/dir', 'subdir', 'file.txt')).toBe('/dir/subdir/file.txt');
        });
    });

    describe('File Listing', () => {
        test('should list all files', async () => {
            await vfs.writeFile('/file1.txt', 'content1');
            await vfs.writeFile('/dir/file2.txt', 'content2');
            await vfs.writeFile('/dir/subdir/file3.txt', 'content3');

            const allFiles = vfs.listAllFiles();
            expect(allFiles).toContain('/file1.txt');
            expect(allFiles).toContain('/dir/file2.txt');
            expect(allFiles).toContain('/dir/subdir/file3.txt');
            expect(allFiles.length).toBe(3);
        });

        test('should identify binary files by extension', async () => {
            await vfs.writeBinaryFile('/image.png', new Uint8Array([1, 2, 3]));
            await vfs.writeFile('/text.txt', 'content');
            await vfs.writeBinaryFile('/archive.zip', new Uint8Array([4, 5, 6]));

            const binaryFiles = vfs.listBinaryFiles();
            expect(binaryFiles).toContain('/image.png');
            expect(binaryFiles).toContain('/archive.zip');
            expect(binaryFiles).not.toContain('/text.txt');
        });
    });

    describe('File Copy Operations', () => {
        test('should copy files', async () => {
            await vfs.writeFile('/source.txt', 'original content');

            const success = await vfs.copy('/source.txt', '/destination.txt');
            expect(success).toBe(true);

            const content = await vfs.readFile('/destination.txt');
            expect(content).toBe('original content');
        });

        test('should copy directories recursively', async () => {
            await vfs.writeFile('/source-dir/file1.txt', 'content1');
            await vfs.writeFile('/source-dir/subdir/file2.txt', 'content2');

            const success = await vfs.copy('/source-dir', '/dest-dir', true);
            expect(success).toBe(true);

            expect(await vfs.readFile('/dest-dir/file1.txt')).toBe('content1');
            expect(await vfs.readFile('/dest-dir/subdir/file2.txt')).toBe('content2');
        });
    });

    describe('File Statistics', () => {
        test('should provide file stats', async () => {
            await vfs.writeFile('/test.txt', 'content');

            const stats = await vfs.stat('/test.txt');
            expect(stats).not.toBeNull();
            expect(stats!.isFile()).toBe(true);
            expect(stats!.isDirectory()).toBe(false);
            expect(stats!.size).toBeGreaterThan(0);
        });

        test('should provide directory stats', async () => {
            await vfs.mkdir('/test-dir');

            const stats = await vfs.stat('/test-dir');
            expect(stats).not.toBeNull();
            expect(stats!.isFile()).toBe(false);
            expect(stats!.isDirectory()).toBe(true);
        });
    });

    describe('Compatibility Methods', () => {
        test('should support has() method', () => {
            expect(vfs.has('/nonexistent.txt')).toBe(false);
        });

        test('should support hasBinary() method', async () => {
            await vfs.writeBinaryFile('/test.png', new Uint8Array([1, 2, 3]));
            expect(vfs.hasBinary('/test.png')).toBe(true);
            expect(vfs.hasBinary('/nonexistent.png')).toBe(false);
        });

        test('should support updateCache() method', async () => {
            await vfs.updateCache('/test.txt', 'cached content');
            const content = await vfs.readFile('/test.txt');
            expect(content).toBe('cached content');
        });

        test('should support syncFromRemote() method', async () => {
            await vfs.writeFile('/test.txt', 'old content');

            const changed = await vfs.syncFromRemote('/test.txt', 'new content');
            expect(changed).toBe(true);

            const content = await vfs.readFile('/test.txt');
            expect(content).toBe('new content');

            // No change should return false
            const unchanged = await vfs.syncFromRemote('/test.txt', 'new content');
            expect(unchanged).toBe(false);
        });
    });
});
