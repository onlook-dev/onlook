import { tool } from 'ai';
import { z } from 'zod';

export const ONLOOK_INSTRUCTIONS_TOOL_NAME = 'onlook_instructions';
export const onlookInstructionsTool = tool({
    description: 'Get the instructions for the Onlook AI',
    parameters: z.object({}),
});

export const READ_STYLE_GUIDE_TOOL_NAME = 'read_style_guide';
export const readStyleGuideTool = tool({
    description: 'Read the Tailwind config and global CSS file if available for the style guide',
    parameters: z.object({}),
});
