import type { EditorEngine } from '@/components/store/editor/engine';
import {
    ALLOWED_BASH_EDIT_COMMANDS,
    ALLOWED_BASH_READ_COMMANDS,
    BASH_EDIT_TOOL_PARAMETERS,
    BASH_READ_TOOL_PARAMETERS,
    GLOB_TOOL_PARAMETERS,
    GREP_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_PARAMETERS,
    TYPECHECK_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

export async function handleTerminalCommandTool(
    args: z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    const sandbox = editorEngine.branches.getSandboxById(args.branchId);
    if (!sandbox) {
        return {
            output: '',
            success: false,
            error: `Sandbox not found for branch ID: ${args.branchId}`
        };
    }
    return await sandbox.session.runCommand(args.command);
}

export async function handleBashReadTool(args: z.infer<typeof BASH_READ_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            return {
                output: '',
                success: false,
                error: `Sandbox not found for branch ID: ${args.branchId}`
            };
        }

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

        const result = await sandbox.session.runCommand(args.command);
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


export async function handleGrepTool(args: z.infer<typeof GREP_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<any> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            return {
                matches: [],
                mode: args.output_mode,
                error: `Sandbox not found for branch ID: ${args.branchId}`
            };
        }

        const searchPath = args.path || '.';
        
        // Build find command for file filtering with common exclusions
        let findCommand = `find "${searchPath}" -type f`;
        
        // Exclude common directories that should be ignored
        const excludeDirs = [
            'node_modules',
            '.next',
            '.git',
            'dist',
            'build',
            '.cache',
            'coverage',
            '.nyc_output',
            'tmp',
            'temp',
            '.temp',
            '.tmp',
            'logs',
            '*.log',
            '.DS_Store',
            'Thumbs.db'
        ];
        
        for (const excludeDir of excludeDirs) {
            findCommand += ` -not -path "*/${excludeDir}/*" -not -name "${excludeDir}"`;
        }
        
        // Add file filtering based on glob or type
        if (args.glob) {
            findCommand += ` -name "${args.glob}"`;
        } else if (args.type) {
            // Convert common file types to extensions
            const typeMap: Record<string, string> = {
                'js': '*.js',
                'ts': '*.ts',
                'jsx': '*.jsx',
                'tsx': '*.tsx',
                'py': '*.py',
                'java': '*.java',
                'go': '*.go',
                'rust': '*.rs',
                'cpp': '*.cpp',
                'c': '*.c',
                'html': '*.html',
                'css': '*.css',
                'json': '*.json',
                'xml': '*.xml',
                'yaml': '*.yaml',
                'yml': '*.yml'
            };
            const extension = typeMap[args.type] || `*.${args.type}`;
            findCommand += ` -name "${extension}"`;
        }

        // Build grep flags
        let grepFlags = '';
        if (args['-i']) grepFlags += ' -i';
        if (args['-n'] && args.output_mode === 'content') grepFlags += ' -n';
        if (args['-A'] && args.output_mode === 'content') grepFlags += ` -A ${args['-A']}`;
        if (args['-B'] && args.output_mode === 'content') grepFlags += ` -B ${args['-B']}`;
        if (args['-C'] && args.output_mode === 'content') grepFlags += ` -C ${args['-C']}`;

        // Set output mode flags
        if (args.output_mode === 'files_with_matches') {
            grepFlags += ' -l';
        } else if (args.output_mode === 'count') {
            grepFlags += ' -c';
        }

        // Handle multiline searching (limited support with traditional grep)
        let command: string;
        if (args.multiline) {
            // Use perl-style regex with grep -P if available, otherwise fall back to awk
            command = `${findCommand} -exec grep -P${grepFlags} -z "${args.pattern}" {} + || ${findCommand} -exec awk 'BEGIN{RS=""} /${args.pattern.replace(/'/g, "'\\''")}/ {print FILENAME ${args.output_mode === 'content' ? ': $0' : ''}}' {} +`;
        } else {
            // Standard grep with find - grep returns exit code 1 when no matches found
            command = `${findCommand} -exec grep${grepFlags} "${args.pattern}" {} +`;
        }

        // Apply head limit
        if (args.head_limit) {
            command += ` | head -${args.head_limit}`;
        }

        const result = await sandbox.session.runCommand(command, undefined, true);

        // Return raw output without post-processing
        return result.output || '';
    } catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
}

export async function handleBashEditTool(args: z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            return {
                output: '',
                success: false,
                error: `Sandbox not found for branch ID: ${args.branchId}`
            };
        }

        // Use allowed commands from parameter or default to all enum values
        const editCommands = args.allowed_commands || ALLOWED_BASH_EDIT_COMMANDS.options;
        const commandParts = args.command.trim().split(/\s+/);
        const baseCommand = commandParts[0] || '';

        const isEditCommand = editCommands.some(cmd => baseCommand.includes(cmd));
        if (!isEditCommand) {
            return {
                output: '',
                success: false,
                error: `Command '${baseCommand}' is not allowed in edit mode. Only ${editCommands.join(', ')} commands are permitted.`
            };
        }

        const result = await sandbox.session.runCommand(args.command);
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

export async function handleTypecheckTool(
    args: z.infer<typeof TYPECHECK_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            return {
                success: false,
                error: `Sandbox not found for branch ID: ${args.branchId}`
            };
        }

        // Run Next.js typecheck command
        const result = await sandbox.session.runCommand('bunx tsc --noEmit');

        if (result.success) {
            return {
                success: true
            };
        } else {
            return {
                success: false,
                error: result.error || result.output || 'Typecheck failed with unknown error'
            };
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message || error.toString()
        };
    }
}
