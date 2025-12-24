import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { getFileSystem } from '../shared/helpers/files';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class SearchReplaceMultiEditFileTool extends ClientTool {
    static readonly toolName = 'search_replace_multi_edit_file';
    static readonly description = 'Perform multiple search and replace operations in a file';
    static readonly parameters = z.object({
        file_path: z.string().describe('Absolute path to file'),
        edits: z
            .array(
                z.object({
                    old_string: z.string().describe('Text to replace'),
                    new_string: z.string().describe('Replacement text'),
                    replace_all: z
                        .boolean()
                        .optional()
                        .default(false)
                        .describe('Replace all occurrences'),
                }),
            )
            .describe('Array of edit operations'),
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.Pencil;

    async handle(args: z.infer<typeof SearchReplaceMultiEditFileTool.parameters>, editorEngine: EditorEngine): Promise<string> {
        try {
            const fileSystem = await getFileSystem(args.branchId, editorEngine);
            const file = await fileSystem.readFile(args.file_path);
            if (typeof file !== 'string') {
                throw new Error(`Cannot read file ${args.file_path}: file is not text`);
            }

            const originalContent = file;
            let content = originalContent;

            // Validate only the first non-replace_all edit against original content
            // Sequential edits will be validated during application
            let tempContent = originalContent;
            for (const edit of args.edits) {
                if (!edit.replace_all) {
                    const firstIndex = tempContent.indexOf(edit.old_string);
                    if (firstIndex === -1) {
                        throw new Error(`String not found in file: ${edit.old_string}`);
                    }

                    const secondIndex = tempContent.indexOf(edit.old_string, firstIndex + edit.old_string.length);
                    if (secondIndex !== -1) {
                        throw new Error(`Multiple occurrences found for "${edit.old_string}". Use replace_all=true or provide more context.`);
                    }

                    // Simulate the edit for next validation
                    tempContent = tempContent.replace(edit.old_string, edit.new_string);
                } else {
                    tempContent = tempContent.replaceAll(edit.old_string, edit.new_string);
                }
            }

            // Apply edits sequentially in the order provided
            // Each edit operates on the result of the previous edit
            for (const edit of args.edits) {
                if (edit.replace_all) {
                    content = content.replaceAll(edit.old_string, edit.new_string);
                } else {
                    const index = content.indexOf(edit.old_string);
                    if (index === -1) {
                        throw new Error(`String not found in file after previous edits: ${edit.old_string}`);
                    }
                    content = content.replace(edit.old_string, edit.new_string);
                }
            }

            await fileSystem.writeFile(args.file_path, content);
            return `File ${args.file_path} edited with ${args.edits.length} changes`;
        } catch (error) {
            throw new Error(`Cannot multi-edit file ${args.file_path}: ${(error as Error).message}`);
        }
    }

    static getLabel(input?: z.infer<typeof SearchReplaceMultiEditFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Editing ' + (input.file_path.split('/').pop() || '');
        }
        return 'Editing files';
    }
}