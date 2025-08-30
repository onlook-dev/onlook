import { tool } from 'ai';
import { z } from 'zod';

export const TYPECHECK_TOOL_NAME = 'typecheck';
export const TYPECHECK_TOOL_PARAMETERS = z.object({});

export const typecheckTool = tool({
    description:
        'Run this as the final command after all other commands, especially after every file edit, when type changes are suspected, and on new project creation, to ensure type safety across the project. If any type errors are found, the AI will attempt to fix them automatically.',
    parameters: TYPECHECK_TOOL_PARAMETERS,
});
