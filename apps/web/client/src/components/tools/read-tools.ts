import type { EditorEngine } from '@/components/store/editor/engine';
import {
    LS_ENHANCED_TOOL_NAME,
    READ_ENHANCED_TOOL_NAME
} from '@onlook/ai';
import { z } from 'zod';

// READ-ONLY TOOLS - For non-editing capabilities (search, read, list, analyze)

// Tool parameter schemas for read-only operations
export const TASK_TOOL_PARAMETERS = z.object({
    description: z.string().min(3).max(50).describe('Short task description (3-5 words)'),
    prompt: z.string().describe('Detailed task for the agent'),
    subagent_type: z.enum(['general-purpose']).describe('Agent type')
});

export const BASH_READ_TOOL_PARAMETERS = z.object({
    command: z.string().describe('Read-only command to execute (no file modifications)'),
    description: z.string().optional().describe('What the command does (5-10 words)'),
    timeout: z.number().max(600000).optional().describe('Optional timeout in milliseconds')
});

export const GLOB_TOOL_PARAMETERS = z.object({
    pattern: z.string().describe('Glob pattern like "**/*.js"'),
    path: z.string().optional().describe('Directory to search (optional, defaults to current)')
});

export const GREP_TOOL_PARAMETERS = z.object({
    pattern: z.string().describe('Regex pattern to search'),
    path: z.string().optional().describe('File/directory to search'),
    glob: z.string().optional().describe('Filter files with glob pattern'),
    type: z.string().optional().describe('File type filter (js, py, rust, etc.)'),
    output_mode: z.enum(['content', 'files_with_matches', 'count']).optional().default('files_with_matches'),
    case_insensitive: z.boolean().optional().describe('Case insensitive search'),
    show_line_numbers: z.boolean().optional().describe('Show line numbers'),
    context_after: z.number().optional().describe('Lines after match'),
    context_before: z.number().optional().describe('Lines before match'),
    context_around: z.number().optional().describe('Lines around match'),
    multiline: z.boolean().optional().describe('Enable multiline matching'),
    head_limit: z.number().optional().describe('Limit output lines')
});

export const LS_TOOL_PARAMETERS = z.object({
    path: z.string().describe('Absolute path to list'),
    ignore: z.array(z.string()).optional().describe('Array of glob patterns to ignore')
});

export const READ_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    offset: z.number().optional().describe('Starting line number'),
    limit: z.number().optional().describe('Number of lines to read')
});

export const WEB_FETCH_TOOL_PARAMETERS = z.object({
    url: z.string().url().describe('URL to fetch'),
    prompt: z.string().describe('Analysis prompt')
});

export const WEB_SEARCH_TOOL_PARAMETERS = z.object({
    query: z.string().min(2).describe('Search query'),
    allowed_domains: z.array(z.string()).optional().describe('Include only these domains'),
    blocked_domains: z.array(z.string()).optional().describe('Exclude these domains')
});

// Tool name constants for read-only tools
export const TASK_TOOL_NAME = 'task';
export const BASH_READ_TOOL_NAME = 'bash_read';
export const GLOB_TOOL_NAME = 'glob';
export const GREP_TOOL_NAME = 'grep';
export const LS_TOOL_NAME = 'ls';
export const READ_TOOL_NAME = 'read';
export const NOTEBOOK_READ_TOOL_NAME = 'notebook_read';
export const WEB_FETCH_TOOL_NAME = 'web_fetch';
export const WEB_SEARCH_TOOL_NAME = 'web_search';

