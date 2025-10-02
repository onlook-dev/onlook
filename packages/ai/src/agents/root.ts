import type { ToolCall } from '@ai-sdk/provider-utils';
import { ChatType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';
import { Experimental_Agent as Agent, stepCountIs, type ToolSet } from 'ai';
import { getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, getToolSetFromType, initModel } from '../index';

export const createRootAgent = ({
    chatType,
    conversationId,
    projectId,
    userId,
    traceId,
    repairToolCall,
}: {
    chatType: ChatType;
    conversationId: string;
    projectId: string;
    userId: string;
    traceId: string;
    repairToolCall: ({ toolCall, tools, error }: { toolCall: ToolCall<string, unknown>, tools: ToolSet, error: Error }) => Promise<{
        type: "tool-call";
        toolCallId: string;
        toolName: string;
        input: string;
    }>
}) => {
    const modelConfig = getModelFromType(chatType);
    const systemPrompt = getSystemPromptFromType(chatType);
    const toolSet = getToolSetFromType(chatType);
    return {
        agent: new Agent({
            model: modelConfig.model,
            system: systemPrompt,
            tools: toolSet,
            headers: modelConfig.headers,
            stopWhen: stepCountIs(20),
            experimental_repairToolCall: repairToolCall,
            experimental_telemetry: {
                isEnabled: true,
                metadata: {
                    conversationId,
                    projectId,
                    userId,
                    chatType: chatType,
                    tags: ['chat'],
                    langfuseTraceId: traceId,
                    sessionId: conversationId,
                },
            },
        }),
        modelConfig,
    }
}

const getSystemPromptFromType = (chatType: ChatType): string => {
    switch (chatType) {
        case ChatType.CREATE:
            return getCreatePageSystemPrompt();
        case ChatType.ASK:
            return getAskModeSystemPrompt();
        case ChatType.EDIT:
        default:
            return getSystemPrompt();
    }
}

const getModelFromType = (chatType: ChatType): ModelConfig => {
    switch (chatType) {
        case ChatType.CREATE:
        case ChatType.FIX:
            return initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
            });
        case ChatType.ASK:
        case ChatType.EDIT:
        default:
            return initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.CLAUDE_4_5_SONNET,
            });
    }
}