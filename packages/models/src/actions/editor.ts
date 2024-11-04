import { z } from 'zod';
import { InsertPos } from '../editor';

export const ChangeSchema = <T>(type: z.ZodType<T>) =>
    z.object({
        updated: type,
        original: type,
    });

const ActionTargetSchema = z.object({
    webviewId: z.string(),
    selector: z.string(),
    uuid: z.string(),
});

export const StyleActionTargetSchema = ActionTargetSchema.extend({
    change: ChangeSchema(z.string()),
});

export const GroupActionTargetSchema = ActionTargetSchema.extend({
    index: z.number(),
});

export const ActionElementLocationSchema = z.object({
    position: z.nativeEnum(InsertPos),
    targetSelector: z.string(),
    index: z.number(),
});

export const MoveActionLocationSchema = ActionElementLocationSchema.extend({
    originalIndex: z.number(),
});

const BaseActionElementSchema = z.object({
    selector: z.string(),
    tagName: z.string(),
    attributes: z.record(z.string(), z.string()),
    styles: z.record(z.string(), z.string()),
    textContent: z.string().optional(),
    uuid: z.string(),
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
    location: ActionElementLocationSchema,
    element: ActionElementSchema,
    editText: z.boolean().optional(),
    codeBlock: z.string().optional(),
});

export const RemoveElementActionSchema = z.object({
    type: z.literal('remove-element'),
    targets: z.array(ActionTargetSchema),
    location: ActionElementLocationSchema,
    element: ActionElementSchema,
    codeBlock: z.string().optional(),
});

export const MoveElementActionSchema = z.object({
    type: z.literal('move-element'),
    targets: z.array(ActionTargetSchema),
    location: MoveActionLocationSchema,
});

export const EditTextActionSchema = z.object({
    type: z.literal('edit-text'),
    targets: z.array(ActionTargetSchema),
    originalContent: z.string(),
    newContent: z.string(),
});

export const BaseGroupActionSchema = z.object({
    targets: z.array(GroupActionTargetSchema),
    location: ActionElementLocationSchema,
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

export type Change<T> = {
    updated: T;
    original: T;
};

export type ActionTarget = z.infer<typeof ActionTargetSchema>;
export type StyleActionTarget = z.infer<typeof StyleActionTargetSchema>;
export type GroupActionTarget = z.infer<typeof GroupActionTargetSchema>;
export type ActionElementLocation = z.infer<typeof ActionElementLocationSchema>;
export type MoveActionLocation = z.infer<typeof MoveActionLocationSchema>;
export type ActionElement = z.infer<typeof BaseActionElementSchema> & {
    children: ActionElement[];
};
export type UpdateStyleAction = z.infer<typeof UpdateStyleActionSchema>;
export type InsertElementAction = z.infer<typeof InsertElementActionSchema>;
export type RemoveElementAction = z.infer<typeof RemoveElementActionSchema>;
export type MoveElementAction = z.infer<typeof MoveElementActionSchema>;
export type EditTextAction = z.infer<typeof EditTextActionSchema>;
export type BaseGroupAction = z.infer<typeof BaseGroupActionSchema>;
export type GroupElementsAction = z.infer<typeof GroupElementsActionSchema>;
export type UngroupElementsAction = z.infer<typeof UngroupElementsActionSchema>;
export type Action = z.infer<typeof ActionSchema>;
