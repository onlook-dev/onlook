import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class BashEditTool extends ClientTool {
    static readonly ALLOWED_BASH_EDIT_COMMANDS = z.enum([
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
    static readonly toolName = 'bash_edit';
    static readonly description = 'Execute bash commands for file editing and system operations';
    static readonly parameters = z.object({
        command: z
            .string()
            .describe('The command to execute that modifies files (mkdir, rm, mv, cp, chmod, etc.)'),
        allowed_commands: z
            .array(BashEditTool.ALLOWED_BASH_EDIT_COMMANDS)
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
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.Terminal;

    async handle(args: z.infer<typeof BashEditTool.parameters>, editorEngine: EditorEngine): Promise<{
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
            const editCommands = args.allowed_commands || BashEditTool.ALLOWED_BASH_EDIT_COMMANDS.options;
            const commandParts = args.command.trim().split(/\s+/);
            const baseCommand = commandParts[0] || '';

            const isEditCommand = editCommands.some((cmd: string) => baseCommand.includes(cmd));
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

    static getLabel(input?: z.infer<typeof BashEditTool.parameters>): string {
        if (input?.command) {
            return 'Running command ' + (input.command.split('/').pop() || '');
        } else {
            return 'Running command';
        }
    }
}