import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class TerminalCommandTool extends ClientTool {
    static readonly toolName = 'terminal_command';
    static readonly description = 'Run any generic Linux Bash command in the terminal';
    static readonly parameters = z.object({
        command: z.string().describe('The command to run'),
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.Terminal;

    async handle(
        args: z.infer<typeof TerminalCommandTool.parameters>,
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

    static getLabel(input?: z.infer<typeof TerminalCommandTool.parameters>): string {
        return 'Terminal';
    }
}