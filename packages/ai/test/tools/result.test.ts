import { describe, expect, test } from 'bun:test';

import { createToolErrorResult, formatToolCallError } from '../../src/tools/result';

describe('tool result helpers', () => {
    test('formats Error instances as user-facing messages', () => {
        expect(formatToolCallError(new Error('Sandbox not found'))).toBe('Sandbox not found');
    });

    test('formats string errors without wrapping them as normal output', () => {
        expect(formatToolCallError('Zod parse failed')).toBe('Zod parse failed');
    });

    test('formats undefined errors without returning undefined', () => {
        expect(formatToolCallError(undefined)).toBe('undefined');
    });

    test('creates first-class output-error tool results', () => {
        expect(createToolErrorResult('read_file', 'call_123', new Error('File is binary'))).toEqual({
            state: 'output-error',
            tool: 'read_file',
            toolCallId: 'call_123',
            errorText: 'File is binary',
        });
    });
});
