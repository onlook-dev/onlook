import { z } from 'zod';
import { GroupContainerSchema, PasteParamsSchema } from './action';
import { ActionLocationSchema, IndexActionLocationSchema } from './location';
import { ActionTargetSchema } from './target';

export enum CodeActionType {
    MOVE = 'move',
    INSERT = 'insert',
    REMOVE = 'remove',
    GROUP = 'group',
    UNGROUP = 'ungroup',
}

const BaseCodeActionSchema = z.object({
    type: z.nativeEnum(CodeActionType),
    location: ActionLocationSchema,
    oid: z.string(),
});

const BaseCodeInsertSchema = BaseCodeActionSchema.extend({
    type: z.literal(CodeActionType.INSERT),
    tagName: z.string(),
    attributes: z.record(z.string(), z.string()),
    textContent: z.string().nullable(),
    pasteParams: PasteParamsSchema.nullable(),
});

export const CodeInsertSchema: z.ZodType<CodeInsert> = BaseCodeInsertSchema.extend({
    children: z.lazy(() => CodeInsertSchema.array()),
});

export const CodeRemoveSchema = z.object({
    type: z.literal(CodeActionType.REMOVE),
    oid: z.string(),
});

export const CodeStyleSchema = z.object({
    oid: z.string(),
    styles: z.record(z.string(), z.string()),
});

export const CodeEditTextSchema = z.object({
    oid: z.string(),
    content: z.string(),
});

export const CodeMoveSchema = BaseCodeActionSchema.extend({
    type: z.literal(CodeActionType.MOVE),
    location: IndexActionLocationSchema,
});

const BaseCodeGroupSchema = z.object({
    oid: z.string(),
    container: GroupContainerSchema,
    children: z.array(ActionTargetSchema),
});

export const CodeGroupSchema = BaseCodeGroupSchema.extend({
    type: z.literal(CodeActionType.GROUP),
});

export const CodeUngroupSchema = BaseCodeGroupSchema.extend({
    type: z.literal(CodeActionType.UNGROUP),
});

export const CodeActionSchema = z.union([
    CodeMoveSchema,
    CodeInsertSchema,
    CodeRemoveSchema,
    CodeGroupSchema,
    CodeUngroupSchema,
]);

export type CodeMove = z.infer<typeof CodeMoveSchema>;
export type CodeEditText = z.infer<typeof CodeEditTextSchema>;
export type CodeInsert = z.infer<typeof BaseCodeInsertSchema> & { children: CodeInsert[] };
export type CodeRemove = z.infer<typeof CodeRemoveSchema>;
export type CodeStyle = z.infer<typeof CodeStyleSchema>;
export type CodeGroup = z.infer<typeof CodeGroupSchema>;
export type CodeUngroup = z.infer<typeof CodeUngroupSchema>;
export type CodeAction = z.infer<typeof CodeActionSchema>;
