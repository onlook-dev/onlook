import { api } from '@/trpc/server';
import { trackEvent } from '@/utils/analytics/server';
import { RootAgent } from '@onlook/ai';
import { toDbMessage } from '@onlook/db';
import { ChatType, type ChatMessage } from '@onlook/models';
import { type NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { checkMessageLimit, decrementUsage, errorHandler, getSupabaseUser, incrementUsage, repairToolCall } from './helpers';

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
    const body = await req.json();
    const { messages, chatType, conversationId, projectId } = body as {
        messages: ChatMessage[],
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
    } | null = null;

    try {
        const lastUserMessage = messages.findLast((message) => message.role === 'user');
        const traceId = lastUserMessage?.id ?? uuidv4();

        if (chatType === ChatType.EDIT) {
            usageRecord = await incrementUsage(req, traceId);
        }

        // Create RootAgent instance
        const agent = new RootAgent(chatType);

        return agent.streamTextWithMetadata(messages, conversationId, {
            streamTextConfig: {
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
                    console.error('Error in chat stream call', error);
                    // if there was an error with the API, do not penalize the user
                    await decrementUsage(req, usageRecord);

                    // Ensure the stream stops on error by re-throwing
                    if (error instanceof Error) {
                        throw error;
                    } else {
                        const errorMessage = typeof error === 'string' ? error : JSON.stringify(error);
                        throw new Error(errorMessage);
                    }
                },
            },
            toUIMessageStreamResponseConfig: {
                onFinish: async ({ messages: finalMessages }) => {
                    const messagesToStore = finalMessages
                        .filter(msg =>
                            (msg.role === 'user' || msg.role === 'assistant')
                        )
                        .map(msg => toDbMessage(msg, conversationId));

                    await api.chat.message.replaceConversationMessages({
                        conversationId,
                        messages: messagesToStore,
                    });
                },
                onError: errorHandler,
            },
        });
    } catch (error) {
        console.error('Error in streamResponse setup', error);
        // If there was an error setting up the stream and we incremented usage, revert it
        if (usageRecord) {
            await decrementUsage(req, usageRecord);
        }
        throw error;
    }
}
