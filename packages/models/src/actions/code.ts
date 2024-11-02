import { ActionElementLocationSchema, GroupActionTargetSchema, MoveActionLocationSchema } from './editor';
import { TemplateNodeSchema } from '../element/templateNode';
import { InsertPos } from '../editor';
import { z } from 'zod';

export enum CodeActionType {
    MOVE = 'move',
    INSERT = 'insert',
    REMOVE = 'remove',
    GROUP = 'group',
    UNGROUP = 'ungroup',
}

const BaseCodeActionSchema = z.object({
    type: z.literal(CodeActionType.MOVE),
    location: MoveActionLocationSchema,
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
    location: MoveActionLocationSchema.extend({
        originalIndex: z.number(),
    }),
    childTemplateNode: TemplateNodeSchema,
});

export const CodeEditTextSchema = z.object({
    selector: z.string(),
    content: z.string(),
});

const baseCodeInsertSchema = BaseCodeActionSchema.extend({
    type: z.literal(CodeActionType.INSERT),
    tagName: z.string(),
    attributes: z.record(z.string(), z.string()),
    textContent: z.string().optional(),
    codeBlock: z.string().optional(),
    location: MoveActionLocationSchema.extend({
        originalIndex: z.number().optional(),
    }),
});

export const CodeInsertSchema: z.ZodType<CodeInsert> = baseCodeInsertSchema.extend({
    children: z.lazy(() => CodeInsertSchema.array()),
});

export const CodeRemoveSchema = BaseCodeActionSchema.extend({
    type: z.literal(CodeActionType.REMOVE),
    codeBlock: z.string().optional(),
    location: MoveActionLocationSchema.extend({
        originalIndex: z.number().optional(),
    }),
});

export const CodeStyleSchema = z.object({
    selector: z.string(),
    styles: z.record(z.string(), z.string()),
});

const BaseGroupActionSchema = BaseCodeActionSchema.extend({
    location: ActionElementLocationSchema,
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
export type CodeInsert = z.infer<typeof baseCodeInsertSchema> & {
    children: CodeInsert[];
};
export type CodeRemove = z.infer<typeof CodeRemoveSchema>;
export type CodeStyle = z.infer<typeof CodeStyleSchema>;
export type CodeGroup = z.infer<typeof CodeGroupSchema>;
export type CodeUngroup = z.infer<typeof CodeUngroupSchema>;
export type CodeAction = z.infer<typeof CodeActionSchema>;
