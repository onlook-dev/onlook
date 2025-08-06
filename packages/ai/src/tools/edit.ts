import { tool } from 'ai';
import { z } from 'zod';

export const SEARCH_REPLACE_EDIT_FILE_TOOL_NAME = 'search_replace_edit_file';
export const SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    old_string: z.string().describe('Text to replace'),
    new_string: z.string().describe('Replacement text'),
    replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
});
export const searchReplaceEditFileTool = tool({
    description: 'Make exact string replacements in files with precise matching',
    parameters: SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
});

export const SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME = 'search_replace_multi_edit_file';
export const SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    edits: z
        .array(
            z.object({
                old_string: z.string().describe('Text to replace'),
                new_string: z.string().describe('Replacement text'),
                replace_all: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe('Replace all occurrences'),
            }),
        )
        .describe('Array of edit operations'),
});
export const searchReplaceMultiEditFileTool = tool({
    description: 'Make multiple edits to a single file in one atomic operation',
    parameters: SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS,
});

export const WRITE_FILE_TOOL_NAME = 'write_file';
export const WRITE_FILE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    content: z.string().describe('File content'),
});
export const writeFileTool = tool({
    description: 'Write or overwrite file contents completely',
    parameters: WRITE_FILE_TOOL_PARAMETERS,
});

export const FUZZY_EDIT_FILE_TOOL_NAME = 'fuzzy_edit_file';
export const FUZZY_EDIT_FILE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('The absolute path to the file to edit'),
    content: z.string()
        .describe(`The edit to the file. You only need to include the parts of the code that are being edited instead of the entire file. A smaller model will handle implementing the rest of the code. You must leave comments to indicate the parts of the code that are not being edited such as:
// ... existing code
const foo = 'bar';
// ... existing code
Make sure there's enough context for the other model to understand where the changes are being made.`),
    instruction: z
        .string()
        .describe(
            'A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist another model in applying the edit. Use the first person to describe what you are going to do. Use it to disambiguate uncertainty in the edit.',
        ),
});
export const fuzzyEditFileTool = tool({
    description:
        'Edit the contents of a file with fuzzy matching instead of search and replace. This should be used as a fallback when the search and replace tool fails. It calls another agent to do the actual editing.',
    parameters: FUZZY_EDIT_FILE_TOOL_PARAMETERS,
});
