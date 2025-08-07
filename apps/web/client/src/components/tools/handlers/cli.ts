import type { EditorEngine } from '@/components/store/editor/engine';
import {
    ALLOWED_BASH_EDIT_COMMANDS,
    ALLOWED_BASH_READ_COMMANDS,
    BASH_EDIT_TOOL_PARAMETERS,
    BASH_READ_TOOL_PARAMETERS,
    GLOB_TOOL_PARAMETERS,
    GREP_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_PARAMETERS
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
    return await editorEngine.sandbox.session.runCommand(args.command);
}

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

export async function handleBashEditTool(args: z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    try {
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
