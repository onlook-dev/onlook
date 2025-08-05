import { tool } from 'ai';
import { z } from 'zod';

export const ALLOWED_BASH_READ_COMMANDS = z.enum([
    'ls',
    'cat',
    'head',
    'tail',
    'grep',
    'find',
    'wc',
    'sort',
    'uniq',
    'du',
    'df',
    'ps',
    'top',
    'which',
    'whereis',
]);
export const BASH_READ_TOOL_NAME = 'bash_read';
export const BASH_READ_TOOL_PARAMETERS = z.object({
    command: z.string().describe('Read-only command to execute (no file modifications)'),
    allowed_commands: z
        .array(ALLOWED_BASH_READ_COMMANDS)
        .optional()
        .describe('Override allowed commands for this execution'),
    description: z.string().optional().describe('What the command does (5-10 words)'),
    timeout: z.number().max(600000).optional().describe('Optional timeout in milliseconds'),
});
export const bashReadTool = tool({
    description: 'Execute read-only bash commands for exploration and analysis',
    parameters: BASH_READ_TOOL_PARAMETERS,
});

export const ALLOWED_BASH_EDIT_COMMANDS = z.enum([
    'mkdir',
    'rm',
    'rmdir',
    'mv',
    'cp',
    'touch',
    'chmod',
    'chown',
    'ln',
    'git',
]);
export const BASH_EDIT_TOOL_NAME = 'bash_edit';
export const BASH_EDIT_TOOL_PARAMETERS = z.object({
    command: z.string().describe('Command that modifies files (mkdir, rm, mv, etc.)'),
    allowed_commands: z
        .array(ALLOWED_BASH_EDIT_COMMANDS)
        .optional()
        .describe('Override allowed commands for this execution'),
    description: z.string().optional().describe('What the command does (5-10 words)'),
    timeout: z.number().max(600000).optional().describe('Optional timeout in milliseconds'),
});
export const bashEditTool = tool({
    description: 'Execute file modification commands in a persistent shell session',
    parameters: BASH_EDIT_TOOL_PARAMETERS,
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
