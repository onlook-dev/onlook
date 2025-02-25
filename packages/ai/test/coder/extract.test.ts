import { describe, expect, it } from 'bun:test';
import { extractCodeBlocks } from '../../src/coder/helpers';

describe('extractCodeBlocks', () => {
    it('should extract a single code block without language', () => {
        const text = 'Some text\n```\nconst x = 1;\n```\nMore text';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('const x = 1;');
        expect(result[0].language).toBeUndefined();
    });

    it('should extract a single code block with language', () => {
        const text = 'Some text\n```javascript\nconst x = 1;\n```\nMore text';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('const x = 1;');
        expect(result[0].language).toBe('javascript');
    });

    it('should extract multiple code blocks', () => {
        const text =
            '```python\nprint("Hello")\n```\nMiddle text\n```typescript\nconst y = 2;\n```';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(2);
        expect(result[0].code).toBe('print("Hello")');
        expect(result[0].language).toBe('python');
        expect(result[1].code).toBe('const y = 2;');
        expect(result[1].language).toBe('typescript');
    });

    it('should handle code blocks with multiple lines', () => {
        const text = '```\nline 1\nline 2\nline 3\n```';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('line 1\nline 2\nline 3');
    });

    it('should handle empty code blocks', () => {
        const text = '```\n\n```';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('');
    });

    it('should handle code blocks with special characters', () => {
        const text = '```\n/* Special chars: !@#$%^&*() */\n```';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('/* Special chars: !@#$%^&*() */');
    });

    it('should handle language identifiers with hyphens', () => {
        const text = '```jsx-typescript\nconst Component = () => <div />;\n```';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('const Component = () => <div />;');
        expect(result[0].language).toBe('jsx-typescript');
    });

    it('should return an empty array when no code blocks are found', () => {
        const text = 'Just plain text without any code blocks';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(0);
    });

    it('should handle malformed code blocks (unclosed)', () => {
        const text = '```javascript\nconst x = 1;';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(0);
    });

    it('should handle code blocks with backticks in the content', () => {
        const text = '```\nInline code: `const x = 1;`\n```';
        const result = extractCodeBlocks(text);

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('Inline code: `const x = 1;`');
    });
});
