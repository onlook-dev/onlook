import type { ChatMessage } from '@onlook/models';
import { ChatMessageRole } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { convertToStreamMessages, extractTextFromParts } from '../../src/stream';

type Part = { type: 'text'; text: string } | { type: string; [key: string]: unknown };

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
        content: {
            parts,
            metadata: { context, snapshots: [] },
        },
    } as unknown as ChatMessage;
}

describe('convertToStreamMessages', () => {
    test('truncates context for all user messages except the final user message', () => {
        const fileCtx = (path: string, content: string) => ({
            type: 'file',
            path,
            content,
            displayName: path,
        });

        const user1 = createMessage(
            'u1',
            'user',
            [{ type: 'text', text: 'First question' }],
            [fileCtx('first.ts', 'console.log("first");')],
        );
        const user2 = createMessage(
            'u2',
            'user',
            [{ type: 'text', text: 'Second question' }],
            [fileCtx('second.ts', 'console.log("second");')],
        );
        const assistantBetween = createMessage('a1', 'assistant', [{ type: 'text', text: 'ack' }]);

        const core = convertToStreamMessages([user1, assistantBetween, user2]);

        const userCore = core.filter((m) => m.role === 'user');
        expect(userCore.length).toBe(2);

        const firstUserText = extractTextFromParts(userCore[0]?.content as any);
        const lastUserText = extractTextFromParts(userCore[1]?.content as any);

        expect(firstUserText).toContain('<truncated-context>');
        expect(firstUserText).not.toContain('<context>');

        expect(lastUserText).toContain('<context>');
        expect(lastUserText).not.toContain('<truncated-context>');
    });

    test('truncates repeat tool calls except for the last assistant message', () => {
        const a1 = createMessage('a1', 'assistant', [
            { type: 'text', text: 'First assistant message' },
        ]);
        const a2 = createMessage('a2', 'assistant', [
            { type: 'text', text: 'Second assistant message' },
        ]);
        const a3 = createMessage('a3', 'assistant', [
            { type: 'text', text: 'Third assistant message' },
        ]);

        const core = convertToStreamMessages([a1, a2, a3]);

        expect(core.length).toBe(3);
    });
});
