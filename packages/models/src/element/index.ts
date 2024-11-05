import { z } from 'zod';

const BaseDomElementSchema = z.object({
    selector: z.string(),
    rect: z.instanceof(DOMRect),
    encodedTemplateNode: z.string().optional(),
    uuid: z.string(),
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

export const WebViewElementSchema = DomElementSchema.extend({
    webviewId: z.string(),
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
export type WebViewElement = z.infer<typeof WebViewElementSchema>;
export type ElementPosition = z.infer<typeof ElementPositionSchema>;
export type DropElementProperties = z.infer<typeof DropElementPropertiesSchema>;

export * from './layers';
export * from './templateNode';

