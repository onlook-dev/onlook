import { z } from 'zod';
import {
    CodeGroupSchema,
    CodeInsertSchema,
    CodeMoveSchema,
    CodeRemoveSchema,
    CodeUngroupSchema,
} from '../actions/code';

export const CodeDiffRequestSchema = z.object({
    oid: z.string(),
    attributes: z.record(z.string(), z.string()),
    textContent: z.string().nullable(),
    overrideClasses: z.boolean().nullable(),

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
