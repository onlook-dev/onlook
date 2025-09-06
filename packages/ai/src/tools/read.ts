import { tool } from 'ai';
import { z } from 'zod';

export const READ_FILE_TOOL_NAME = 'read_file';
export const READ_FILE_TOOL_PARAMETERS = z.object({
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
    branchId: z.string().min(1).describe('Branch ID to read the file from'),
});
export const readFileTool = tool({
    description:
        "Reads a file from the local filesystem. You can access any file directly by using this tool. By default, it reads up to 2000 lines starting from the beginning of the file. You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters. Results are returned using cat -n format, with line numbers starting at 1. Supports fuzzy path matching when exact paths are not found.",
    inputSchema: READ_FILE_TOOL_PARAMETERS,
});

export const LIST_FILES_TOOL_NAME = 'list_files';
export const LIST_FILES_TOOL_PARAMETERS = z.object({
    path: z
        .string()
        .optional()
        .describe(
            'The directory path to list files from. Can be absolute or relative. If not specified, uses current working directory. Supports fuzzy path matching if exact path is not found.',
        ),
    recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to list files recursively in subdirectories'),
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
    branchId: z.string().min(1).describe('Branch ID to list files from'),
});
export const listFilesTool = tool({
    description:
        'List files and directories in a specified path. Supports both absolute and relative paths with fuzzy matching. Can list recursively, filter by type, and exclude patterns. Returns file paths with type information (file/directory).',
    inputSchema: LIST_FILES_TOOL_PARAMETERS,
});
