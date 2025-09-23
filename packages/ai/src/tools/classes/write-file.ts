import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class WriteFileTool extends ClientTool {
    static readonly name = 'write_file';
    static readonly description = 'Write content to a new file or overwrite an existing file';
    static readonly parameters = z.object({
        file_path: z.string().describe('Path to the file to write'),
        content: z.string().describe('Content to write to the file'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.FilePlus;

    constructor(
        private handleImpl?: (input: z.infer<typeof WriteFileTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof WriteFileTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('WriteFileTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof WriteFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Writing file ' + (input.file_path.split('/').pop() || '');
        }
        return 'Writing file';
    }
}