import { tool } from 'ai';
import { z } from 'zod';

export const BRANCH_ID_SCHEMA = z
    .string()
    .trim()
    .min(1)
    .describe('Branch ID to run the command in');

export const LIST_BRANCHES_TOOL_NAME = 'list_branches';
export const listBranchesTool = tool({
    description: 'Get information about all available branches in the project',
    inputSchema: z.object({}),
});
