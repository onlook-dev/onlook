import { z } from 'zod';

const TextResponse = z.object({
    type: z.literal('text'),
    content: z.string().describe('Text reply to the user'),
});

const CodeResponse = z.object({
    type: z.literal('code'),
    fileName: z.string().describe('The name of the file to be changed'),
    value: z
        .string()
        .describe(
            'The new or modified code for the file. Always include the full content of the file.',
        ),
});

const ResponseItem = z.discriminatedUnion('type', [TextResponse, CodeResponse]);

export const StreamReponseObject = z.object({
    description: z.string().describe('Generate a stream of text and code responses'),
    blocks: z
        .array(ResponseItem)
        .describe('Array of responses that can be either text or code changes'),
});

export type StreamResponse = z.infer<typeof StreamReponseObject>;
