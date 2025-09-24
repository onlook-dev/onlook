import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class SearchReplaceEditTool extends ClientTool {
    static readonly name = 'search_replace_edit_file';
    static readonly description = 'Performs exact string replacements in files. The edit will FAIL if `old_string` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use `replace_all` to change every instance of `old_string`.'
    static readonly parameters = z.object({
        file_path: z.string().describe('Absolute path to file'),
        old_string: z.string().describe('Text to replace'),
        new_string: z.string().describe('Replacement text'),
        replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.Pencil;

    async handle(args: z.infer<typeof SearchReplaceEditTool.parameters>, editorEngine: EditorEngine): Promise<string> {
        try {
            const sandbox = editorEngine.branches.getSandboxById(args.branchId);
            if (!sandbox) {
                throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
            }
            const file = await sandbox.readFile(args.file_path);
            if (!file || file.type !== 'text') {
                throw new Error(`Cannot read file ${args.file_path}: file not found or not text`);
            }

            let newContent: string;
            if (args.replace_all) {
                newContent = file.content.replaceAll(args.old_string, args.new_string);
            } else {
                const firstIndex = file.content.indexOf(args.old_string);
                if (firstIndex === -1) {
                    throw new Error(`String not found in file: ${args.old_string}`);
                }

                const secondIndex = file.content.indexOf(args.old_string, firstIndex + args.old_string.length);
                if (secondIndex !== -1) {
                    throw new Error(`Multiple occurrences found. Use replace_all=true or provide more context.`);
                }

                newContent = file.content.replace(args.old_string, args.new_string);
            }

            const result = await sandbox.writeFile(args.file_path, newContent);
            if (!result) {
                throw new Error(`Failed to write file ${args.file_path}`);
            }

            return `File ${args.file_path} edited successfully`;
        } catch (error) {
            throw new Error(`Cannot edit file ${args.file_path}: ${error}`);
        }
    }


    getLabel(input?: z.infer<typeof SearchReplaceEditTool.parameters>): string {
        if (input?.file_path) {
            return 'Editing ' + (input.file_path.split('/').pop() || '');
        }
        return 'Editing file';
    }
}