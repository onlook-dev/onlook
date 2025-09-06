import type { EditorEngine } from '@/components/store/editor/engine';
import {
    SANDBOX_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

export async function handleSandboxTool(args: z.infer<typeof SANDBOX_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
        }

        if (args.command === 'restart_dev_server') {
            const success = await sandbox.session.restartDevServer();
            if (success) {
                return 'Dev server restarted';
            } else {
                return 'Failed to restart dev server';
            }
        } else if (args.command === 'read_dev_server_logs') {
            const logs = await sandbox.session.readDevServerLogs();
            return logs;
        } else {
            throw new Error('Invalid command');
        }
    } catch (error) {
        console.error('Error handling sandbox tool:', error);
        throw new Error('Error handling sandbox tool');
    }
}