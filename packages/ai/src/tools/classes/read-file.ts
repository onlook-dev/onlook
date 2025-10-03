import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { getFileSystem } from '../shared/helpers/files';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class ReadFileTool extends ClientTool {
    static readonly toolName = 'read_file';
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
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.EyeOpen;

    async handle(args: z.infer<typeof ReadFileTool.parameters>, editorEngine: EditorEngine): Promise<{
        content: string;
        lines: number;
    }> {
        try {
            const fileSystem = await getFileSystem(args.branchId, editorEngine);
            let file = await fileSystem.readFile(args.file_path);
            if (typeof file !== 'string') {
                throw new Error(`Cannot read file ${args.file_path}: file is not text`);
            }

            const lines = file.split('\n');
            const totalLines = lines.length;

            if (args.offset || args.limit) {
                const start = Math.max(0, (args.offset || 1) - 1); // Convert to 0-based indexing
                const end = args.limit ? start + args.limit : lines.length;
                const selectedLines = lines.slice(start, end);

                return {
                    content: selectedLines.map((line: string, index: number) => `${start + index + 1}→${line}`).join('\n'),
                    lines: selectedLines.length,
                };
            }

            // Limit to 2000 lines by default to match Claude's behavior
            const maxLines = 2000;
            if (lines.length > maxLines) {
                const selectedLines = lines.slice(0, maxLines);
                return {
                    content: selectedLines.map((line: string, index: number) => `${index + 1}→${line}`).join('\n') + `\n... (truncated, showing first ${maxLines} of ${totalLines} lines)`,
                    lines: maxLines,
                };
            }

            return {
                content: lines.map((line: string, index: number) => `${index + 1}→${line}`).join('\n'),
                lines: lines.length,
            };
        } catch (error) {
            throw new Error(`Cannot read file ${args.file_path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    static getLabel(input?: z.infer<typeof ReadFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Reading file ' + (input.file_path.split('/').pop() || '');
        }
        return 'Reading file';
    }
}