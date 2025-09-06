import { tool } from 'ai';
import { z } from 'zod';

export const CHECK_ERRORS_TOOL_NAME = 'check_errors';
export const CHECK_ERRORS_TOOL_PARAMETERS = z.object({});

export const checkErrorsTool = tool({
    description:
        'Check for terminal errors similar to chat errors. Lists all current terminal errors from the ErrorManager.',
    inputSchema: CHECK_ERRORS_TOOL_PARAMETERS,
});
