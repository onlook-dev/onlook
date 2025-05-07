import { getBrandConfigFiles } from '@onlook/ai/src/tools/helpers';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('getBrandConfigFiles', () => {
    const testDir = join(__dirname, 'test-files');

    beforeEach(() => {
        // Create test directory structure
        mkdirSync(testDir);
        mkdirSync(join(testDir, 'src'));
        mkdirSync(join(testDir, 'styles'));
        mkdirSync(join(testDir, 'node_modules'));

        // Create test files
        writeFileSync(join(testDir, 'tailwind.config.js'), 'content');
        writeFileSync(join(testDir, 'styles/globals.css'), 'content');
        writeFileSync(join(testDir, 'src/tailwind.config.ts'), 'content');
        writeFileSync(join(testDir, 'node_modules/globals.css'), 'content');
    });

    afterEach(() => {
        // Cleanup test directory
        rmSync(testDir, { recursive: true, force: true });
    });

    test('should find all brand config files', async () => {
        const { files } = await getBrandConfigFiles(testDir, {
            patterns: ['**/globals.css', '**/tailwind.config.{js,ts,mjs}'],
            ignore: ['node_modules/**'],
        });
        expect(files?.length).toBe(3);
        expect(files?.some((f) => f.endsWith('tailwind.config.js'))).toBe(true);
        expect(files?.some((f) => f.endsWith('tailwind.config.ts'))).toBe(true);
        expect(files?.some((f) => f.endsWith('globals.css'))).toBe(true);
    });

    test('should exclude node_modules', async () => {
        const { files } = await getBrandConfigFiles(testDir, {
            patterns: ['**/globals.css', '**/tailwind.config.{js,ts,mjs}'],
            ignore: ['node_modules/**'],
        });
        expect(files?.length).toBe(3);
        expect(files?.every((f) => !f.includes('node_modules'))).toBe(true);
    });

    test('should find only tailwind config files', async () => {
        const { files } = await getBrandConfigFiles(testDir, {
            patterns: ['**/tailwind.config.{js,ts,mjs}'],
            ignore: [],
        });
        expect(files?.length).toBe(2);
        expect(files?.every((f) => f.includes('tailwind.config'))).toBe(true);
    });

    test('should find only globals.css files', async () => {
        const { files } = await getBrandConfigFiles(testDir, {
            patterns: ['**/globals.css'],
            ignore: ['node_modules/**'],
        });
        expect(files?.length).toBe(1);
        expect(files?.every((f) => f.endsWith('globals.css'))).toBe(true);
    });

    test('should handle non-existent directory', async () => {
        const nonExistentDir = join(testDir, 'does-not-exist');
        const result = await getBrandConfigFiles(nonExistentDir);
        expect(result.success).toBe(false);
        expect(result.error).toBe(`Directory does not exist: ${nonExistentDir}`);
    });
});
