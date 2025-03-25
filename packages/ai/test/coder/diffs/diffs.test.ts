import { describe, expect, test } from 'bun:test';
import path from 'path';
import { CodeBlockProcessor } from '../../../src/coder/block';

const __dirname = import.meta.dir;

describe('Parse and Apply Code Block Diffs', () => {
    const coder = new CodeBlockProcessor();

    test('should parse diff correctly', async () => {
        const diffText = await Bun.file(path.resolve(__dirname, './data/single/diff.txt')).text();
        const res = CodeBlockProcessor.parseDiff(diffText);

        if (!res) {
            throw new Error('Invalid diff format');
        }

        expect(res).toHaveLength(1);
        expect(res[0].search).toContain('FOO');
        expect(res[0].replace).toContain('BAR');
    });

    test('should apply single diff correctly', async () => {
        const diffText = await Bun.file(path.resolve(__dirname, './data/single/diff.txt')).text();
        const beforeText = await Bun.file(
            path.resolve(__dirname, './data/single/before.txt'),
        ).text();
        const afterText = await Bun.file(path.resolve(__dirname, './data/single/after.txt')).text();

        const result = await coder.applyDiff(beforeText, diffText);
        expect(result.success).toBe(true);
        expect(result.text.trim()).toBe(afterText.trim());
        expect(result.failures).toBeUndefined();
    });

    test('should handle failed replacements', async () => {
        const diffText = coder.createDiff('non-existent-text', 'replacement');
        const originalText = 'some sample text';

        const result = await coder.applyDiff(originalText, diffText);
        expect(result.success).toBe(false);
        expect(result.text).toBe(originalText);
        expect(result.failures).toHaveLength(1);
        expect(result.failures![0]).toEqual({
            search: 'non-existent-text',
            error: 'No changes made',
        });
    });

    test('should fail when any replacement fails in multiple diffs', async () => {
        const diffText =
            coder.createDiff('sample', 'example') +
            '\n' +
            coder.createDiff('non-existent', 'replacement');
        const originalText = 'some sample text';

        const result = await coder.applyDiff(originalText, diffText);
        expect(result.success).toBe(false);
        expect(result.text).toBe('some example text');
        expect(result.failures).toHaveLength(1);
        expect(result.failures![0]).toEqual({
            search: 'non-existent',
            error: 'No changes made',
        });
    });

    test('should create diff correctly', () => {
        const searchContent = 'old content';
        const replaceContent = 'new content';

        const diff = coder.createDiff(searchContent, replaceContent);
        const parsed = CodeBlockProcessor.parseDiff(diff);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].search).toBe(searchContent);
        expect(parsed[0].replace).toBe(replaceContent);
    });
});
