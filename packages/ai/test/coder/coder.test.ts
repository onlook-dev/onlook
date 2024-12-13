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

    test('should extract code correctly', () => {
        const codeBlock = '```typescript\nconst x = 1;\n```';
        const extracted = coder.extractCode(codeBlock);
        expect(extracted).toBe('const x = 1;');
    });

    test('should throw error on invalid diff format', () => {
        expect(() => coder.parseDiff('invalid diff')).toThrow('Invalid diff format');
    });

    test('should throw error when search text not found', () => {
        const diff = coder.createDiff('nonexistent', 'new');
        expect(() => coder.applyDiff('original text', diff)).toThrow('Search text not found');
    });

    test('should throw error on invalid code block', () => {
        expect(() => coder.extractCode('no code block here')).toThrow('No code block found');
    });
});
