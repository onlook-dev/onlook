import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class SearchReplaceEditTool extends ClientTool {
    static readonly name = 'search_replace_edit_file';
    static readonly description = 'Performs exact string replacements in files. The edit will FAIL if `old_string` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use `replace_all` to change every instance of `old_string`.';
    static readonly parameters = z.object({
        file_path: z.string().describe('Absolute path to file'),
        old_string: z.string().describe('Text to replace'),
        new_string: z.string().describe('Replacement text'),
        replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.Pencil;

    constructor(
        private handleImpl?: (input: z.infer<typeof SearchReplaceEditTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof SearchReplaceEditTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('SearchReplaceEditTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof SearchReplaceEditTool.parameters>): string {
        if (input?.file_path) {
            return 'Editing ' + (input.file_path.split('/').pop() || '');
        }
        return 'Editing file';
    }
}