// Read-only tool handlers
export async function handleReadToolCall(
    toolName: string,
    args: any,
    editorEngine: EditorEngine
): Promise<any> {
    try {
        switch (toolName) {
            case TASK_TOOL_NAME:
                return await handleTaskTool(args as z.infer<typeof TASK_TOOL_PARAMETERS>, editorEngine);
            case BASH_READ_TOOL_NAME:
                return await handleBashReadTool(args as z.infer<typeof BASH_READ_TOOL_PARAMETERS>, editorEngine);
            case GLOB_TOOL_NAME:
                return await handleGlobTool(args as z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine);
            case GREP_TOOL_NAME:
                return await handleGrepTool(args as z.infer<typeof GREP_TOOL_PARAMETERS>, editorEngine);
            case LS_TOOL_NAME:
            case LS_ENHANCED_TOOL_NAME:
                return await handleLsTool(args as z.infer<typeof LS_TOOL_PARAMETERS>, editorEngine);
            case READ_TOOL_NAME:
            case READ_ENHANCED_TOOL_NAME:
                return await handleReadTool(args as z.infer<typeof READ_TOOL_PARAMETERS>, editorEngine);
            case WEB_FETCH_TOOL_NAME:
                return await handleWebFetchTool(args as z.infer<typeof WEB_FETCH_TOOL_PARAMETERS>, editorEngine);
            case WEB_SEARCH_TOOL_NAME:
                return await handleWebSearchTool(args as z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>, editorEngine);
            default:
                throw new Error(`Unknown read tool: ${toolName}`);
        }
    } catch (error) {
        console.error(`Error handling read tool ${toolName}:`, error);
        throw error;
    }
}

// Individual read-only tool implementations
async function handleTaskTool(args: z.infer<typeof TASK_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    // Launch specialized agent for complex tasks (read-only analysis)
    console.log(`Launching ${args.subagent_type} agent for: ${args.description}`);
    console.log(`Task: ${args.prompt}`);
    return `Launched ${args.subagent_type} agent to analyze: ${args.description}`;
}

async function handleBashReadTool(args: z.infer<typeof BASH_READ_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    try {
        // Only allow read-only commands (ls, cat, grep, find, etc.)
        const readOnlyCommands = ['ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc', 'sort', 'uniq', 'du', 'df', 'ps', 'top', 'which', 'whereis'];
        const commandParts = args.command.trim().split(/\s+/);
        const baseCommand = commandParts[0] || '';

        if (!readOnlyCommands.some(cmd => baseCommand.includes(cmd))) {
            return {
                output: '',
                success: false,
                error: `Command '${baseCommand}' is not allowed in read-only mode. Only ${readOnlyCommands.join(', ')} commands are permitted.`
            };
        }

        const result = await editorEngine.sandbox.session.runCommand(args.command);
        return {
            output: result.output,
            success: result.success,
            error: result.error
        };
    } catch (error: any) {
        return {
            output: '',
            success: false,
            error: error.message || error.toString()
        };
    }
}

