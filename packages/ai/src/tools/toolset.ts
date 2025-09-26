import { type InferUITools } from 'ai';
// import { UserAgent } from '../agents/classes/user';
import { createToolSet } from './toolset-utils';
import { AgentType, ChatType } from '@onlook/models';
import { allTools, rootTools, userTools } from '../agents/tool-lookup';
// import { RootAgent } from '../agents';

export function getAvailableTools(agentType: AgentType, chatType: ChatType) {
    switch (agentType) {
        case AgentType.ROOT:
            return chatType === ChatType.ASK ? rootTools : rootTools;
        case AgentType.USER:
            return userTools;
        default:
            throw new Error(`Agent type ${agentType} not supported`);
    }
}

export const TOOLS_MAP = new Map(allTools.map(toolClass => [toolClass.toolName, toolClass]));
const allToolSet = createToolSet(allTools);

export type ChatTools = InferUITools<typeof allToolSet>;
