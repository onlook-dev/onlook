import { z } from 'zod';
import { ActionLocationSchema, IndexActionLocationSchema } from './location';
import { ActionTargetSchema, StyleActionTargetSchema } from './target';

const BaseActionElementSchema = z.object({
    domId: z.string(),
    oid: z.string(),
    tagName: z.string(),
    attributes: z.record(z.string(), z.string()),
    styles: z.record(z.string(), z.string()),
    textContent: z.string().nullable(),
});

export const ActionElementSchema: z.ZodType<ActionElement> = BaseActionElementSchema.extend({
    children: z.lazy(() => ActionElementSchema.array()),
});

export const UpdateStyleActionSchema = z.object({
    type: z.literal('update-style'),
    targets: z.array(StyleActionTargetSchema),
    style: z.string(),
});

export const PasteParamsSchema = z.object({
    oid: z.string(),
    domId: z.string(),
    codeBlock: z.string().nullable(),
});

// Reversible insert and remove actions
const BaseInsertRemoveActionSchema = z.object({
    type: z.string(),
    targets: z.array(ActionTargetSchema),
    location: ActionLocationSchema,
    element: ActionElementSchema,
    editText: z.boolean().nullable(),
    pasteParams: PasteParamsSchema.nullable(),
});

export const InsertElementActionSchema = BaseInsertRemoveActionSchema.extend({
    type: z.literal('insert-element'),
});

export const RemoveElementActionSchema = BaseInsertRemoveActionSchema.extend({
    type: z.literal('remove-element'),
});

export const MoveElementActionSchema = z.object({
    type: z.literal('move-element'),
    targets: z.array(ActionTargetSchema),
    location: IndexActionLocationSchema,
});

export const EditTextActionSchema = z.object({
    type: z.literal('edit-text'),
    targets: z.array(ActionTargetSchema),
    originalContent: z.string(),
    newContent: z.string(),
});

export const GroupContainerSchema = z.object({
    domId: z.string(),
    oid: z.string(),
    tagName: z.string(),
    attributes: z.record(z.string(), z.string()),
});

// Reversible group and ungroup actions
export const BaseGroupActionSchema = z.object({
    parent: ActionTargetSchema,
    children: z.array(ActionTargetSchema),
    container: GroupContainerSchema,
});

export const GroupElementsActionSchema = BaseGroupActionSchema.extend({
    type: z.literal('group-elements'),
});

export const UngroupElementsActionSchema = BaseGroupActionSchema.extend({
    type: z.literal('ungroup-elements'),
});

export const ActionSchema = z.discriminatedUnion('type', [
    UpdateStyleActionSchema,
    InsertElementActionSchema,
    RemoveElementActionSchema,
    MoveElementActionSchema,
    EditTextActionSchema,
    GroupElementsActionSchema,
    UngroupElementsActionSchema,
]);

export type ActionElement = z.infer<typeof BaseActionElementSchema> & {
    children: ActionElement[];
};
export type Action = z.infer<typeof ActionSchema>;
export type UpdateStyleAction = z.infer<typeof UpdateStyleActionSchema>;
export type InsertElementAction = z.infer<typeof InsertElementActionSchema>;
export type RemoveElementAction = z.infer<typeof RemoveElementActionSchema>;
export type MoveElementAction = z.infer<typeof MoveElementActionSchema>;
export type EditTextAction = z.infer<typeof EditTextActionSchema>;
export type GroupElementsAction = z.infer<typeof GroupElementsActionSchema>;
export type UngroupElementsAction = z.infer<typeof UngroupElementsActionSchema>;
export type PasteParams = z.infer<typeof PasteParamsSchema>;
export type GroupContainer = z.infer<typeof GroupContainerSchema>;
