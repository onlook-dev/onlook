import { z } from 'zod';

export const DynamicTypeEnum = z.enum(['map', 'conditional', 'unknown']);
export type DynamicType = z.infer<typeof DynamicTypeEnum>;

const baseLayerNodeSchema = z.object({
    id: z.string(),
    textContent: z.string(),
    tagName: z.string(),
    isVisible: z.boolean(),
    dynamicType: DynamicTypeEnum.optional(),
});

export const LayerNodeSchema: z.ZodType<LayerNode> = baseLayerNodeSchema.extend({
    children: z.lazy(() => LayerNodeSchema.array()).optional(),
});

export type LayerNode = z.infer<typeof baseLayerNodeSchema> & {
    children?: LayerNode[];
};
