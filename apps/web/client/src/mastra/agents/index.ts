import { env } from '@/env';
import { Agent } from '@mastra/core/agent';
import type { RuntimeContext } from '@mastra/core/runtime-context';
import { ASK_TOOL_SET, BUILD_TOOL_SET, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, CLAUDE_MODELS, LLMProvider, OPENROUTER_MODELS, type InitialModelPayload } from '@onlook/models';
import { memory } from '../memory';

const isProd = env.NODE_ENV === 'production';

const MainModelConfig: InitialModelPayload = isProd ? {
    provider: LLMProvider.OPENROUTER,
    model: OPENROUTER_MODELS.CLAUDE_4_SONNET,
} : {
    provider: LLMProvider.ANTHROPIC,
    model: CLAUDE_MODELS.SONNET_4,
};

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
        const { model } = await initModel(MainModelConfig);
        return model;
    },
    tools: ({ runtimeContext }: {
        runtimeContext: RuntimeContext<OnlookAgentRuntimeContext>
    }) => {
        const chatType = runtimeContext.get("chatType");
        switch (chatType) {
            case ChatType.ASK:
                return ASK_TOOL_SET;
            case ChatType.EDIT:
            default:
                return BUILD_TOOL_SET;
        }
    },
    memory,
})