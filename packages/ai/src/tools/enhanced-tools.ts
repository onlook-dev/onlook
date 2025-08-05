import { tool } from 'ai';
import { z } from 'zod';

export const TASK_TOOL_NAME = 'task';
export const TASK_TOOL_PARAMETERS = z.object({
    description: z.string().min(3).max(50).describe('Short task description (3-5 words)'),
    prompt: z.string().describe('Detailed task for the agent'),
    subagent_type: z.enum(['general-purpose']).describe('Agent type'),
});
export const taskTool = tool({
    description: 'Launch specialized agents for analysis tasks',
    parameters: TASK_TOOL_PARAMETERS,
});

export const BASH_READ_TOOL_NAME = 'bash_read';
export const BASH_READ_TOOL_PARAMETERS = z.object({
    command: z.string().describe('Read-only command to execute (no file modifications)'),
    description: z.string().optional().describe('What the command does (5-10 words)'),
    timeout: z.number().max(600000).optional().describe('Optional timeout in milliseconds'),
});
export const bashReadTool = tool({
    description: 'Execute read-only bash commands for exploration and analysis',
    parameters: BASH_READ_TOOL_PARAMETERS,
});

export const GLOB_TOOL_NAME = 'glob';
export const GLOB_TOOL_PARAMETERS = z.object({
    pattern: z.string().describe('Glob pattern like "**/*.js"'),
    path: z.string().optional().describe('Directory to search (optional, defaults to current)'),
});
export const globTool = tool({
    description: 'Fast file pattern matching tool that works with any codebase size',
    parameters: GLOB_TOOL_PARAMETERS,
});

export const GREP_TOOL_NAME = 'grep';
export const GREP_TOOL_PARAMETERS = z.object({
    pattern: z.string().describe('Regex pattern to search'),
    path: z.string().optional().describe('File/directory to search'),
    glob: z.string().optional().describe('Filter files with glob pattern'),
    type: z.string().optional().describe('File type filter (js, py, rust, etc.)'),
    output_mode: z
        .enum(['content', 'files_with_matches', 'count'])
        .optional()
        .default('files_with_matches'),
    case_insensitive: z.boolean().optional().describe('Case insensitive search'),
    show_line_numbers: z.boolean().optional().describe('Show line numbers'),
    context_after: z.number().optional().describe('Lines after match'),
    context_before: z.number().optional().describe('Lines before match'),
    context_around: z.number().optional().describe('Lines around match'),
    multiline: z.boolean().optional().describe('Enable multiline matching'),
    head_limit: z.number().optional().describe('Limit output lines'),
});
export const grepTool = tool({
    description: 'Powerful search tool built on ripgrep with full regex syntax support',
    parameters: GREP_TOOL_PARAMETERS,
});

export const LS_TOOL_NAME = 'ls';
export const LS_TOOL_PARAMETERS = z.object({
    path: z.string().describe('Absolute path to list'),
    ignore: z.array(z.string()).optional().describe('Array of glob patterns to ignore'),
});
export const lsEnhancedTool = tool({
    description: 'List files and directories with advanced filtering options',
    parameters: LS_TOOL_PARAMETERS,
});

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

// EDIT TOOLS - Enhanced tools for file modification and editing capabilities

export const BASH_EDIT_TOOL_NAME = 'bash_edit';
export const BASH_EDIT_TOOL_PARAMETERS = z.object({
    command: z.string().describe('Command that modifies files (mkdir, rm, mv, etc.)'),
    description: z.string().optional().describe('What the command does (5-10 words)'),
    timeout: z.number().max(600000).optional().describe('Optional timeout in milliseconds'),
});
export const bashEditTool = tool({
    description: 'Execute file modification commands in a persistent shell session',
    parameters: BASH_EDIT_TOOL_PARAMETERS,
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

export const NOTEBOOK_EDIT_TOOL_NAME = 'notebook_edit';
export const NOTEBOOK_EDIT_TOOL_PARAMETERS = z.object({
    notebook_path: z.string().describe('Absolute path to .ipynb file'),
    new_source: z.string().describe('Cell content'),
    cell_id: z.string().optional().describe('Cell ID to edit'),
    cell_type: z.enum(['code', 'markdown']).optional().describe('Cell type'),
    edit_mode: z
        .enum(['replace', 'insert', 'delete'])
        .optional()
        .default('replace')
        .describe('Edit mode'),
});
export const notebookEditTool = tool({
    description: 'Edit Jupyter notebook cells with insert/delete/replace operations',
    parameters: NOTEBOOK_EDIT_TOOL_PARAMETERS,
});

export const TODO_WRITE_TOOL_NAME = 'todo_write';
export const TODO_WRITE_TOOL_PARAMETERS = z.object({
    todos: z
        .array(
            z.object({
                content: z.string().min(1).describe('Todo content'),
                status: z.enum(['pending', 'in_progress', 'completed']).describe('Todo status'),
                priority: z.enum(['high', 'medium', 'low']).describe('Todo priority'),
                id: z.string().describe('Todo ID'),
            }),
        )
        .describe('Array of todo objects'),
});
export const todoWriteTool = tool({
    description: 'Create and manage structured task lists for coding sessions',
    parameters: TODO_WRITE_TOOL_PARAMETERS,
});

export const EXIT_PLAN_MODE_TOOL_NAME = 'exit_plan_mode';
export const EXIT_PLAN_MODE_TOOL_PARAMETERS = z.object({
    plan: z.string().describe('Implementation plan in markdown'),
});
export const exitPlanModeTool = tool({
    description: 'Exit planning mode when ready to implement code',
    parameters: EXIT_PLAN_MODE_TOOL_PARAMETERS,
});
