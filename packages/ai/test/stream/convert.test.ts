import type { ChatMessage } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import {
    convertToStreamMessages,
    ensureToolCallResults,
    extractTextFromParts,
} from '../../src/stream';

function createMessage(
    id: string,
    role: 'user' | 'assistant',
    parts: ChatMessage['parts'],
    context: any[] = [],
): ChatMessage {
    return {
        id,
        role: role === 'user' ? 'user' : 'assistant',
        threadId: 't1',
        parts,
        metadata: { context, snapshots: [] },
    } as unknown as ChatMessage;
}

describe('convertToStreamMessages', () => {
    test('converts ChatMessage array to ModelMessage array', () => {
        const userMessage = createMessage('u1', 'user', [{ type: 'text', text: 'Hello' }], []);
        const assistantMessage = createMessage('a1', 'assistant', [
            { type: 'text', text: 'Hi there!' },
        ]);

        const result = convertToStreamMessages([userMessage, assistantMessage]);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
    });

    test('preserves assistant message parts unchanged', () => {
        const assistantMessage = createMessage('a1', 'assistant', [
            { type: 'text', text: 'Found results' },
        ]);

        const result = convertToStreamMessages([assistantMessage]);
        const resultMessage = result[0];

        expect(resultMessage).toBeDefined();
        expect(resultMessage?.role).toBe('assistant');
        expect(resultMessage?.content).toBeDefined();
    });

    test('hydrates user messages with context information', () => {
        const fileCtx = (path: string, content: string) => ({
            type: 'file' as const,
            path,
            content,
            displayName: path,
        });

        const userMessage = createMessage(
            'u1',
            'user',
            [{ type: 'text', text: 'Update this file' }],
            [fileCtx('test.ts', 'console.log("test");')],
        );

        const result = convertToStreamMessages([userMessage]);
        const resultMessage = result[0];

        expect(resultMessage).toBeDefined();
        expect(resultMessage?.role).toBe('user');
        expect(resultMessage?.content).toBeDefined();
        // The content should contain the file context
        expect(resultMessage?.content).toBeDefined();
    });

    test('handles empty context arrays', () => {
        const userMessage = createMessage(
            'u1',
            'user',
            [{ type: 'text', text: 'Simple message' }],
            [],
        );

        const result = convertToStreamMessages([userMessage]);
        const resultMessage = result[0];

        expect(resultMessage).toBeDefined();
        expect(resultMessage?.role).toBe('user');
        expect(resultMessage?.content).toBeDefined();
    });

    test('handles mixed message types in sequence', () => {
        const user1 = createMessage('u1', 'user', [{ type: 'text', text: 'First question' }], []);
        const assistant1 = createMessage('a1', 'assistant', [
            { type: 'text', text: 'First answer' },
        ]);
        const user2 = createMessage('u2', 'user', [{ type: 'text', text: 'Second question' }], []);

        const result = convertToStreamMessages([user1, assistant1, user2]);

        expect(result.length).toBe(3);
        expect(result[0]?.role).toBe('user');
        expect(result[1]?.role).toBe('assistant');
        expect(result[2]?.role).toBe('user');
    });

    test('handles messages with various part types', () => {
        const userMessage = createMessage(
            'u1',
            'user',
            [{ type: 'text', text: 'Hello world' }],
            [],
        );

        const result = convertToStreamMessages([userMessage]);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(result[0]?.role).toBe('user');
    });
});

describe('extractTextFromParts', () => {
    test('extracts text from text parts', () => {
        const parts = [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'World' },
        ];

        const result = extractTextFromParts(parts as any);
        expect(result).toBe('HelloWorld');
    });

    test('handles non-text parts by returning empty string', () => {
        const parts = [
            { type: 'reasoning', reasoning: 'Some reasoning' } as any,
            { type: 'text', text: 'Hello' },
        ];

        const result = extractTextFromParts(parts as any);
        expect(result).toBe('Hello');
    });

    test('returns empty string for empty parts array', () => {
        const result = extractTextFromParts([] as any);
        expect(result).toBe('');
    });

    test('handles undefined parts', () => {
        const result = extractTextFromParts(undefined as any);
        expect(result).toBeUndefined();
    });
});

