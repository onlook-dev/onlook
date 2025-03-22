import { describe, expect, test } from 'bun:test';
import { CodeBlockProcessor } from '../../../src/coder/block';

describe('Apply Multiple Diffs', () => {
    const processor = new CodeBlockProcessor();

    test('should apply multiple diffs successfully', async () => {
        const originalText = 'function test() {\n  const a = 1;\n  const b = 2;\n  return a + b;\n}';
        
        const diff1 = processor.createDiff('const a = 1;', 'const a = 10;');
        const diff2 = processor.createDiff('const b = 2;', 'const b = 20;');
        
        const result = await processor.applyDiffs(originalText, [diff1, diff2]);
        
        expect(result.failures).toHaveLength(0);
        expect(result.text).toBe('function test() {\n  const a = 10;\n  const b = 20;\n  return a + b;\n}');
    });

    test('should continue processing when some diffs fail', async () => {
        const originalText = 'function test() {\n  const a = 1;\n  const b = 2;\n  return a + b;\n}';
        
        const diff1 = processor.createDiff('const a = 1;', 'const a = 10;');
        const diff2 = processor.createDiff('const c = 3;', 'const c = 30;'); // This will fail (no match)
        const diff3 = processor.createDiff('const b = 2;', 'const b = 20;');
        
        const result = await processor.applyDiffs(originalText, [diff1, diff2, diff3]);
        
        expect(result.failures).toHaveLength(1);
        expect(result.failures[0].diffIndex).toBe(1);
        expect(result.text).toBe('function test() {\n  const a = 10;\n  const b = 20;\n  return a + b;\n}');
    });

    test('should handle invalid diff format', async () => {
        const originalText = 'function test() {\n  const a = 1;\n  return a;\n}';
        
        const invalidDiff = 'This is not a valid diff format';
        const validDiff = processor.createDiff('const a = 1;', 'const a = 10;');
        
        const result = await processor.applyDiffs(originalText, [invalidDiff, validDiff]);
        
        expect(result.failures).toHaveLength(1);
        expect(result.failures[0].diffIndex).toBe(0);
        expect(result.text).toBe('function test() {\n  const a = 10;\n  return a;\n}');
    });

    test('should handle empty diffs array', async () => {
        const originalText = 'function test() {\n  return 42;\n}';
        
        const result = await processor.applyDiffs(originalText, []);
        
        expect(result.failures).toHaveLength(0);
        expect(result.text).toBe(originalText);
    });
});
