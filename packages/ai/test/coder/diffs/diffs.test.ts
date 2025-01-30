import { describe, expect, test } from 'bun:test';
import path from 'path';
import { CodeBlockProcessor } from '../../../src/coder/block';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
        expect(result.trim()).toBe(afterText.trim());
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
