import { trackEvent } from '@/utils/analytics/server';
import { getToolSetFromType } from '@onlook/ai';
import { ChatType, type ChatMessage } from '@onlook/models';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import { type NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { checkMessageLimit, decrementUsage, errorHandler, getModelFromType, getSupabaseUser, getSystemPromptFromType, incrementUsage, loadChat, repairToolCall } from './helpers';
import { debouncedUpsertMessage } from './helpers/message';

const MAX_STEPS = 20;

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
    // Updating the usage record and rate limit is done here to avoid
    // abuse in the case where a single user sends many concurrent requests.
    // If the call below fails, the user will not be penalized.
    let usageRecord: {
        usageRecordId: string | undefined;
        rateLimitId: string | undefined;
    } | null = null;

    try {
        const { message, chatType, conversationId, projectId }: {
            message: ChatMessage,
            chatType: ChatType,
            conversationId: string,
            projectId: string,
        } = await req.json()

        const messageId = message.id;

        // create or update last message in database
        await debouncedUpsertMessage({ id: messageId, conversationId, message });
        const messages = await loadChat(conversationId);

        if (chatType === ChatType.EDIT) {
            usageRecord = await incrementUsage(req, message.id);
        }
        const modelConfig = await getModelFromType(chatType);
        const { model, providerOptions, headers } = modelConfig;
        const systemPrompt = await getSystemPromptFromType(chatType);
        const tools = await getToolSetFromType(chatType);

        const result = streamText({
            model,
            headers,
            tools,
            stopWhen: stepCountIs(MAX_STEPS),
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                    providerOptions,
                },
                ...convertToModelMessages(messages),
            ],
            experimental_telemetry: {
                isEnabled: true,
                metadata: {
                    conversationId,
                    projectId,
                    userId,
                    chatType: chatType,
                    tags: ['chat'],
                    langfuseTraceId: message.id,
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
            }
        })

        return result.toUIMessageStreamResponse(
            {
                originalMessages: messages,
                generateMessageId: () => uuidv4(),
                messageMetadata: (_) => ({
                    createdAt: new Date(),
                    conversationId,
                    context: [],
                    checkpoints: [],
                }),
                onError: errorHandler,
                onFinish: async (message) => {
                    await debouncedUpsertMessage({
                        id: message.responseMessage.id,
                        conversationId,
                        message: message.responseMessage,
                    });
                },
            }
        );
    } catch (error) {
        console.error('Error in streamResponse setup', error);
        // If there was an error setting up the stream and we incremented usage, revert it
        if (usageRecord) {
            await decrementUsage(req, usageRecord);
        }
        throw error;
    }
}
