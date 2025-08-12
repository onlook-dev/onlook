import { Agent } from '@mastra/core/agent';
import type { RuntimeContext } from '@mastra/core/runtime-context';
import { ASK_TOOL_SET, BUILD_TOOL_SET, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';

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
    model: async ({ runtimeContext }: {
        runtimeContext: RuntimeContext<OnlookAgentRuntimeContext>
    }) => {
        const chatType = runtimeContext.get(CHAT_TYPE_KEY);
        let model: ModelConfig;
        switch (chatType) {
            case ChatType.CREATE:
            case ChatType.FIX:
                model = await initModel({
                    provider: LLMProvider.OPENROUTER,
                    model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
                });
                break;
            case ChatType.ASK:
            case ChatType.EDIT:
            default:
                model = await initModel({
                    provider: LLMProvider.OPENROUTER,
                    model: OPENROUTER_MODELS.CLAUDE_4_SONNET,
                });
                break;
        }
        return model.model;
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
})