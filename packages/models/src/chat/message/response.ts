import { z } from 'zod';

const TextBlockObject = z.object({
    type: z.literal('text').describe('The type of the block, should be text'),
    text: z
        .string()
        .describe('Text reply to the user, can be a message to describe the code change'),
});

const CodeBlockObject = z.object({
    type: z.literal('code').describe('The type of the block, should be code'),
    fileName: z.string().describe('The name of the file to be changed'),
    value: z
        .string()
        .describe(
            'The new or modified code for the file. Always include the full content of the file.',
        ),
});

const ResponseBlockObject = z.discriminatedUnion('type', [TextBlockObject, CodeBlockObject]);

export const StreamReponseObject = z
    .object({
        blocks: z
            .array(ResponseBlockObject)
            .describe('Array of responses that can be text or code type'),
    })
    .describe('Generate a stream of text and code responses');

export type CodeResponseBlock = z.infer<typeof CodeBlockObject>;
export type TextResponseBlock = z.infer<typeof TextBlockObject>;
export type ResponseBlock = z.infer<typeof ResponseBlockObject>;
export type StreamResponse = z.infer<typeof StreamReponseObject>;
