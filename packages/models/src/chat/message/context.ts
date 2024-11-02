import { TemplateNodeSchema } from '../../element/templateNode';
import { z } from 'zod';

export const BaseMessageContextSchema = z.object({
    type: z.string(),
    value: z.string(),
    name: z.string(),
});

export const FileMessageContextSchema = BaseMessageContextSchema.extend({
    type: z.literal('file'),
});

export const HighlightedMessageContextSchema = BaseMessageContextSchema.extend({
    type: z.literal('selected'),
    templateNode: TemplateNodeSchema,
});

export const ImageMessageContextSchema = BaseMessageContextSchema.extend({
    type: z.literal('image'),
});

export const ChatMessageContextSchema = z.discriminatedUnion('type', [
    FileMessageContextSchema,
    HighlightedMessageContextSchema,
    ImageMessageContextSchema,
]);

export type FileMessageContext = z.infer<typeof FileMessageContextSchema>;
export type HighlightedMessageContext = z.infer<typeof HighlightedMessageContextSchema>;
export type ImageMessageContext = z.infer<typeof ImageMessageContextSchema>;
export type ChatMessageContext = z.infer<typeof ChatMessageContextSchema>;
