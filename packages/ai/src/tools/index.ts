import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

export const LIST_FILES_TOOL_NAME = 'list_files';
export const LIST_FILES_TOOL_PARAMETERS = z.object({
    path: z
        .string()
        .describe(
            'The absolute path to the directory to get files from. This should be the root directory of the project.',
        ),
});
export const listFilesTool = tool({
    description: 'List all files in the current directory, including subdirectories',
    parameters: LIST_FILES_TOOL_PARAMETERS,
});

export const READ_FILES_TOOL_NAME = 'read_files';
export const READ_FILES_TOOL_PARAMETERS = z.object({
    paths: z.array(z.string()).describe('The absolute paths to the files to read'),
});

export const readFilesTool = tool({
    description: 'Read the contents of files',
    parameters: READ_FILES_TOOL_PARAMETERS,
});

export const ONLOOK_INSTRUCTIONS_TOOL_NAME = 'onlook_instructions';
export const onlookInstructionsTool = tool({
    description: 'Get the instructions for the Onlook AI',
    parameters: z.object({}),
});

export const chatToolSet: ToolSet = {
    [LIST_FILES_TOOL_NAME]: listFilesTool,
    [READ_FILES_TOOL_NAME]: readFilesTool,
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: onlookInstructionsTool,
};
