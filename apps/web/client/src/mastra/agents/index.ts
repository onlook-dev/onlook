import { Agent } from '@mastra/core/agent';
import type { RuntimeContext } from '@mastra/core/runtime-context';
import { askToolSet, buildToolSet, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, LLMProvider, OPENROUTER_MODELS } from '@onlook/models';
import { memory } from '../memory';

export const ONLOOK_AGENT_KEY = "onlookAgent";
export const CHAT_TYPE_KEY = "chatType";

export type OnlookAgentRuntimeContext = {
    chatType: ChatType;
}

export const onlookAgent = new Agent({
    name: 'Onlook Agent',
    instructions: ({ runtimeContext }: {
        runtimeContext: RuntimeContext<OnlookAgentRuntimeContext>
    }) => {
        const chatType = runtimeContext.get(CHAT_TYPE_KEY);
        let systemPrompt: string;

        switch (chatType) {
            case ChatType.CREATE:
                systemPrompt = getCreatePageSystemPrompt();
                break;
            case ChatType.ASK:
                systemPrompt = getAskModeSystemPrompt();
                break;
            case ChatType.EDIT:
            default:
                systemPrompt = getSystemPrompt();
                break;
        }

        return systemPrompt;
    },
    model: async () => {
        const { model } = await initModel({
            provider: LLMProvider.OPENROUTER,
            model: OPENROUTER_MODELS.CLAUDE_4_SONNET,
        });
        return model;
    },
    tools: ({ runtimeContext }: {
        runtimeContext: RuntimeContext<OnlookAgentRuntimeContext>
    }) => {
        const chatType = runtimeContext.get("chatType");
        switch (chatType) {
            case ChatType.ASK:
                return askToolSet;
            case ChatType.EDIT:
            default:
                return buildToolSet;
        }
    },
    memory,
})