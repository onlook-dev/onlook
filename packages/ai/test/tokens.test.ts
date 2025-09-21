import type { ChatMessage } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { encode } from 'gpt-tokenizer';
import { countTokensWithRoles } from '../src/tokens/index.ts';
type Part =
    | { type: 'text'; text: string }
    | { type: `tool-${string}`; input: unknown }
    | { type: string; [key: string]: unknown };

function createMessage(parts: Part[], role: 'user' | 'assistant' = 'user') {
    return {
        id: 'test-id',
        createdAt: new Date(),
        role,
        threadId: 'test-thread',
        parts,
        metadata: { context: [], checkpoints: [] },
    } as unknown as ChatMessage;
}

describe('countTokensWithRoles', () => {
    test('counts tokens for single text message', async () => {
        const text = 'hello world';
        const messages = [createMessage([{ type: 'text', text }])];

        const result = await countTokensWithRoles(messages);

        // perMessageExtra (4) + perReplyExtra (2)
        const expected = encode(text).length + 4 + 2;
        expect(result).toBe(expected);
    });

    test('counts tokens across multiple messages', async () => {
        const t1 = 'first';
        const t2 = 'second';
        const messages = [
            createMessage([{ type: 'text', text: t1 }], 'user'),
            createMessage([{ type: 'text', text: t2 }], 'assistant'),
        ];

        const result = await countTokensWithRoles(messages);

        const expected = encode(t1).length + encode(t2).length + 4 * 2 + 2;
        expect(result).toBe(expected);
    });

    test('counts tokens for mixed parts (text + tool-invocation)', async () => {
        const text = 'compute sum';
        const invocation = { name: 'sum', args: { a: 1, b: 2 } };
        const messages = [
            createMessage([
                { type: 'text', text },
                { type: 'tool-sum', input: invocation },
            ]),
        ];

        const result = await countTokensWithRoles(messages);

        const joined = text + JSON.stringify(invocation);
        const expected = encode(joined).length + 4 + 2;
        expect(result).toBe(expected);
    });

    test('ignores unknown part types', async () => {
        const text = 'visible text';
        const unknownPart: Part = { type: 'image', url: 'http://example.com/image.png' };
        const messages = [createMessage([{ type: 'text', text }, unknownPart])];

        const result = await countTokensWithRoles(messages);

        const expected = encode(text).length + 4 + 2;
        expect(result).toBe(expected);
    });

    test('handles empty parts array', async () => {
        const messages = [createMessage([])];

        const result = await countTokensWithRoles(messages);

        // Only overheads: perMessageExtra (4) + perReplyExtra (2)
        const expected = 4 + 2;
        expect(result).toBe(expected);
    });
});
