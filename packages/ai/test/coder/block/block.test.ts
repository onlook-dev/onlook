import { describe, expect, test } from 'bun:test';
import path from 'path';
import { CodeBlockProcessor } from '../../../src/coder/block';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe('Extract Code Blocks', () => {
    const coder = new CodeBlockProcessor();

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
});
