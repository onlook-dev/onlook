import { createAnthropic } from '@ai-sdk/anthropic';
import { Agent } from '@mastra/core/agent';
import type { RuntimeContext } from '@mastra/core/runtime-context';
import { askToolSet, buildToolSet, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt } from '@onlook/ai';
import { ChatType } from '@onlook/models';

export const onlookAgent = new Agent({
    name: 'Onlook',
    instructions: ({ runtimeContext }: {
        runtimeContext: RuntimeContext<{
            chatType: ChatType
        }>
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
    model: () => {
        const anthropic = createAnthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        })
        return anthropic("claude-4-sonnet-20250514")
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
    }
})