import { z } from 'zod';

const BaseActionLocationSchema = z.object({
    type: z.union([z.literal('prepend'), z.literal('append')]),
    targetDomId: z.string(),
    targetOid: z.string().nullable(),
});

export const IndexActionLocationSchema = BaseActionLocationSchema.extend({
    type: z.literal('index'),
    index: z.number(),
    originalIndex: z.number(),
});

export const ActionLocationSchema = z.discriminatedUnion('type', [
    IndexActionLocationSchema,
    BaseActionLocationSchema
]);

export type ActionLocation = z.infer<typeof ActionLocationSchema>;
export type IndexActionLocation = z.infer<typeof IndexActionLocationSchema>;
