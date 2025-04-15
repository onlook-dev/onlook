import { z } from 'zod';

export const DynamicTypeEnum = z.enum(['array', 'conditional', 'unknown']);
export type DynamicType = z.infer<typeof DynamicTypeEnum>;
export const CoreElementTypeEnum = z.enum(['component-root', 'body-tag']);
export type CoreElementType = z.infer<typeof CoreElementTypeEnum>;

const LayerNodeSchema = z.object({
    domId: z.string(),
    frameId: z.string(),
    instanceId: z.string().nullable(),
    oid: z.string().nullable(),
    textContent: z.string(),
    tagName: z.string(),
    isVisible: z.boolean(),
    dynamicType: DynamicTypeEnum.optional(),
    coreElementType: CoreElementTypeEnum.optional(),
    component: z.string().nullable(),
    children: z.array(z.string()).nullable(),
    parent: z.string().nullable(),
});

export type LayerNode = z.infer<typeof LayerNodeSchema>;
