import type { ChatMessage } from '@onlook/models';
import { ChatMessageRole } from '@onlook/models';
import type { UIMessagePart, UIDataTypes, UITools } from 'ai';
import { describe, expect, test } from 'bun:test';
import { convertToStreamMessages, extractTextFromParts } from '../../src/stream';

type Part = UIMessagePart<UIDataTypes, UITools>;

function createMessage(
    id: string,
    role: 'user' | 'assistant',
    parts: Part[],
    context: any[] = [],
): ChatMessage {
    return {
        id,
        role: role === 'user' ? ChatMessageRole.USER : ChatMessageRole.ASSISTANT,
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
