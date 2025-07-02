import { tool } from 'ai';
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

export const EDIT_FILE_TOOL_NAME = 'edit_file';
export const EDIT_FILE_TOOL_PARAMETERS = z.object({
    path: z.string().describe('The absolute path to the file to edit'),
    content: z.string()
        .describe(`The edit to the file. You only need to include the parts of the code that are being edited instead of the entire file. A smaller model will handle implementing the rest of the code. You must leave comments to indicate the parts of the code that are not being edited such as:
// ... existing code
const foo = 'bar';
// ... existing code
Make sure there's enough context for the smaller model to understand where the changes are being made.`),
    instruction: z
        .string()
        .describe(
            'A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist a smaller model in applying the edit. Use the first person to describe what you are going to do. Use it to disambiguate uncertainty in the edit.',
        ),
});

export const editFileTool = tool({
    description: 'Edit the contents of a file',
    parameters: EDIT_FILE_TOOL_PARAMETERS,
});

export const CREATE_FILE_TOOL_NAME = 'create_file';
export const CREATE_FILE_TOOL_PARAMETERS = z.object({
    path: z.string().describe('The absolute path to the file to create'),
    content: z.string().describe('The content of the file'),
});
export const createFileTool = tool({
    description: 'Create a new file',
    parameters: CREATE_FILE_TOOL_PARAMETERS,
});

export const TERMINAL_COMMAND_TOOL_NAME = 'terminal_command';
export const TERMINAL_COMMAND_TOOL_PARAMETERS = z.object({
    command: z.string().describe('The command to run'),
});
export const terminalCommandTool = tool({
    description: 'Run a Bash command in the terminal',
    parameters: TERMINAL_COMMAND_TOOL_PARAMETERS,
});
