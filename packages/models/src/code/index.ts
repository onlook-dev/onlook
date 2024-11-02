import { TemplateNodeSchema } from '../element/templateNode';
import { z } from 'zod';
import {
    CodeInsertSchema,
    CodeRemoveSchema,
    CodeMoveSchema,
    CodeGroupSchema,
    CodeUngroupSchema,
} from '../actions/code';

export const CodeDiffRequestSchema = z.object({
    selector: z.string(),
    templateNode: TemplateNodeSchema,
    attributes: z.record(z.string(), z.string()),
    textContent: z.string().optional(),
    overrideClasses: z.boolean().optional(),

    // Structural changes
    insertedElements: z.array(CodeInsertSchema),
    removedElements: z.array(CodeRemoveSchema),
    movedElements: z.array(CodeMoveSchema),
    groupElements: z.array(CodeGroupSchema),
    ungroupElements: z.array(CodeUngroupSchema),
});

export const CodeDiffSchema = z.object({
    original: z.string(),
    generated: z.string(),
    path: z.string(),
});

export type CodeDiffRequest = z.infer<typeof CodeDiffRequestSchema>;
export type CodeDiff = z.infer<typeof CodeDiffSchema>;
