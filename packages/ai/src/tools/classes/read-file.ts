import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { isCommandAvailable, resolvePath, safeRunCommand } from '../shared/helpers/files';
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
        resolved_path?: string;
    }> {
        try {
            const sandbox = editorEngine.branches.getSandboxById(args.branchId);
            if (!sandbox) {
                throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
            }

            // First try to resolve the path with fuzzy matching
            const resolved = await resolvePath(args.file_path, sandbox);
            let resolvedPath = resolved.path;
            const wasFuzzyMatch = resolved.wasFuzzy;

            if (!resolvedPath) {
                // If fuzzy matching fails, try the original path
                resolvedPath = args.file_path;
            }

            // Try reading with the resolved path first
            let file = await sandbox.readFile(resolvedPath);

            // If that fails and we have a different resolved path, provide helpful error
            if (!file && resolvedPath !== args.file_path) {
                throw new Error(`Cannot read file ${args.file_path}: file not found. Tried fuzzy match: ${resolvedPath} but it's also not readable.`);
            }

            if (!file) {
                // Try using terminal commands as fallback for better error messages
                const hasTestCommand = await isCommandAvailable(sandbox, 'test');

                if (hasTestCommand) {
                    const testResult = await safeRunCommand(sandbox, `test -f "${resolvedPath}" && echo "file_exists" || (test -e "${resolvedPath}" && echo "exists_not_file" || echo "not_found")`);

                    if (testResult.success) {
                        if (testResult.output.trim() === 'exists_not_file') {
                            throw new Error(`Cannot read file ${resolvedPath}: path exists but is not a file (might be a directory)`);
                        } else if (testResult.output.trim() === 'not_found') {
                            throw new Error(`Cannot read file ${resolvedPath}: file not found`);
                        }
                    }
                }

                throw new Error(`Cannot read file ${resolvedPath}: file not accessible`);
            }

            if (typeof file !== 'string') {
                // Try to read as binary and check if it's actually readable text
                const hasHeadCommand = await isCommandAvailable(sandbox, 'head');
                const hasCatCommand = await isCommandAvailable(sandbox, 'cat');
                const hasFileCommand = await isCommandAvailable(sandbox, 'file');

                if (hasHeadCommand && hasCatCommand) {
                    const catResult = await safeRunCommand(sandbox, `head -c 1000 "${resolvedPath}" | cat -v`);
                    if (catResult.success && catResult.output.length > 0) {
                        // If we can read some content with cat, it might be readable
                        let mimeType = 'unknown';
                        if (hasFileCommand) {
                            const fileTypeResult = await safeRunCommand(sandbox, `file -b --mime-type "${resolvedPath}"`);
                            mimeType = fileTypeResult.success ? fileTypeResult.output.trim() : 'unknown';
                        }
                        throw new Error(`Cannot read file ${resolvedPath}: file is not text (detected type: ${mimeType}). Use appropriate tools for binary files.`);
                    }
                }
                throw new Error(`Cannot read file ${resolvedPath}: file is not text`);
            }

            const lines = file.split('\n');
            const totalLines = lines.length;

            // Helper function to add fuzzy matching warning - only for actual fuzzy matches
            const addWarningIfNeeded = (content: string) => {
                if (wasFuzzyMatch) {
                    return `⚠️ Found: ${resolvedPath}\n\n` + content;
                }
                return content;
            };

            if (args.offset || args.limit) {
                const start = Math.max(0, (args.offset || 1) - 1); // Convert to 0-based indexing
                const end = args.limit ? start + args.limit : lines.length;
                const selectedLines = lines.slice(start, end);

                return {
                    content: addWarningIfNeeded(selectedLines.map((line: string, index: number) => `${start + index + 1}→${line}`).join('\n')),
                    lines: selectedLines.length,
                    resolved_path: wasFuzzyMatch ? resolvedPath : undefined
                };
            }

            // Limit to 2000 lines by default to match Claude's behavior
            const maxLines = 2000;
            if (lines.length > maxLines) {
                const selectedLines = lines.slice(0, maxLines);
                return {
                    content: addWarningIfNeeded(selectedLines.map((line: string, index: number) => `${index + 1}→${line}`).join('\n') + `\n... (truncated, showing first ${maxLines} of ${totalLines} lines)`),
                    lines: maxLines,
                    resolved_path: wasFuzzyMatch ? resolvedPath : undefined
                };
            }

            return {
                content: addWarningIfNeeded(lines.map((line: string, index: number) => `${index + 1}→${line}`).join('\n')),
                lines: lines.length,
                resolved_path: wasFuzzyMatch ? resolvedPath : undefined
            };
        } catch (error) {
            throw new Error(`Cannot read file ${args.file_path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    getLabel(input?: z.infer<typeof ReadFileTool.parameters>): string {
        if (input?.file_path) {
            return 'Reading file ' + (input.file_path.split('/').pop() || '');
        }
        return 'Reading file';
    }
}