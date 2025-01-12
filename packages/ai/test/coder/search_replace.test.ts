import { describe, expect, test } from 'bun:test';
import { CodeBlockProcessor } from '../../src/coder/block';
import {
    dmpLinesApply,
    flexibleSearchAndReplace,
    RelativeIndenter,
    searchAndReplace,
} from '../../src/coder/search_replace';

describe('RelativeIndenter', () => {
    const indenter = new RelativeIndenter();

    test('should handle empty text', () => {
        const text = '';
        expect(indenter.makeRelative(text)).toBe('');
        expect(indenter.makeAbsolute(text)).toBe('');
    });

    test('should preserve indentation structure', () => {
        const text = '    line1\n        line2\n    line3';
        const relative = indenter.makeRelative(text);
        const absolute = indenter.makeAbsolute(relative);
        expect(absolute).toBe(text);
    });

    test('should handle mixed indentation', () => {
        const text = 'line1\n    line2\n        line3\n    line4';
        const relative = indenter.makeRelative(text);
        expect(relative).not.toContain('    ');
        const absolute = indenter.makeAbsolute(relative);
        expect(absolute).toBe(text);
    });
});

describe('Search and Replace Strategies', () => {
    test('direct string replace - basic', () => {
        const result = searchAndReplace('old', 'new', 'this is old text');
        expect(result.success).toBe(true);
        expect(result.text).toBe('this is new text');
    });

    test('direct string replace - not found', () => {
        const result = searchAndReplace('missing', 'new', 'this is old text');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Search text not found');
    });

    test('direct string replace - not unique', () => {
        const result = searchAndReplace('text', 'new', 'text with text');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Search text not unique');
    });

    test('dmp lines apply - basic', () => {
        const result = dmpLinesApply(
            'line1\nline2',
            'line1\nmodified\nline2',
            'prefix\nline1\nline2\nsuffix',
        );
        expect(result.success).toBe(true);
        expect(result.text).toBe('prefix\nline1\nmodified\nline2\nsuffix');
    });
});

describe('Flexible Search and Replace', () => {
    test('should handle basic replacement', async () => {
        const result = await flexibleSearchAndReplace('old', 'new', 'this is old text');
        expect(result.success).toBe(true);
        expect(result.text).toBe('this is new text');
    });

    test('should handle indentation-sensitive replacement', async () => {
        const text = '    if (condition) {\n        oldCode();\n    }';
        const search = '    oldCode();';
        const replace = '    newCode();';
        const result = await flexibleSearchAndReplace(search, replace, text, {
            relativeIndent: true,
        });
        expect(result.success).toBe(true);
        expect(result.text).toBe('    if (condition) {\n        newCode();\n    }');
    });

    test('should handle blank line differences', async () => {
        const text = '\n\ncode\n\n';
        const search = 'code';
        const replace = 'newcode';
        const result = await flexibleSearchAndReplace(search, replace, text, {
            stripBlankLines: true,
        });
        expect(result.success).toBe(true);
        expect(result.text).toBe('\n\nnewcode\n\n');
    });
});

describe('CodeBlockProcessor Integration', () => {
    const processor = new CodeBlockProcessor();

    test('should apply flexible diff correctly', async () => {
        const originalText = '    if (x) {\n        oldFunc();\n    }';
        const diffText = processor.createDiff('    oldFunc();', '    newFunc();');
        const result = await processor.applyDiff(originalText, diffText, {
            relativeIndent: true,
        });
        expect(result).toBe('    if (x) {\n        newFunc();\n    }');
    });

    test('should fall back to simple replace if needed', async () => {
        const originalText = 'simple old text';
        const diffText = processor.createDiff('old', 'new');
        const result = await processor.applyDiff(originalText, diffText);
        expect(result).toBe('simple new text');
    });
});
