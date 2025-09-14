import type { EditorEngine } from '@/components/store/editor/engine';
import {
    ALLOWED_BASH_EDIT_COMMANDS,
    ALLOWED_BASH_READ_COMMANDS,
    BASH_EDIT_TOOL_PARAMETERS,
    BASH_READ_TOOL_PARAMETERS,
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
