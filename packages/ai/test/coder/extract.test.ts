import { describe, expect, it } from 'bun:test';
import { extractCodeBlocks } from '../../src/coder/helpers';

describe('extractCodeBlocks', () => {
    it('should extract a single code block without language', () => {
        const text = 'Some text\n```\nconst x = 1;\n```\nMore text';
        const result = extractCodeBlocks(text);
        expect(result).toBe('const x = 1;');
    });

    it('should extract a single code block with language', () => {
        const text = 'Some text\n```javascript\nconst x = 1;\n```\nMore text';
        const result = extractCodeBlocks(text);
        expect(result).toBe('const x = 1;');
    });

    it('should extract multiple code blocks', () => {
        const text =
            '```python\nprint("Hello")\n```\nMiddle text\n```typescript\nconst y = 2;\n```';
        const result = extractCodeBlocks(text);
        expect(result).toBe('print("Hello")\n\nconst y = 2;');
    });

    it('should handle code blocks with multiple lines', () => {
        const text = '```\nline 1\nline 2\nline 3\n```';
        const result = extractCodeBlocks(text);
        expect(result).toBe('line 1\nline 2\nline 3');
    });

    it('should handle empty code blocks', () => {
        const text = '```\n\n```';
        const result = extractCodeBlocks(text);
        expect(result).toBe('');
    });

    it('should handle code blocks with special characters', () => {
        const text = '```\n/* Special chars: !@#$%^&*() */\n```';
        const result = extractCodeBlocks(text);
        expect(result).toBe('/* Special chars: !@#$%^&*() */');
    });

    it('should handle language identifiers with hyphens', () => {
        const text = '```jsx-typescript\nconst Component = () => <div />;\n```';
        const result = extractCodeBlocks(text);
        expect(result).toBe('const Component = () => <div />;');
    });

    it('should return original text when no code blocks are found', () => {
        const text = 'Just plain text without any code blocks';
        const result = extractCodeBlocks(text);
        expect(result).toBe(text);
    });

    it('should handle malformed code blocks (unclosed)', () => {
        const text = 'const x = 1;';
        const result = extractCodeBlocks(text);
        expect(result).toBe(text);
    });

    it('should handle code blocks with backticks in the content', () => {
        const text = '```\nInline code: `const x = 1;`\n```';
        const result = extractCodeBlocks(text);
        expect(result).toBe('Inline code: `const x = 1;`');
    });

    it('should handle unclosed code blocks at the end of text', () => {
        const text = 'Some text\n```javascript\nconst x = 1;';
        const result = extractCodeBlocks(text);
        expect(result).toBe('const x = 1;');
    });

    it('should handle unopened code blocks', () => {
        const text = 'Some text\nconst x = 1;\n```';
        const result = extractCodeBlocks(text);
        expect(result).toBe(text);
    });

    it('should handle text with only closing backticks', () => {
        const text = 'Some text ```';
        const result = extractCodeBlocks(text);
        expect(result).toBe(text);
    });

    it('should handle text with only opening backticks', () => {
        const text = '``` Some text';
        const result = extractCodeBlocks(text);
        expect(result).toBe('');
    });

    it('should handle nested unclosed code blocks', () => {
        const text = 'Text ```outer\nSome ```inner\ncode';
        const result = extractCodeBlocks(text);
        expect(result).toBe(text);
    });
});
