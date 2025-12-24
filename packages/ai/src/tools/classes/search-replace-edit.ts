import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { getFileSystem } from '../shared/helpers/files';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class SearchReplaceEditTool extends ClientTool {
    static readonly toolName = 'search_replace_edit_file';
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

            const fileSystem = await getFileSystem(args.branchId, editorEngine);
            const file = await fileSystem.readFile(args.file_path);
            if (typeof file !== 'string') {
                throw new Error(`Cannot read file ${args.file_path}: file is not text`);
            }

            let newContent: string;
            if (args.replace_all) {
                newContent = file.replaceAll(args.old_string, args.new_string);
            } else {
                const firstIndex = file.indexOf(args.old_string);
                if (firstIndex === -1) {
                    throw new Error(`String not found in file: ${args.old_string}`);
                }

                const secondIndex = file.indexOf(args.old_string, firstIndex + args.old_string.length);
                if (secondIndex !== -1) {
                    throw new Error(`Multiple occurrences found. Use replace_all=true or provide more context.`);
                }

                newContent = file.replace(args.old_string, args.new_string);
            }

            await fileSystem.writeFile(args.file_path, newContent);
            return `File ${args.file_path} edited successfully`;
        } catch (error) {
            throw new Error(`Cannot edit file ${args.file_path}: ${error}`);
        }
    }

    static getLabel(input?: z.infer<typeof SearchReplaceEditTool.parameters>): string {
        if (input?.file_path) {
            return 'Editing ' + (input.file_path.split('/').pop() || '');
        }
        return 'Editing file';
    }
}