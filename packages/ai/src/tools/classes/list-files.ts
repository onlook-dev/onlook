import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class ListFilesTool extends ClientTool {
    static readonly name = 'list_files';
    static readonly description = 'List files and directories in a specified path. Supports both absolute and relative paths with fuzzy matching. Can filter by type and exclude patterns. Returns file paths with type information (file/directory). Only lists immediate children (non-recursive).';
    static readonly parameters = z.object({
        path: z
            .string()
            .optional()
            .describe(
                'The directory path to list files from. Can be absolute or relative. If not specified, uses current working directory. Supports fuzzy path matching if exact path is not found.',
            ),
        show_hidden: z
            .boolean()
            .optional()
            .default(false)
            .describe('Whether to include hidden files and directories (starting with .)'),
        file_types_only: z
            .boolean()
            .optional()
            .default(false)
            .describe('Whether to only return files (exclude directories)'),
        ignore: z
            .array(z.string())
            .optional()
            .describe('Array of glob patterns to ignore (e.g., ["node_modules", "*.log", ".git"])'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.ListBullet;

    constructor(
        private handleImpl?: (input: z.infer<typeof ListFilesTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof ListFilesTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('ListFilesTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof ListFilesTool.parameters>): string {
        if (input?.path) {
            return 'Reading directory ' + (input.path.split('/').pop() || '');
        }
        return 'Reading directory';
    }
}