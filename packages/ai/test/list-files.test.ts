import { getAllFiles } from '@onlook/ai/src/tools/helpers';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('getAllFiles', () => {
    const testDir = join(__dirname, 'test-files');

    beforeEach(() => {
        // Create test directory structure
        mkdirSync(testDir);
        mkdirSync(join(testDir, 'subdir'));
        mkdirSync(join(testDir, 'node_modules'));

        // Create test files
        writeFileSync(join(testDir, 'file1.txt'), 'content');
        writeFileSync(join(testDir, 'file2.js'), 'content');
        writeFileSync(join(testDir, 'subdir', 'file3.ts'), 'content');
        writeFileSync(join(testDir, 'node_modules', 'file4.js'), 'content');
    });

    afterEach(() => {
        // Cleanup test directory
        rmSync(testDir, { recursive: true, force: true });
    });

    test('should get all files without filters', async () => {
        const { files } = await getAllFiles(testDir, { patterns: ['**/*'], ignore: [] });
        expect(files?.length).toBe(4);
        expect(files?.some((f) => f.endsWith('file1.txt'))).toBe(true);
        expect(files?.some((f) => f.endsWith('file2.js'))).toBe(true);
        expect(files?.some((f) => f.endsWith('file3.ts'))).toBe(true);
        expect(files?.some((f) => f.endsWith('file4.js'))).toBe(true);
    });

    test('should filter by extensions', async () => {
        const { files } = await getAllFiles(testDir, { patterns: ['**/*.js'], ignore: [] });
        expect(files?.length).toBe(2);
        expect(files?.every((f) => f.endsWith('.js'))).toBe(true);
    });

    test('should exclude specified paths', async () => {
        const { files } = await getAllFiles(testDir, {
            patterns: ['**/*'],
            ignore: ['node_modules/**'],
        });
        expect(files?.length).toBe(3);
        expect(files?.every((f) => !f.includes('node_modules'))).toBe(true);
    });

    test('should handle both extensions and exclusions', async () => {
        const { files } = await getAllFiles(testDir, {
            patterns: ['**/*.js'],
            ignore: ['node_modules/**'],
        });
        expect(files?.length).toBe(1);
        expect(files?.[0]?.endsWith('file2.js')).toBe(true);
    });

    test('should exclude specific subdirectory', async () => {
        const { files } = await getAllFiles(testDir, { patterns: ['**/*'], ignore: ['subdir/**'] });
        expect(files?.length).toBe(3);
        expect(files?.every((f) => !f.includes('subdir'))).toBe(true);
    });

    test('should exclude specific file', async () => {
        const { files } = await getAllFiles(testDir, { patterns: ['**/*'], ignore: ['file1.txt'] });
        expect(files?.length).toBe(3);
        expect(files?.every((f) => !f.endsWith('file1.txt'))).toBe(true);
    });

    test('should handle multiple ignore patterns', async () => {
        const { files } = await getAllFiles(testDir, {
            patterns: ['**/*'],
            ignore: ['subdir/**', 'file1.txt', 'node_modules/**'],
        });
        expect(files?.length).toBe(1);
        expect(files?.[0]?.endsWith('file2.js')).toBe(true);
    });
});
