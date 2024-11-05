import { z } from 'zod';
import { TemplateNodeSchema } from '../../element/templateNode';

export enum MessageContextType {
    FILE = 'file',
    HIGHLIGHTED = 'selected',
    IMAGE = 'image',
}

export const BaseMessageContextSchema = z.object({
    type: z.nativeEnum(MessageContextType),
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
