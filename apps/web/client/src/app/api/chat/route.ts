import { trackEvent } from '@/utils/analytics/server';
import { convertToStreamMessages } from '@onlook/ai';
import { ChatType, type ChatMessage } from '@onlook/models';
import { streamText } from 'ai';
import { type NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { checkMessageLimit, decrementUsage, errorHandler, getModelFromType, getSupabaseUser, getSystemPromptFromType, getToolSetFromType, incrementUsage, repairToolCall } from './helperts';

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

        return streamResponse(req, user.id);
    } catch (error: unknown) {
        console.error('Error in chat', error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            code: 500,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const streamResponse = async (req: NextRequest, userId: string) => {
    const { messages, maxSteps, chatType, conversationId, projectId } = await req.json() as {
        messages: ChatMessage[],
        maxSteps: number,
        chatType: ChatType,
        conversationId: string,
        projectId: string,
    };

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

    const lastUserMessage = messages.findLast((message) => message.role === 'user');
    const traceId = lastUserMessage?.id ?? uuidv4();
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
