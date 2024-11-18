import { z } from 'zod';

const BaseDomElementSchema = z.object({
    domId: z.string(),
    oid: z.string().optional(),
    webviewId: z.string(),
    instanceId: z.string().optional(),
    rect: z.instanceof(DOMRect),
});

export const ParentDomElementSchema = BaseDomElementSchema;

export const DomElementSchema = BaseDomElementSchema.extend({
    tagName: z.string(),
    styles: z.record(z.string(), z.string()),
    parent: ParentDomElementSchema.optional(),
});

export const TextDomElementSchema = DomElementSchema.extend({
    textContent: z.string(),
});

export const ElementPositionSchema = z.object({
    x: z.number(),
    y: z.number(),
});

export const DropElementPropertiesSchema = z.object({
    tagName: z.string(),
    styles: z.record(z.string(), z.string()),
    textContent: z.string().optional(),
});

export type DomElement = z.infer<typeof DomElementSchema>;
export type TextDomElement = z.infer<typeof TextDomElementSchema>;
export type ParentDomElement = z.infer<typeof ParentDomElementSchema>;
export type ElementPosition = z.infer<typeof ElementPositionSchema>;
export type DropElementProperties = z.infer<typeof DropElementPropertiesSchema>;

export * from './layers';
export * from './templateNode';

