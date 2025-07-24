import { Agent } from '@mastra/core/agent';
import type { MastraMemory } from '@mastra/core/memory';
import type { RuntimeContext } from '@mastra/core/runtime-context';
import { askToolSet, buildToolSet, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { memory } from '../memory';

export type OnlookAgentRuntimeContext = {
    chatType: ChatType;
}

export const onlookAgent = new Agent({
    name: 'Onlook Agent',
    instructions: ({ runtimeContext }: {
        runtimeContext: RuntimeContext<OnlookAgentRuntimeContext>
    }) => {
        const chatType = runtimeContext.get("chatType");
        let systemPrompt = "";

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
            provider: LLMProvider.ANTHROPIC,
            model: CLAUDE_MODELS.HAIKU,
        });
        return model;
    },
    tools: ({ runtimeContext }: {
        runtimeContext: RuntimeContext<{
            chatType: ChatType
        }>
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
    memory: memory as MastraMemory,
})