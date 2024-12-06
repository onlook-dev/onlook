import { z } from 'zod';

const BaseDomElementSchema = z.object({
    domId: z.string(),
    webviewId: z.string(),
    oid: z.string().nullable(),
    instanceId: z.string().nullable(),
    rect: z.instanceof(DOMRect),
});

export const ParentDomElementSchema = BaseDomElementSchema;

export const DomElementSchema = BaseDomElementSchema.extend({
    tagName: z.string(),
    styles: z.record(z.string(), z.string()),
    parent: ParentDomElementSchema.nullable(),
});

export const ElementPositionSchema = z.object({
    x: z.number(),
    y: z.number(),
});

export const DropElementPropertiesSchema = z.object({
    tagName: z.string(),
    styles: z.record(z.string(), z.string()),
    textContent: z.string().nullable(),
});

export type DomElement = z.infer<typeof DomElementSchema>;
export type ParentDomElement = z.infer<typeof ParentDomElementSchema>;
export type ElementPosition = z.infer<typeof ElementPositionSchema>;
export type DropElementProperties = z.infer<typeof DropElementPropertiesSchema>;
