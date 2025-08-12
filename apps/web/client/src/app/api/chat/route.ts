import { mastra } from '@/mastra';
import { CHAT_TYPE_KEY, ONLOOK_AGENT_KEY, type OnlookAgentRuntimeContext } from '@/mastra/agents';
import { trackEvent } from '@/utils/analytics/server';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { ChatType } from '@onlook/models';
import { convertToCoreMessages, type Message as VercelMessage } from 'ai';
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
    const { messages, maxSteps, chatType }: { messages: VercelMessage[], maxSteps: number, chatType: ChatType } = await req.json();
    const agent = mastra.getAgent(ONLOOK_AGENT_KEY);
    const runtimeContext = new RuntimeContext<OnlookAgentRuntimeContext>()
    runtimeContext.set(CHAT_TYPE_KEY, chatType);

    // Updating the usage record and rate limit is done here to avoid
    // abuse in the case where a single user sends many concurrent requests.
    // If the call below fails, the user will not be penalized.
    let usageRecord: {
        usageRecordId: string | undefined;
        rateLimitId: string | undefined;
    } | undefined;
    if (chatType === ChatType.EDIT) {
        usageRecord = await incrementUsage(req);
    }
    const result = await agent.stream(convertToCoreMessages(messages), {
        headers: {
            'HTTP-Referer': 'https://onlook.com',
            'X-Title': 'Onlook',
        },
        maxSteps,
        runtimeContext,
        toolCallStreaming: true,
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
