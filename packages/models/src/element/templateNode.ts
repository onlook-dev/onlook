import { z } from 'zod';

export const TemplateTagPositionSchema = z.object({
    line: z.number(),
    column: z.number(),
});

export const TemplateTagSchema = z.object({
    start: TemplateTagPositionSchema,
    end: TemplateTagPositionSchema,
});

export const TemplateNodeSchema = z.object({
    path: z.string(),
    startTag: TemplateTagSchema,
    endTag: TemplateTagSchema.optional(),
    component: z.string().optional(),
});

export type TemplateNode = z.infer<typeof TemplateNodeSchema>;
export type TemplateTag = z.infer<typeof TemplateTagSchema>;
export type TemplateTagPosition = z.infer<typeof TemplateTagPositionSchema>;
