import { tool } from 'ai';
import { z } from 'zod';

export const TERMINAL_COMMAND_TOOL_NAME = 'terminal_command';
export const TERMINAL_COMMAND_TOOL_PARAMETERS = z.object({
    command: z.string().describe('The command to run'),
    branchId: z.string().describe('Branch ID to run the command in'),
});
export const terminalCommandTool = tool({
    description: 'Run any generic Linux Bash command in the terminal',
    inputSchema: TERMINAL_COMMAND_TOOL_PARAMETERS,
});

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
    command: z
        .string()
        .describe('The read-only command to execute (no file modifications allowed)'),
    allowed_commands: z
        .array(ALLOWED_BASH_READ_COMMANDS)
        .optional()
        .describe('Override allowed commands for this execution'),
    description: z
        .string()
        .optional()
        .describe('Clear, concise description of what this command does in 5-10 words'),
    timeout: z
        .number()
        .max(600000)
        .optional()
        .describe('Optional timeout in milliseconds (up to 600000ms / 10 minutes)'),
    branchId: z.string().describe('Branch ID to run the command in'),
});
export const bashReadTool = tool({
    description:
        'Executes read-only bash commands in a persistent shell session with optional timeout, ensuring proper handling and security measures. You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 120000ms (2 minutes).',
    inputSchema: BASH_READ_TOOL_PARAMETERS,
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
    command: z
        .string()
        .describe('The command to execute that modifies files (mkdir, rm, mv, cp, chmod, etc.)'),
    allowed_commands: z
        .array(ALLOWED_BASH_EDIT_COMMANDS)
        .optional()
        .describe('Override allowed commands for this execution'),
    description: z
        .string()
        .optional()
        .describe('Clear, concise description of what this command does in 5-10 words'),
    timeout: z
        .number()
        .max(600000)
        .optional()
        .describe('Optional timeout in milliseconds (up to 600000ms / 10 minutes)'),
    branchId: z.string().describe('Branch ID to run the command in'),
});
export const bashEditTool = tool({
    description:
        'Executes file modification commands in a persistent shell session with optional timeout, ensuring proper handling and security measures. You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 120000ms (2 minutes).',
    inputSchema: BASH_EDIT_TOOL_PARAMETERS,
});

export const GLOB_TOOL_NAME = 'glob';
export const GLOB_TOOL_PARAMETERS = z.object({
    pattern: z
        .string()
        .describe('The glob pattern to match files against (e.g., "**/*.js", "src/**/*.ts")'),
    path: z
        .string()
        .optional()
        .describe(
            'The directory to search in. If not specified, the current working directory will be used. Must be a valid directory path if provided.',
        ),
    branchId: z.string().describe('Branch ID to search files in'),
});
export const globTool = tool({
    description:
        'Fast file pattern matching tool that works with any codebase size. Supports glob patterns like "**/*.js" or "src/**/*.ts". Returns matching file paths sorted by modification time. Use this tool when you need to find files by name patterns.',
    inputSchema: GLOB_TOOL_PARAMETERS,
});

export const GREP_TOOL_NAME = 'grep';
export const GREP_TOOL_PARAMETERS = z.object({
    pattern: z.string().describe('The regular expression pattern to search for in file contents'),
    path: z
        .string()
        .optional()
        .describe('File or directory to search in (defaults to current working directory)'),
    glob: z
        .string()
        .optional()
        .describe('Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}")'),
    type: z
        .string()
        .optional()
        .describe(
            'File type to search (e.g., js, py, rust, go, java, etc.) More efficient than glob for standard file types',
        ),
    output_mode: z
        .enum(['content', 'files_with_matches', 'count'])
        .optional()
        .default('files_with_matches')
        .describe(
            'Output mode: "content" shows matching lines, "files_with_matches" shows file paths, "count" shows match counts',
        ),
    '-i': z.boolean().optional().describe('Case insensitive search'),
    '-n': z
        .boolean()
        .optional()
        .describe('Show line numbers in output (requires output_mode: "content")'),
    '-A': z
        .number()
        .optional()
        .describe('Number of lines to show after each match (requires output_mode: "content")'),
    '-B': z
        .number()
        .optional()
        .describe('Number of lines to show before each match (requires output_mode: "content")'),
    '-C': z
        .number()
        .optional()
        .describe(
            'Number of lines to show before and after each match (requires output_mode: "content")',
        ),
    multiline: z
        .boolean()
        .optional()
        .describe('Enable multiline mode where . matches newlines and patterns can span lines'),
    head_limit: z.number().optional().describe('Limit output to first N lines/entries'),
    branchId: z.string().describe('Branch ID to search files in'),
});
export const grepTool = tool({
    description:
        'A powerful search tool built on ripgrep. Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+"). Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust"). Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts.',
    inputSchema: GREP_TOOL_PARAMETERS,
});
export const TYPECHECK_TOOL_NAME = 'typecheck';
export const TYPECHECK_TOOL_PARAMETERS = z.object({
    branchId: z.string().describe('Branch ID to run typecheck in'),
});
export const typecheckTool = tool({
    description: 'Run this as the final command after code edits, when type changes are suspected.',
    inputSchema: TYPECHECK_TOOL_PARAMETERS,
});
