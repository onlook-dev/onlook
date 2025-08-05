import type { EditorEngine } from '@/components/store/editor/engine';
import {
    ALLOWED_BASH_READ_COMMANDS,
    BASH_READ_TOOL_PARAMETERS,
    GLOB_TOOL_PARAMETERS,
    GREP_TOOL_PARAMETERS,
    LS_TOOL_PARAMETERS,
    READ_TOOL_PARAMETERS,
    WEB_FETCH_TOOL_PARAMETERS,
    WEB_SEARCH_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

export async function handleBashReadTool(args: z.infer<typeof BASH_READ_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    try {
        // Use allowed commands from parameter or default to all enum values
        const readOnlyCommands = args.allowed_commands || ALLOWED_BASH_READ_COMMANDS.options;
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

export async function handleGlobTool(args: z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string[]> {
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

export async function handleGrepTool(args: z.infer<typeof GREP_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<any> {
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

export async function handleLsTool(args: z.infer<typeof LS_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
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

export async function handleReadTool(args: z.infer<typeof READ_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
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

export async function handleWebFetchTool(args: z.infer<typeof WEB_FETCH_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
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

export async function handleWebSearchTool(args: z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
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
