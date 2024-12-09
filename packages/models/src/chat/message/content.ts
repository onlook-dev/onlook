import { z } from 'zod';

export const TextBlockSchema = z.object({
    type: z.literal('text'),
    text: z.string(),
});

export const CodeFileBlockSchema = z.object({
    type: z.literal('code-file'),
    id: z.string(),
    fileName: z.string(),
    value: z.string(),
    original: z.string(),
    applied: z.boolean(),
});

export const UserContentBlockSchema = TextBlockSchema;

export const AssistantContentBlockSchema = z.discriminatedUnion('type', [
    TextBlockSchema,
    CodeFileBlockSchema,
]);

export type TextBlock = z.infer<typeof TextBlockSchema>;
export type CodeChangeBlock = z.infer<typeof CodeFileBlockSchema>;
export type UserContentBlock = z.infer<typeof UserContentBlockSchema>;
export type AssistantContentBlock = z.infer<typeof AssistantContentBlockSchema>;
