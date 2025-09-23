import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class SearchReplaceMultiEditFileTool extends ClientTool {
    static readonly name = 'search_replace_multi_edit_file';
    static readonly description = 'Perform multiple search and replace operations in a file';
    static readonly parameters = z.object({
        file_path: z.string().describe('Path to the file to edit'),
        edits: z.array(z.object({
            old_string: z.string().describe('Text to search for'),
            new_string: z.string().describe('Text to replace with'),
            replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
        })).describe('Array of search and replace operations'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.Pencil;

    constructor(
        private handleImpl?: (input: z.infer<typeof SearchReplaceMultiEditFileTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof SearchReplaceMultiEditFileTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('SearchReplaceMultiEditFileTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof SearchReplaceMultiEditFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Editing ' + (input.file_path.split('/').pop() || '');
        }
        return 'Editing files';
    }
}