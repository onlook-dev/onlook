import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class FuzzyEditFileTool extends ClientTool {
    static readonly name = 'fuzzy_edit_file';
    static readonly description = 'Edit a file using fuzzy matching and natural language instructions';
    static readonly parameters = z.object({
        file_path: z.string().describe('Path to the file to edit'),
        instructions: z.string().describe('Instructions for editing the file'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.Pencil;

    constructor(
        private handleImpl?: (input: z.infer<typeof FuzzyEditFileTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof FuzzyEditFileTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('FuzzyEditFileTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof FuzzyEditFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Editing ' + (input.file_path.split('/').pop() || '');
        }
        return 'Editing file';
    }
}