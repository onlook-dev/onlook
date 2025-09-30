import { tool } from 'ai';
import { z } from 'zod';
import { BRANCH_ID_SCHEMA } from './branch';

export const SEARCH_REPLACE_EDIT_FILE_TOOL_NAME = 'search_replace_edit_file';
export const SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    old_string: z.string().describe('Text to replace'),
    new_string: z.string().describe('Replacement text'),
    replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
    branchId: BRANCH_ID_SCHEMA,
});
export const searchReplaceEditFileTool = tool({
    description:
        'Performs exact string replacements in files. The edit will FAIL if `old_string` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use `replace_all` to change every instance of `old_string`.',
    inputSchema: SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
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
    branchId: BRANCH_ID_SCHEMA,
});
export const searchReplaceMultiEditFileTool = tool({
    description:
        'This is a tool for making multiple edits to a single file in one operation. It allows you to perform multiple find-and-replace operations efficiently. All edits are applied in sequence, in the order they are provided. Each edit operates on the result of the previous edit. All edits must be valid for the operation to succeed - if any edit fails, none will be applied.',
    inputSchema: SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS,
});

export const WRITE_FILE_TOOL_NAME = 'write_file';
export const WRITE_FILE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    content: z.string().describe('File content'),
    branchId: BRANCH_ID_SCHEMA,
});
export const writeFileTool = tool({
    description:
        'Writes a file to the local filesystem. This tool will overwrite the existing file if there is one at the provided path. ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.',
    inputSchema: WRITE_FILE_TOOL_PARAMETERS,
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
    branchId: BRANCH_ID_SCHEMA,
});
export const fuzzyEditFileTool = tool({
    description:
        'Edit the contents of a file with fuzzy matching instead of search and replace. This should be used as a fallback when the search and replace tool fails. It calls another agent to do the actual editing.',
    inputSchema: FUZZY_EDIT_FILE_TOOL_PARAMETERS,
});

export const VIEW_IMAGE_TOOL_NAME = 'view_image';
export const VIEW_IMAGE_TOOL_PARAMETERS = z.object({
    image_reference: z
        .string()
        .describe(
            'Reference to an image in the chat context (use the display name or index number)',
        ),
});
export const viewImageTool = tool({
    description:
        "Retrieves and views an image from the chat context for analysis. Use this tool when the user asks you to analyze, describe, or work with an image they've attached. The image data will be returned so you can see and analyze its contents. This does NOT save the image to the project.",
    inputSchema: VIEW_IMAGE_TOOL_PARAMETERS,
});

export const UPLOAD_IMAGE_TOOL_NAME = 'upload_image';
export const UPLOAD_IMAGE_TOOL_PARAMETERS = z.object({
    image_reference: z
        .string()
        .describe(
            'Reference to an image in the chat context (use the display name or index number)',
        ),
    destination_path: z
        .string()
        .optional()
        .describe('Destination path within the project (default: "public/assets/images")'),
    filename: z
        .string()
        .optional()
        .describe('Custom filename (without extension). If not provided, a UUID will be generated'),
    branchId: BRANCH_ID_SCHEMA,
});
export const uploadImageTool = tool({
    description:
        "Uploads an image from the chat context to the project's file system. Use this tool when the user asks you to save, add, or upload an image to their project. The image will be stored in the project's public directory and can be referenced in code. After uploading, you can use the file path in your code changes.",
    inputSchema: UPLOAD_IMAGE_TOOL_PARAMETERS,
});
