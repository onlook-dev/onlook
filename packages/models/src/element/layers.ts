import { z } from 'zod';

const baseLayerNodeSchema = z.object({
    domId: z.string(),
    instanceId: z.string().optional(),
    oid: z.string().optional(),
    textContent: z.string(),
    tagName: z.string(),
    isVisible: z.boolean(),
});

export const LayerNodeSchema: z.ZodType<LayerNode> = baseLayerNodeSchema.extend({
    children: z.lazy(() => LayerNodeSchema.array()).optional(),
});

export type LayerNode = z.infer<typeof baseLayerNodeSchema> & {
    children?: LayerNode[];
};