describe('ensureToolCallResults', () => {
    test('returns unchanged parts when undefined', () => {
        const result = ensureToolCallResults(undefined);
        expect(result).toBeUndefined();
    });

    test('returns unchanged parts when no tool calls present', () => {
        const parts = [{ type: 'text', text: 'Hello world' }];

        const result = ensureToolCallResults(parts as any);
        expect(result).toEqual(parts);
    });

    test('adds stub results for tool calls without results', () => {
        const parts = [
            { type: 'text', text: 'Computing...' },
            {
                type: 'tool-sum',
                toolCallId: 'call_1',
                state: 'input-available',
                input: { a: 1, b: 2 },
            } as any,
            {
                type: 'tool-multiply',
                toolCallId: 'call_2',
                state: 'input-streaming',
                input: { x: 3, y: 4 },
            } as any,
        ];

        const result = ensureToolCallResults(parts as any);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ type: 'text', text: 'Computing...' });

        // Tool calls should be updated with stub results
        expect(result[1]).toEqual({
            type: 'tool-sum',
            toolCallId: 'call_1',
            state: 'output-available',
            input: { a: 1, b: 2 },
            output: 'No tool result returned',
        });

        expect(result[2]).toEqual({
            type: 'tool-multiply',
            toolCallId: 'call_2',
            state: 'output-available',
            input: { x: 3, y: 4 },
            output: 'No tool result returned',
        });
    });

    test('preserves existing tool results', () => {
        const parts = [
            {
                type: 'tool-sum',
                toolCallId: 'call_1',
                state: 'output-available',
                input: { a: 1, b: 2 },
                output: 3,
            } as any,
            {
                type: 'tool-multiply',
                toolCallId: 'call_2',
                state: 'input-available',
                input: { x: 3, y: 4 },
            } as any,
        ];

        const result = ensureToolCallResults(parts as any);

        expect(result).toHaveLength(2);

        // First tool result should remain unchanged
        expect(result[0]).toEqual({
            type: 'tool-sum',
            toolCallId: 'call_1',
            state: 'output-available',
            input: { a: 1, b: 2 },
            output: 3,
        });

        // Second tool call should get stub result
        expect(result[1]).toEqual({
            type: 'tool-multiply',
            toolCallId: 'call_2',
            state: 'output-available',
            input: { x: 3, y: 4 },
            output: 'No tool result returned',
        });
    });

    test('handles mixed tool calls with some having results', () => {
        const parts = [
            {
                type: 'tool-sum',
                toolCallId: 'call_1',
                state: 'input-available',
                input: { a: 1, b: 2 },
            } as any,
            {
                type: 'tool-multiply',
                toolCallId: 'call_2',
                state: 'output-available',
                input: { x: 3, y: 4 },
                output: 12,
            } as any,
            {
                type: 'tool-divide',
                toolCallId: 'call_3',
                state: 'input-streaming',
                input: { a: 10, b: 2 },
            } as any,
        ];

        const result = ensureToolCallResults(parts as any);

        expect(result).toHaveLength(3);

        // call_1 should get stub result
        expect(result[0]).toEqual({
            type: 'tool-sum',
            toolCallId: 'call_1',
            state: 'output-available',
            input: { a: 1, b: 2 },
            output: 'No tool result returned',
        });

        // call_2 should remain unchanged
        expect(result[1]).toEqual({
            type: 'tool-multiply',
            toolCallId: 'call_2',
            state: 'output-available',
            input: { x: 3, y: 4 },
            output: 12,
        });

        // call_3 should get stub result
        expect(result[2]).toEqual({
            type: 'tool-divide',
            toolCallId: 'call_3',
            state: 'output-available',
            input: { a: 10, b: 2 },
            output: 'No tool result returned',
        });
    });

    test('ensures no duplicate toolCallIds are created', () => {
        const parts = [
            {
                type: 'tool-sum',
                toolCallId: 'call_1',
                state: 'input-available',
                input: { a: 1, b: 2 },
            } as any,
        ];

        const result = ensureToolCallResults(parts as any);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            type: 'tool-sum',
            toolCallId: 'call_1',
            state: 'output-available',
            input: { a: 1, b: 2 },
            output: 'No tool result returned',
        });

        // Verify no duplicates by checking unique toolCallIds
        const toolCallIds = result
            .filter((part: any) => part.type?.startsWith('tool-') && part.toolCallId)
            .map((part: any) => part.toolCallId);

        const uniqueIds = new Set(toolCallIds);
        expect(toolCallIds.length).toBe(uniqueIds.size);
    });

    test('handles empty parts array', () => {
        const result = ensureToolCallResults([] as any);
        expect(result).toEqual([]);
    });

    test('leaves error state tool calls unchanged', () => {
        const parts = [
            {
                type: 'tool-divide',
                toolCallId: 'call_1',
                state: 'error',
                input: { a: 10, b: 0 },
                errorText: 'Division by zero',
            } as any,
            {
                type: 'tool-sum',
                toolCallId: 'call_2',
                state: 'input-available',
                input: { a: 1, b: 2 },
            } as any,
        ];

        const result = ensureToolCallResults(parts as any);

        expect(result).toHaveLength(2);

        // Error state should remain unchanged
        expect(result[0]).toEqual({
            type: 'tool-divide',
            toolCallId: 'call_1',
            state: 'error',
            input: { a: 10, b: 0 },
            errorText: 'Division by zero',
        });

        // Input-available should get stub result
        expect(result[1]).toEqual({
            type: 'tool-sum',
            toolCallId: 'call_2',
            state: 'output-available',
            input: { a: 1, b: 2 },
            output: 'No tool result returned',
        });
    });

    test('ignores tool calls without toolCallId', () => {
        const parts = [
            {
                type: 'tool-sum',
                // Missing toolCallId
                state: 'input-available',
                input: { a: 1, b: 2 },
            } as any,
            {
                type: 'tool-multiply',
                toolCallId: 'call_1',
                state: 'input-available',
                input: { x: 3, y: 4 },
            } as any,
        ];

        const result = ensureToolCallResults(parts as any);

        expect(result).toHaveLength(2);

        // Part without toolCallId should remain unchanged
        expect(result[0]).toEqual({
            type: 'tool-sum',
            state: 'input-available',
            input: { a: 1, b: 2 },
        });

        // Part with toolCallId should get stub result
        expect(result[1]).toEqual({
            type: 'tool-multiply',
            toolCallId: 'call_1',
            state: 'output-available',
            input: { x: 3, y: 4 },
            output: 'No tool result returned',
        });
    });

    test('ignores tool calls without state field', () => {
        const parts = [
            {
                type: 'tool-sum',
                toolCallId: 'call_1',
                // Missing state field
                input: { a: 1, b: 2 },
            } as any,
            {
                type: 'tool-multiply',
                toolCallId: 'call_2',
                state: 'input-available',
                input: { x: 3, y: 4 },
            } as any,
        ];

        const result = ensureToolCallResults(parts as any);

        expect(result).toHaveLength(2);

        // Part without state should remain unchanged
        expect(result[0]).toEqual({
            type: 'tool-sum',
            toolCallId: 'call_1',
            input: { a: 1, b: 2 },
        });

        // Part with proper state should get stub result
        expect(result[1]).toEqual({
            type: 'tool-multiply',
            toolCallId: 'call_2',
            state: 'output-available',
            input: { x: 3, y: 4 },
            output: 'No tool result returned',
        });
    });

    test('ignores tool calls with invalid/unknown states', () => {
        const parts = [
            {
                type: 'tool-sum',
                toolCallId: 'call_1',
                state: 'unknown-state',
                input: { a: 1, b: 2 },
            } as any,
            {
                type: 'tool-multiply',
                toolCallId: 'call_2',
                state: 'processing', // Another unknown state
                input: { x: 3, y: 4 },
            } as any,
            {
                type: 'tool-divide',
                toolCallId: 'call_3',
                state: 'input-available', // Known state
                input: { a: 10, b: 2 },
            } as any,
        ];

        const result = ensureToolCallResults(parts as any);

        expect(result).toHaveLength(3);

        // Unknown states should remain unchanged
        expect(result[0]).toEqual({
            type: 'tool-sum',
            toolCallId: 'call_1',
            state: 'unknown-state',
            input: { a: 1, b: 2 },
        });

        expect(result[1]).toEqual({
            type: 'tool-multiply',
            toolCallId: 'call_2',
            state: 'processing',
            input: { x: 3, y: 4 },
        });

        // Known state should get stub result
        expect(result[2]).toEqual({
            type: 'tool-divide',
            toolCallId: 'call_3',
            state: 'output-available',
            input: { a: 10, b: 2 },
            output: 'No tool result returned',
        });
    });
});
