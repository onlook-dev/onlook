import { z } from 'zod';
import { ActionLocationSchema, IndexActionLocationSchema } from './location';
import { ActionTargetSchema, GroupActionTargetSchema, StyleActionTargetSchema } from './target';

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

export const InsertElementActionSchema = z.object({
    type: z.literal('insert-element'),
    targets: z.array(ActionTargetSchema),
    location: ActionLocationSchema,
    element: ActionElementSchema,
    editText: z.boolean().nullable(),
    codeBlock: z.string().nullable(),
});

export const RemoveElementActionSchema = z.object({
    type: z.literal('remove-element'),
    targets: z.array(ActionTargetSchema),
    location: ActionLocationSchema,
    element: ActionElementSchema,
    codeBlock: z.string().nullable(),
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

export const BaseGroupActionSchema = z.object({
    targets: z.array(GroupActionTargetSchema),
    location: ActionLocationSchema,
    container: ActionElementSchema,
    webviewId: z.string(),
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
export type BaseGroupAction = z.infer<typeof BaseGroupActionSchema>;
export type GroupElementsAction = z.infer<typeof GroupElementsActionSchema>;
export type UngroupElementsAction = z.infer<typeof UngroupElementsActionSchema>;
