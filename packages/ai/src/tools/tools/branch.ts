import { tool } from 'ai';
import { z } from 'zod';

export const LIST_BRANCHES_TOOL_NAME = 'list_branches';
export const listBranchesTool = tool({
    description: 'Get information about all available branches in the project',
    inputSchema: z.object({}),
});
