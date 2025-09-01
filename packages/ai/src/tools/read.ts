import { tool } from 'ai';
import { z } from 'zod';

export const READ_FILE_TOOL_NAME = 'read_file';
export const READ_FILE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    offset: z.number().optional().describe('Starting line number'),
    limit: z.number().optional().describe('Number of lines to read'),
});
export const readFileTool = tool({
    description: 'Read file contents with line numbers and range support',
    inputSchema: READ_FILE_TOOL_PARAMETERS,
});

export const LIST_FILES_TOOL_NAME = 'list_files';
export const LIST_FILES_TOOL_PARAMETERS = z.object({
    path: z.string().describe('The absolute path to the directory to get files from.'),
    ignore: z.array(z.string()).optional().describe('Array of glob patterns to ignore'),
});
export const listFilesTool = tool({
    description: 'List all files in the current directory, including subdirectories',
    inputSchema: LIST_FILES_TOOL_PARAMETERS,
});
