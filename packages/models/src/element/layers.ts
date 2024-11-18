import { z } from 'zod';

const LayerNodeSchema = z.object({
    domId: z.string(),
    instanceId: z.string().optional(),
    oid: z.string().optional(),
    textContent: z.string(),
    tagName: z.string(),
    isVisible: z.boolean(),
    component: z.string().optional(),
    children: z.array(z.string()).optional(),
    parent: z.string().optional(),
});

export type LayerNode = z.infer<typeof LayerNodeSchema>