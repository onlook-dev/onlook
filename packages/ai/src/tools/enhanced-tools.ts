import { tool } from 'ai';
import { z } from 'zod';

export const READ_TOOL_NAME = 'read';
export const READ_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    offset: z.number().optional().describe('Starting line number'),
    limit: z.number().optional().describe('Number of lines to read'),
});
export const readEnhancedTool = tool({
    description: 'Read file contents with line numbers and range support',
    parameters: READ_TOOL_PARAMETERS,
});

export const WEB_FETCH_TOOL_NAME = 'web_fetch';
export const WEB_FETCH_TOOL_PARAMETERS = z.object({
    url: z.string().url().describe('URL to fetch'),
    prompt: z.string().describe('Analysis prompt'),
});
export const webFetchTool = tool({
    description: 'Fetch content from URLs and process with AI analysis',
    parameters: WEB_FETCH_TOOL_PARAMETERS,
});

export const WEB_SEARCH_TOOL_NAME = 'web_search';
export const WEB_SEARCH_TOOL_PARAMETERS = z.object({
    query: z.string().min(2).describe('Search query'),
    allowed_domains: z.array(z.string()).optional().describe('Include only these domains'),
    blocked_domains: z.array(z.string()).optional().describe('Exclude these domains'),
});
export const webSearchTool = tool({
    description: 'Search the web for up-to-date information',
    parameters: WEB_SEARCH_TOOL_PARAMETERS,
});

export const EDIT_TOOL_NAME = 'edit';
export const EDIT_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    old_string: z.string().describe('Text to replace'),
    new_string: z.string().describe('Replacement text'),
    replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
});
export const editEnhancedTool = tool({
    description: 'Make exact string replacements in files with precise matching',
    parameters: EDIT_TOOL_PARAMETERS,
});

export const MULTI_EDIT_TOOL_NAME = 'multi_edit';
export const MULTI_EDIT_TOOL_PARAMETERS = z.object({
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
export const multiEditTool = tool({
    description: 'Make multiple edits to a single file in one atomic operation',
    parameters: MULTI_EDIT_TOOL_PARAMETERS,
});

export const WRITE_TOOL_NAME = 'write';
export const WRITE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    content: z.string().describe('File content'),
});
export const writeEnhancedTool = tool({
    description: 'Write or overwrite file contents completely',
    parameters: WRITE_TOOL_PARAMETERS,
});
