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

export async function handleGlobTool(args: z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string[]> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            console.error(`Sandbox not found for branch ID: ${args.branchId}`);
            return [];
        }

        const searchPath = args.path || '.';

        // Use a more sophisticated glob pattern matching approach
        // Convert common glob patterns to find commands
        let command: string;
        const pattern = args.pattern;

        if (pattern.includes('**')) {
            // Recursive glob pattern
            const filePattern = pattern.split('**')[1]?.replace(/^\//, '') || '*';
            command = `find "${searchPath}" -type f -name "${filePattern}" 2>/dev/null | sort -t/ -k1,1 -k2,2n | head -1000`;
        } else if (pattern.includes('*')) {
            // Simple glob pattern
            command = `find "${searchPath}" -maxdepth 1 -type f -name "${pattern}" 2>/dev/null | sort | head -1000`;
        } else {
            // Exact filename
            command = `find "${searchPath}" -type f -name "${pattern}" 2>/dev/null | head -1000`;
        }

        const result = await sandbox.session.runCommand(command);

        if (result.success && result.output.trim()) {
            const files = result.output.trim().split('\n')
                .filter(line => line.trim())
                .map(line => line.trim());

            // Sort by modification time (newest first) if we have multiple files
            if (files.length > 1) {
                const statCommand = `stat -c "%Y %n" ${files.map(f => `"${f}"`).join(' ')} 2>/dev/null | sort -nr | cut -d' ' -f2-`;
                const statResult = await sandbox.session.runCommand(statCommand);
                if (statResult.success && statResult.output.trim()) {
                    return statResult.output.trim().split('\n').filter(line => line.trim());
                }
            }

            return files;
        }
        return [];
    } catch (error) {
        console.error('Glob search failed:', error);
        return [];
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
        let command = `rg "${args.pattern}"`;

        // Add path at the end
        command += ` "${searchPath}"`;

        // Add flags
        if (args['-i']) command += ' -i';
        if (args['-n'] && args.output_mode === 'content') command += ' -n';
        if (args['-A'] && args.output_mode === 'content') command += ` -A ${args['-A']}`;
        if (args['-B'] && args.output_mode === 'content') command += ` -B ${args['-B']}`;
        if (args['-C'] && args.output_mode === 'content') command += ` -C ${args['-C']}`;
        if (args.multiline) command += ' -U --multiline-dotall';
        if (args.glob) command += ` --glob "${args.glob}"`;
        if (args.type) command += ` --type ${args.type}`;

        // Set output mode
        if (args.output_mode === 'files_with_matches') {
            command += ' --files-with-matches';
        } else if (args.output_mode === 'count') {
            command += ' --count';
        }

        // Apply head limit at the end
        if (args.head_limit) {
            command += ` | head -${args.head_limit}`;
        }

        // Add null redirect for stderr to clean up output
        command += ' 2>/dev/null';

        const result = await sandbox.session.runCommand(command);

        if (result.success || result.output.trim()) {
            const output = result.output.trim();
            if (!output) {
                return {
                    matches: [],
                    mode: args.output_mode,
                    count: 0
                };
            }

            const lines = output.split('\n').filter(line => line.trim());

            // For count mode, return the actual counts with filenames
            if (args.output_mode === 'count') {
                return {
                    matches: lines,
                    mode: args.output_mode,
                    total_matches: lines.reduce((sum, line) => {
                        const match = line.match(/^(\d+):/);
                        return sum + (match?.[1] ? parseInt(match[1], 10) : 0);
                    }, 0)
                };
            }

            return {
                matches: lines,
                mode: args.output_mode,
                count: lines.length
            };
        }

        return {
            matches: [],
            mode: args.output_mode,
            error: result.error || 'No matches found'
        };
    } catch (error) {
        return {
            matches: [],
            mode: args.output_mode,
            error: error instanceof Error ? error.message : String(error)
        };
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
