import { type InferUITools } from 'ai';
import { createToolSet } from './toolset-utils';
import { AgentType, ChatType } from '@onlook/models';
import { allTools, readOnlyRootTools, rootTools, userTools } from '../agents/tool-lookup';

export function getAvailableTools(agentType: AgentType, chatType: ChatType) {
    switch (agentType) {
        case AgentType.ROOT:
            return chatType === ChatType.ASK ? readOnlyRootTools : rootTools;
        case AgentType.USER:
            return userTools;
        default:
            throw new Error(`Agent type ${agentType} not supported`);
    }
}

export const TOOLS_MAP = new Map(allTools.map(toolClass => [toolClass.toolName, toolClass]));
const allToolSet = createToolSet(allTools);

export type ChatTools = InferUITools<typeof allToolSet>;
