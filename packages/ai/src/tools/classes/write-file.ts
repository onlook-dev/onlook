import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class WriteFileTool extends ClientTool {
    static readonly toolName = 'write_file';
    static readonly description = 'Write content to a new file or overwrite an existing file';
    static readonly parameters = z.object({
        file_path: z.string().describe('Path to the file to write'),
        content: z.string().describe('Content to write to the file'),
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.FilePlus;

    async handle(args: z.infer<typeof WriteFileTool.parameters>, editorEngine: EditorEngine): Promise<string> {
        try {
            const sandbox = editorEngine.branches.getSandboxById(args.branchId);
            if (!sandbox) {
                throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
            }
            const result = await sandbox.writeFile(args.file_path, args.content);
            if (!result) {
                throw new Error(`Failed to write file ${args.file_path}`);
            }
            return `File ${args.file_path} written successfully`;
        } catch (error) {
            throw new Error(`Cannot write file ${args.file_path}: ${error}`);
        }
    }

    getLabel(input?: z.infer<typeof WriteFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Writing file ' + (input.file_path.split('/').pop() || '');
        }
        return 'Writing file';
    }
}