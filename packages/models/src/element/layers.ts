import { z } from 'zod';

const LayerNodeSchema = z.object({
    domId: z.string(),
    webviewId: z.string(),
    instanceId: z.string().nullable(),
    oid: z.string().nullable(),
    textContent: z.string(),
    tagName: z.string(),
    isVisible: z.boolean(),
    component: z.string().nullable(),
    children: z.array(z.string()).nullable(),
    parent: z.string().nullable(),
});

export type LayerNode = z.infer<typeof LayerNodeSchema>;
