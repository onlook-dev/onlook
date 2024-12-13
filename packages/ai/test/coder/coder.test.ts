import { describe, expect, test } from 'bun:test';
import path from 'path';
import { Coder } from '../../src/coder/coder';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe('Coder', () => {
    const coder = new Coder();

    test('should parse diff correctly', async () => {
        const diffText = await Bun.file(path.resolve(__dirname, './data/diff.txt')).text();
        const { search, replace } = coder.parseDiff(diffText);

        expect(search).toContain('FOO');
        expect(replace).toContain('BAR');
    });

    test('should apply diff correctly', async () => {
        const diffText = await Bun.file(path.resolve(__dirname, './data/diff.txt')).text();
        const beforeText = await Bun.file(path.resolve(__dirname, './data/before.txt')).text();
        const afterText = await Bun.file(path.resolve(__dirname, './data/after.txt')).text();

        const result = coder.applyDiff(beforeText, diffText);
        expect(result.trim()).toBe(afterText.trim());
    });

    test('should create diff correctly', () => {
        const search = 'old content';
        const replace = 'new content';

        const diff = coder.createDiff(search, replace);
        const parsed = coder.parseDiff(diff);

        expect(parsed.search).toBe(search);
        expect(parsed.replace).toBe(replace);
    });

    test('should extract multiple code blocks with metadata', async () => {
        const input = await Bun.file(path.resolve(__dirname, './data/multiple.txt')).text();

        const blocks = coder.extractCodeBlocks(input);

        expect(blocks).toHaveLength(4);

        expect(blocks[0]).toEqual({
            fileName: 'file1.ts',
            language: 'typescript',
            content: 'const x = 1;',
        });

        expect(blocks[1]).toEqual({
            language: 'javascript',
            content: 'const y = 2;',
        });

        expect(blocks[2]).toEqual({
            fileName: 'src/file2.tsx',
            content: 'const z = 3;',
        });

        expect(blocks[3]).toEqual({
            content: 'const z = 4;',
        });
    });

    test('should handle empty input for code blocks', () => {
        const blocks = coder.extractCodeBlocks('');
        expect(blocks).toHaveLength(0);
    });

    test('should throw error on invalid diff format', () => {
        expect(() => coder.parseDiff('invalid diff')).toThrow('Invalid diff format');
    });

    test('should throw error when search text not found', () => {
        const diff = coder.createDiff('nonexistent', 'new');
        expect(() => coder.applyDiff('original text', diff)).toThrow('Search text not found');
    });
});
