import { mastra } from '@/mastra';
import { CHAT_TYPE_KEY, ONLOOK_AGENT_KEY, type OnlookAgentRuntimeContext } from '@/mastra/agents';
import { createClient as createTRPCClient } from '@/trpc/request-server';
import { trackEvent } from '@/utils/analytics/server';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { ChatType, UsageType } from '@onlook/models';
import { type NextRequest } from 'next/server';
import { checkMessageLimit, getSupabaseUser, repairToolCall } from './helpers';

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
    const { messages, maxSteps, chatType, conversationId, projectId } = await req.json();

    const agent = mastra.getAgent(ONLOOK_AGENT_KEY);
    const runtimeContext = new RuntimeContext<OnlookAgentRuntimeContext>()
    runtimeContext.set(CHAT_TYPE_KEY, chatType);
    console.log('messages', (messages))

    const result = await agent.stream(messages, {
        maxSteps,
        runtimeContext,
        toolCallStreaming: true,
        experimental_repairToolCall: repairToolCall,
        onError: (error) => {
            console.error('Error in chat', error);
        },
        resourceId: projectId,
        threadId: conversationId,
    })

    try {
        if (chatType === ChatType.EDIT) {
            const user = await getSupabaseUser(req);
            if (!user) {
                throw new Error('User not found');
            }
            const { api } = await createTRPCClient(req);
            await api.usage.increment({
                type: UsageType.MESSAGE,
            });
        }
    } catch (error) {
        console.error('Error in chat usage increment', error);
    }

    return result.toDataStreamResponse();
}
