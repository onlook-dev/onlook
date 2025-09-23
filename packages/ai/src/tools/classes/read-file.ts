import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class ReadFileTool extends ClientTool {
    static readonly name = 'read_file';
    static readonly description = "Reads a file from the local filesystem. You can access any file directly by using this tool. By default, it reads up to 2000 lines starting from the beginning of the file. You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters. Results are returned using cat -n format, with line numbers starting at 1. Supports fuzzy path matching when exact paths are not found.";
    static readonly parameters = z.object({
        file_path: z
            .string()
            .min(1)
            .describe(
                'The absolute path to the file to read. Supports fuzzy path matching if exact path is not found.',
            ),
        offset: z
            .number()
            .optional()
            .describe(
                'The line number to start reading from. Only provide if the file is too large to read at once',
            ),
        limit: z
            .number()
            .optional()
            .describe(
                'The number of lines to read. Only provide if the file is too large to read at once.',
            ),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.EyeOpen;

    constructor(
        private handleImpl?: (input: z.infer<typeof ReadFileTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof ReadFileTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('ReadFileTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof ReadFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Reading file ' + (input.file_path.split('/').pop() || '');
        }
        return 'Reading file';
    }
}