import { describe, expect, mock, test } from 'bun:test';
import path from 'path';
import { isSubdirectory, normalizePath } from '../../src/components/store/editor/sandbox/helpers';

// Store original path functions
const originalIsAbsolute = path.isAbsolute;
const originalJoin = path.join;
const originalRelative = path.relative;

describe('normalizePath', () => {
    test('should convert relative path to normalized form', () => {
        expect(normalizePath('./file.txt')).toBe('file.txt');
    });

    test('should handle subdirectories in relative paths', () => {
        expect(normalizePath('./dir/file.txt')).toBe('dir/file.txt');
    });

    test('should normalize absolute paths within sandbox', () => {
        expect(normalizePath('/project/sandbox/file.txt')).toBe('file.txt');
    });

    test('should normalize absolute paths within sandbox subdirectories', () => {
        expect(normalizePath('/project/sandbox/dir/file.txt')).toBe('dir/file.txt');
    });

    test('should handle absolute paths outside sandbox', () => {
        expect(normalizePath('/other/path/file.txt')).toBe('../../other/path/file.txt');
    });

    test('should always use forward slashes for paths', () => {
        // Test that Windows-style backslashes are converted to forward slashes

        // Mock path functions
        path.isAbsolute = mock(() => false);
        path.join = mock(() => '/project/sandbox/dir\\file.txt');
        path.relative = mock(() => 'dir\\file.txt');

        expect(normalizePath('dir\\file.txt')).toBe('dir/file.txt');

        // Restore original functions
        path.isAbsolute = originalIsAbsolute;
        path.join = originalJoin;
        path.relative = originalRelative;
    });
});

describe('isSubdirectory', () => {
    test('should return true if filePath is a subdirectory of directory', () => {
        expect(isSubdirectory('dir/file.txt', ['dir'])).toBe(true);
    });

    test('should return false if filePath is not a subdirectory of directory', () => {
        expect(isSubdirectory('dir/file.txt', ['other'])).toBe(false);
    });

    test('should return true if filePath is a subdirectory of one of multiple directories', () => {
        expect(isSubdirectory('dir/file.txt', ['dir', 'other'])).toBe(true);
    });

    test('should return true if filePath is under a nested directory in list', () => {
        expect(isSubdirectory('hi/dir/file.txt', ['dir', 'hi'])).toBe(true);
    });

    test('should return true if filePath matches directory exactly', () => {
        expect(isSubdirectory('dir', ['dir'])).toBe(true);
    });

    test('should return true if filePath matches directory with trailing slash', () => {
        expect(isSubdirectory('dir/', ['dir'])).toBe(true);
    });

    test('should return false if filePath is only a prefix match', () => {
        expect(isSubdirectory('dir2/file.txt', ['dir'])).toBe(false);
    });

    test('should return true if absolute paths are used', () => {
        expect(isSubdirectory('/home/user/dir/file.txt', ['/home/user/dir'])).toBe(true);
    });

    test('should return false if absolute paths mismatch', () => {
        expect(isSubdirectory('/home/user/other/file.txt', ['/home/user/dir'])).toBe(false);
    });

    test('should handle mixed separators', () => {
        expect(isSubdirectory('dir\\file.txt', ['dir'])).toBe(true);
    });

    test('should return false for empty directories list', () => {
        expect(isSubdirectory('dir/file.txt', [])).toBe(false);
    });

    test('should handle directory paths with trailing slashes', () => {
        expect(isSubdirectory('dir/file.txt', ['dir/'])).toBe(true);
    });

    test('should handle complex nested paths', () => {
        expect(isSubdirectory('dir/subdir/file.txt', ['dir'])).toBe(true);
        expect(isSubdirectory('dir/subdir/file.txt', ['dir/subdir'])).toBe(true);
        expect(isSubdirectory('dir/subdir/file.txt', ['dir/subdir/'])).toBe(true);
    });

    test('should be case-sensitive on case-sensitive systems', () => {
        expect(isSubdirectory('Dir/file.txt', ['dir'])).toBe(false);
    });
});
