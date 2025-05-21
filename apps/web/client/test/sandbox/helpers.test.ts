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
    test('returns true for direct subdirectory', () => {
        expect(isSubdirectory('/project/sandbox/foo/bar.txt', ['/project/sandbox/foo'])).toBe(true);
    });

    test('returns true for nested subdirectory', () => {
        expect(isSubdirectory('/project/sandbox/foo/bar/baz.txt', ['/project/sandbox/foo'])).toBe(true);
    });

    test('returns false for file outside directory', () => {
        expect(isSubdirectory('/project/sandbox2/foo/bar.txt', ['/project/sandbox/foo'])).toBe(false);
    });

    test('returns true for file in the directory itself', () => {
        expect(isSubdirectory('/project/sandbox/foo', ['/project/sandbox/foo'])).toBe(true);
    });

    test('returns false for file in sibling directory', () => {
        expect(isSubdirectory('/project/sandbox/bar/baz.txt', ['/project/sandbox/foo'])).toBe(false);
    });

    test('returns true for multiple directories (one matches)', () => {
        expect(isSubdirectory('/project/sandbox/foo/bar.txt', ['/project/sandbox/other', '/project/sandbox/foo'])).toBe(true);
    });

    test('returns false for multiple directories (none match)', () => {
        expect(isSubdirectory('/project/sandbox/foo/bar.txt', ['/project/sandbox/other', '/project/sandbox/else'])).toBe(false);
    });

    test('handles relative file paths', () => {
        expect(isSubdirectory('foo/bar.txt', ['foo'])).toBe(true);
        expect(isSubdirectory('foo/bar/baz.txt', ['foo'])).toBe(true);
        expect(isSubdirectory('bar/baz.txt', ['foo'])).toBe(false);
    });

    test('handles relative directory paths', () => {
        expect(isSubdirectory('/project/sandbox/foo/bar.txt', ['foo'])).toBe(true);
        expect(isSubdirectory('/project/sandbox/foo/bar.txt', ['foo/bar'])).toBe(false);
        expect(isSubdirectory('/project/sandbox/foo/bar.txt', ['bar'])).toBe(false);
    });

    test('returns false for empty directories array', () => {
        expect(isSubdirectory('/project/sandbox/foo/bar.txt', [])).toBe(false);
    });

    test('returns true for root directory', () => {
        expect(isSubdirectory('/project/sandbox/foo.txt', ['/project/sandbox'])).toBe(true);
    });

    test('handles Windows-style paths', () => {
        expect(isSubdirectory('C:/project/sandbox/foo/bar.txt', ['C:/project/sandbox/foo'])).toBe(true);
        expect(isSubdirectory('C:/project/sandbox/foo/bar.txt', ['C:/project/sandbox/other'])).toBe(false);
        expect(isSubdirectory('C:\\project\\sandbox\\foo\\bar.txt', ['C:\\project\\sandbox\\foo'])).toBe(true);
    });

    test('returns true if filePath is exactly the directory', () => {
        expect(isSubdirectory('/project/sandbox/foo', ['/project/sandbox/foo'])).toBe(true);
    });

    test('returns false if filePath is parent of directory', () => {
        expect(isSubdirectory('/project/sandbox', ['/project/sandbox/foo'])).toBe(false);
    });
});