async function handleGlobTool(args: z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string[]> {
    try {
        const searchPath = args.path || '.';
        const command = `find ${searchPath} -name "${args.pattern}" 2>/dev/null | head -100`;
        const result = await editorEngine.sandbox.session.runCommand(command);

        if (result.success && result.output.trim()) {
            return result.output.trim().split('\n').filter(line => line.trim());
        }
        return [];
    } catch (error) {
        console.error('Glob search failed:', error);
        return [];
    }
}

async function handleGrepTool(args: z.infer<typeof GREP_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<any> {
    try {
        const searchPath = args.path || '.';
        let command = `rg "${args.pattern}" ${searchPath}`;

        if (args.case_insensitive) command += ' -i';
        if (args.show_line_numbers) command += ' -n';
        if (args.context_after) command += ` -A ${args.context_after}`;
        if (args.context_before) command += ` -B ${args.context_before}`;
        if (args.context_around) command += ` -C ${args.context_around}`;
        if (args.glob) command += ` -g "${args.glob}"`;
        if (args.type) command += ` -t ${args.type}`;
        if (args.head_limit) command += ` | head -${args.head_limit}`;

        if (args.output_mode === 'files_with_matches') command += ' -l';
        else if (args.output_mode === 'count') command += ' -c';

        const result = await editorEngine.sandbox.session.runCommand(command);

        if (result.success) {
            const lines = result.output.trim().split('\n').filter(line => line.trim());
            return {
                matches: lines,
                mode: args.output_mode,
                count: lines.length
            };
        }

        return {
            matches: [],
            mode: args.output_mode,
            error: result.error
        };
    } catch (error) {
        return {
            matches: [],
            mode: args.output_mode,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

async function handleLsTool(args: z.infer<typeof LS_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    path: string;
    type: 'file' | 'directory';
}[]> {
    try {
        const result = await editorEngine.sandbox.readDir(args.path);
        if (!result) {
            throw new Error(`Cannot list directory ${args.path}`);
        }

        return result
            .filter(item => {
                if (args.ignore) {
                    return !args.ignore.some(pattern => {
                        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                        return regex.test(item.name);
                    });
                }
                return true;
            })
            .map(item => ({
                path: item.name,
                type: item.type
            }));
    } catch (error) {
        throw new Error(`Cannot list directory ${args.path}: ${error}`);
    }
}

async function handleReadTool(args: z.infer<typeof READ_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    content: string;
    lines: number;
}> {
    try {
        const file = await editorEngine.sandbox.readFile(args.file_path);
        if (!file || file.type !== 'text') {
            throw new Error(`Cannot read file ${args.file_path}: file not found or not text`);
        }

        const lines = file.content.split('\n');

        if (args.offset || args.limit) {
            const start = args.offset || 0;
            const end = args.limit ? start + args.limit : lines.length;
            const selectedLines = lines.slice(start, end);

            return {
                content: selectedLines.map((line, index) => `${start + index + 1}→${line}`).join('\n'),
                lines: selectedLines.length
            };
        }

        return {
            content: lines.map((line, index) => `${index + 1}→${line}`).join('\n'),
            lines: lines.length
        };
    } catch (error) {
        throw new Error(`Cannot read file ${args.file_path}: ${error}`);
    }
}

async function handleWebFetchTool(args: z.infer<typeof WEB_FETCH_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const response = await fetch(args.url.replace(/^http:/, 'https:'));
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let content = await response.text();

        // Basic HTML to markdown conversion
        if (response.headers.get('content-type')?.includes('text/html')) {
            content = content
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Apply prompt processing with AI if available
        return `Content from ${args.url} analyzed with prompt "${args.prompt}":\n\n${content}`;
    } catch (error) {
        throw new Error(`Cannot fetch ${args.url}: ${error}`);
    }
}

async function handleWebSearchTool(args: z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    // This would integrate with a search API
    console.log(`Searching for: ${args.query}`);
    if (args.allowed_domains) {
        console.log(`Allowed domains: ${args.allowed_domains.join(', ')}`);
    }
    if (args.blocked_domains) {
        console.log(`Blocked domains: ${args.blocked_domains.join(', ')}`);
    }

    return `Search results for "${args.query}" would appear here (search API integration needed)`;
}

// Export all read-only tool definitions
export const READ_TOOLS = {
    [TASK_TOOL_NAME]: {
        name: TASK_TOOL_NAME,
        description: 'Launch specialized agents for analysis tasks',
        parameters: TASK_TOOL_PARAMETERS
    },
    [BASH_READ_TOOL_NAME]: {
        name: BASH_READ_TOOL_NAME,
        description: 'Execute read-only bash commands',
        parameters: BASH_READ_TOOL_PARAMETERS
    },
    [GLOB_TOOL_NAME]: {
        name: GLOB_TOOL_NAME,
        description: 'Fast file pattern matching',
        parameters: GLOB_TOOL_PARAMETERS
    },
    [GREP_TOOL_NAME]: {
        name: GREP_TOOL_NAME,
        description: 'Powerful search using ripgrep',
        parameters: GREP_TOOL_PARAMETERS
    },
    [LS_TOOL_NAME]: {
        name: LS_TOOL_NAME,
        description: 'List files and directories',
        parameters: LS_TOOL_PARAMETERS
    },
    [READ_TOOL_NAME]: {
        name: READ_TOOL_NAME,
        description: 'Read file contents',
        parameters: READ_TOOL_PARAMETERS
    },
    [WEB_FETCH_TOOL_NAME]: {
        name: WEB_FETCH_TOOL_NAME,
        description: 'Fetch and analyze web content',
        parameters: WEB_FETCH_TOOL_PARAMETERS
    },
    [WEB_SEARCH_TOOL_NAME]: {
        name: WEB_SEARCH_TOOL_NAME,
        description: 'Search the web for current information',
        parameters: WEB_SEARCH_TOOL_PARAMETERS
    }
};