import { z } from 'zod';
import { InsertPos } from '../editor';
import { TemplateNodeSchema } from '../element/templateNode';
import { ActionElementLocationSchema, GroupActionTargetSchema, MoveActionLocationSchema } from './editor';

export enum CodeActionType {
    MOVE = 'move',
    INSERT = 'insert',
    REMOVE = 'remove',
    GROUP = 'group',
    UNGROUP = 'ungroup',
}

const BaseCodeActionSchema = z.object({
    type: z.nativeEnum(CodeActionType),
    location: ActionElementLocationSchema,
    uuid: z.string(),
});

export const IndexMoveLocationSchema = ActionElementLocationSchema.extend({
    position: z.literal(InsertPos.INDEX),
    targetSelector: z.string(),
    index: z.number(),
});

export const CodeMoveSchema = BaseCodeActionSchema.extend({
    selector: z.string(),
    type: z.literal(CodeActionType.MOVE),
    location: MoveActionLocationSchema,
    childTemplateNode: TemplateNodeSchema,
});

export const CodeEditTextSchema = z.object({
    selector: z.string(),
    content: z.string(),
});

const BaseCodeInsertSchema = BaseCodeActionSchema.extend({
    type: z.literal(CodeActionType.INSERT),
    tagName: z.string(),
    attributes: z.record(z.string(), z.string()),
    textContent: z.string().optional(),
    codeBlock: z.string().optional(),
});

export const CodeInsertSchema: z.ZodType<CodeInsert> = BaseCodeInsertSchema.extend({
    children: z.lazy(() => CodeInsertSchema.array()),
});

export const CodeRemoveSchema = BaseCodeActionSchema.extend({
    type: z.literal(CodeActionType.REMOVE),
    codeBlock: z.string().optional(),
});

export const CodeStyleSchema = z.object({
    selector: z.string(),
    styles: z.record(z.string(), z.string()),
});

const BaseGroupActionSchema = BaseCodeActionSchema.extend({
    container: CodeInsertSchema,
    targets: z.array(GroupActionTargetSchema),
});

export const CodeGroupSchema = BaseGroupActionSchema.extend({
    type: z.literal(CodeActionType.GROUP),
});

export const CodeUngroupSchema = BaseGroupActionSchema.extend({
    type: z.literal(CodeActionType.UNGROUP),
});

export const CodeActionSchema = z.union([
    CodeMoveSchema,
    CodeInsertSchema,
    CodeRemoveSchema,
    CodeGroupSchema,
    CodeUngroupSchema,
]);

export type IndexMoveLocation = z.infer<typeof IndexMoveLocationSchema>;
export type CodeMove = z.infer<typeof CodeMoveSchema>;
export type CodeEditText = z.infer<typeof CodeEditTextSchema>;
export type CodeInsert = z.infer<typeof BaseCodeInsertSchema> & {
    children: CodeInsert[];
};
export type CodeRemove = z.infer<typeof CodeRemoveSchema>;
export type CodeStyle = z.infer<typeof CodeStyleSchema>;
export type CodeGroup = z.infer<typeof CodeGroupSchema>;
export type CodeUngroup = z.infer<typeof CodeUngroupSchema>;
export type CodeAction = z.infer<typeof CodeActionSchema>;
