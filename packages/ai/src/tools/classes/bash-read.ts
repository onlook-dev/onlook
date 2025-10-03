import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class BashReadTool extends ClientTool {
    static readonly ALLOWED_BASH_READ_COMMANDS = z.enum([
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
    static readonly toolName = 'bash_read';
    static readonly description = 'Execute safe read-only bash commands';
    static readonly parameters = z.object({
        command: z
            .string()
            .describe('The read-only command to execute (no file modifications allowed)'),
        allowed_commands: z
            .array(BashReadTool.ALLOWED_BASH_READ_COMMANDS)
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
    static readonly icon = Icons.EyeOpen;

    async handle(args: z.infer<typeof BashReadTool.parameters>, editorEngine: EditorEngine): Promise<{
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
            const readOnlyCommands = args.allowed_commands || BashReadTool.ALLOWED_BASH_READ_COMMANDS.options;
            const commandParts = args.command.trim().split(/\s+/);
            const baseCommand = commandParts[0] || '';

            if (!readOnlyCommands.some((cmd: string) => baseCommand.includes(cmd))) {
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


    static getLabel(input?: z.infer<typeof BashReadTool.parameters>): string {
        if (input?.command) {
            return 'Reading with ' + (input.command.split(' ')[0] || '');
        }
        return 'Reading with bash';
    }
}