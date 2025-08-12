import { tool } from 'ai';
import { z } from 'zod';

export const SANDBOX_TOOL_NAME = 'sandbox';
export const ALLOWED_SANDBOX_COMMANDS = z.enum(['restart_dev_server', 'read_dev_server_logs']);
export const SANDBOX_TOOL_PARAMETERS = z.object({
    command: ALLOWED_SANDBOX_COMMANDS.describe('The allowed command to run'),
});
export const sandboxTool = tool({
    description:
        'Restart the development server. This should only be used if absolutely necessary such as if updating dependencies, clearing next cache, or if the server is not responding.',
    inputSchema: SANDBOX_TOOL_PARAMETERS,
});
