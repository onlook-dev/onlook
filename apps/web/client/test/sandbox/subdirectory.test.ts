import { describe, expect, test } from 'bun:test';
import { isSubdirectory } from '../../src/components/store/editor/sandbox/helpers';

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
