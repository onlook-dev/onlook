import type { PartialDeep } from 'type-fest';
import { z } from 'zod';

const TextBlockSchema = z.object({
    type: z.literal('text').describe('The type of the block, should be text'),
    text: z
        .string()
        .describe('Text reply to the user, can be a message to describe the code change'),
});

const CodeBlockSchema = z.object({
    type: z.literal('code').describe('The type of the block, should be code'),
    fileName: z.string().describe('The name of the file to be changed'),
    value: z
        .string()
        .describe(
            'The new or modified code for the file. Always include the full content of the file.',
        ),
});

const ResponseBlockSchema = z.discriminatedUnion('type', [TextBlockSchema, CodeBlockSchema]);

export const StreamReponseSchema = z
    .object({
        blocks: z
            .array(ResponseBlockSchema)
            .describe('Array of responses that can be text or code type'),
    })
    .describe('Generate a stream of text and code responses');

export type StreamResult = {
    // No zod support for partial deep
    object: PartialDeep<StreamResponse> | null;
    success: boolean;
};

export type CodeResponseBlock = z.infer<typeof CodeBlockSchema>;
export type TextResponseBlock = z.infer<typeof TextBlockSchema>;
export type ResponseBlock = z.infer<typeof ResponseBlockSchema>;
export type StreamResponse = z.infer<typeof StreamReponseSchema>;
