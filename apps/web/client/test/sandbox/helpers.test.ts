import { describe, expect, mock, test } from 'bun:test';
import path from 'path';
import { normalizePath } from '../../src/components/store/editor/sandbox/helpers';

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
