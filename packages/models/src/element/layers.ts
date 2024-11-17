import { z } from 'zod';

const baseLayerNodeSchema = z.object({
    id: z.string(),
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
