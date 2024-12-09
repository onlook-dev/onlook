import type { PartialDeep } from 'type-fest';
import { z } from 'zod';

const TextBlockSchema = z.object({
    type: z.literal('text'),
    text: z
        .string()
        .describe('Text reply to the user, can be a message to describe the code change'),
});

const CodeEditBlockSchema = z.object({
    type: z.literal('code-edit'),
    fileName: z.string().describe('The name of the file to be changed'),
    original: z
        .string()
        .describe(
            'The original code segment that needs to be replaced. Should be unchanged from the original code and be unique.',
        ),
    updated: z.string().describe('The updated version of the code segment'),
});

const ResponseBlockSchema = z.discriminatedUnion('type', [TextBlockSchema, CodeEditBlockSchema]);

export const StreamReponseSchema = z
    .object({
        blocks: z
            .array(ResponseBlockSchema)
            .min(1, 'Response must contain at least one block')
            .describe(
                'An ordered sequence of response blocks representing a complete AI response. Each block can be text (for explanations), or code-edit (for specific code modifications). The blocks should be presented in a logical order that helps the user understand and implement the changes.',
            ),
    })
    .describe(
        'A structured response format for streaming AI-generated code modifications and explanations',
    );

export type StreamResult = {
    // No zod support for partial deep
    object: PartialDeep<StreamResponse> | null;
    success: boolean;
};

export type TextResponseBlock = z.infer<typeof TextBlockSchema>;
export type CodeEditResponseBlock = z.infer<typeof CodeEditBlockSchema>;
export type ResponseBlock = z.infer<typeof ResponseBlockSchema>;
export type StreamResponse = z.infer<typeof StreamReponseSchema>;
