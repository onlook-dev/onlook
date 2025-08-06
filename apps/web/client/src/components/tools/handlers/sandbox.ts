import type { EditorEngine } from '@/components/store/editor/engine';
import {
    SANDBOX_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

export async function handleSandboxTool(args: z.infer<typeof SANDBOX_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        if (args.command === 'restart_dev_server') {
            const success = await editorEngine.sandbox.session.restartDevServer();
            if (success) {
                return 'Dev server restarted';
            } else {
                return 'Failed to restart dev server';
            }
        } else if (args.command === 'read_dev_server_logs') {
            const logs = await editorEngine.sandbox.session.readDevServerLogs();
            return logs;
        } else {
            throw new Error('Invalid command');
        }
    } catch (error) {
        console.error('Error handling sandbox tool:', error);
        throw new Error('Error handling sandbox tool');
    }
}