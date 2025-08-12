import { trackEvent } from '@/utils/analytics/server';
import { ASK_TOOL_SET, BUILD_TOOL_SET, convertToStreamMessages, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, LLMProvider, OPENROUTER_MODELS, type ChatMessage, type ModelConfig } from '@onlook/models';
import { streamText } from 'ai';
import { type NextRequest } from 'next/server';
import { checkMessageLimit, decrementUsage, getSupabaseUser, incrementUsage, repairToolCall } from './helpers';

export async function POST(req: NextRequest) {
    try {
        const user = await getSupabaseUser(req);
        if (!user) {
            return new Response(JSON.stringify({
                error: 'Unauthorized, no user found. Please login again.',
                code: 401
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const usageCheckResult = await checkMessageLimit(req);
        if (usageCheckResult.exceeded) {
            trackEvent({
                distinctId: user.id,
                event: 'message_limit_exceeded',
                properties: {
                    usage: usageCheckResult.usage,
                },
            });
            return new Response(JSON.stringify({
                error: 'Message limit exceeded. Please upgrade to a paid plan.',
                code: 402,
                usage: usageCheckResult.usage,
            }), {
                status: 402,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return streamResponse(req);
    } catch (error: any) {
        console.error('Error in chat', error);
        return new Response(JSON.stringify({
            error: 'Internal Server Error',
            code: 500,
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const streamResponse = async (req: NextRequest) => {
    const { messages, maxSteps, chatType }: { messages: ChatMessage[], maxSteps: number, chatType: ChatType } = await req.json();

    // Updating the usage record and rate limit is done here to avoid
    // abuse in the case where a single user sends many concurrent requests.
    // If the call below fails, the user will not be penalized.
    let usageRecord: {
        usageRecordId: string | undefined;
        rateLimitId: string | undefined;
    } | null;
    if (chatType === ChatType.EDIT) {
        usageRecord = await incrementUsage(req);
    }

    const { model, providerOptions, headers } = await getModelFromType(chatType);
    const systemPrompt = await getSystemPromptFromType(chatType);
    const tools = await getToolSetFromType(chatType);
    const result = streamText({
        model,
        headers,
        tools,
        maxSteps,
        toolCallStreaming: true,
        messages: [
            {
                role: 'system',
                content: systemPrompt,
                providerOptions,
            },
            ...convertToStreamMessages(messages),
        ],
        experimental_repairToolCall: repairToolCall,
        onError: async (error) => {
            console.error('Error in chat', error);
            // if there was an error with the API, do not penalize the user
            await decrementUsage(req, usageRecord);
        }
    })

    return result.toDataStreamResponse(
        {
            getErrorMessage: errorHandler,
        }
    );
}

export function errorHandler(error: unknown) {
    try {
        console.error('Error in chat', error);
        if (!error) {
            return 'unknown error';
        }

        if (typeof error === 'string') {
            return error;
        }

        if (error instanceof Error) {
            return error.message;
        }
        return JSON.stringify(error);
    } catch (error) {
        console.error('Error in errorHandler', error);
        return 'unknown error';
    }
}

async function getModelFromType(chatType: ChatType) {
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
    return model;
}

async function getToolSetFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? ASK_TOOL_SET : BUILD_TOOL_SET;
}

async function getSystemPromptFromType(chatType: ChatType) {
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
}