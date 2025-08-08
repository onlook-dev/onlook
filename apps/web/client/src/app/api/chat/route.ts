import { env } from '@/env';
import { createClient as createTRPCClient } from '@/trpc/request-server';
import { trackEvent } from '@/utils/analytics/server';
import { createClient as createSupabaseClient } from '@/utils/supabase/request-server';
import { ASK_TOOL_SET, BUILD_TOOL_SET, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, type InitialModelPayload, LLMProvider, OPENROUTER_MODELS, type Usage, UsageType } from '@onlook/models';
import { generateObject, NoSuchToolError, streamText } from 'ai';
import { type NextRequest } from 'next/server';

const isProd = env.NODE_ENV === 'production';

const MainModelConfig: InitialModelPayload = isProd ? {
    provider: LLMProvider.OPENROUTER,
    model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
} : {
    provider: LLMProvider.OPENROUTER,
    model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
};

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

export const checkMessageLimit = async (req: NextRequest): Promise<{
    exceeded: boolean;
    usage: Usage;
}> => {
    const { api } = await createTRPCClient(req);
    const usage = await api.usage.get();

    const dailyUsage = usage.daily;
    const dailyExceeded = dailyUsage.usageCount >= dailyUsage.limitCount;
    if (dailyExceeded) {
        return {
            exceeded: true,
            usage: dailyUsage,
        };
    }

    const monthlyUsage = usage.monthly;
    const monthlyExceeded = monthlyUsage.usageCount >= monthlyUsage.limitCount;
    if (monthlyExceeded) {
        return {
            exceeded: true,
            usage: monthlyUsage,
        };
    }

    return {
        exceeded: false,
        usage: monthlyUsage,
    };
}

export const getSupabaseUser = async (request: NextRequest) => {
    const supabase = await createSupabaseClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export const streamResponse = async (req: NextRequest) => {
    const { messages, maxSteps, chatType } = await req.json();
    const { model, providerOptions, headers } = await initModel(MainModelConfig);

    // Updating the usage record and rate limit is done here to avoid
    // abuse in the case where a single user sends many concurrent requests.
    // If the call below fails, the user will not be penalized.
    let usageRecordId: string | undefined;
    let rateLimitId: string | undefined;
    if (chatType === ChatType.EDIT) {
        const user = await getSupabaseUser(req);
        if (!user) {
            throw new Error('User not found');
        }
        const { api } = await createTRPCClient(req);
        const incrementRes = await api.usage.increment({
            type: UsageType.MESSAGE,
        });
        usageRecordId = incrementRes?.usageRecordId;
        rateLimitId = incrementRes?.rateLimitId;
    }

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
    const toolSet = chatType === ChatType.ASK ? ASK_TOOL_SET : BUILD_TOOL_SET;
    const result = streamText({
        model,
        headers,
        messages: [
            {
                role: 'system',
                content: systemPrompt,
                providerOptions,
            },
            ...messages,
        ],
        maxSteps,
        tools: toolSet,
        toolCallStreaming: true,
        maxTokens: 64000,
        experimental_repairToolCall: async ({ toolCall, tools, parameterSchema, error }) => {
            if (NoSuchToolError.isInstance(error)) {
                throw new Error(
                    `Tool "${toolCall.toolName}" not found. Available tools: ${Object.keys(tools).join(', ')}`,
                );
            }
            const tool = tools[toolCall.toolName as keyof typeof tools];

            console.warn(
                `Invalid parameter for tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.args)}, attempting to fix`,
            );

            const { object: repairedArgs } = await generateObject({
                model,
                schema: tool?.parameters,
                prompt: [
                    `The model tried to call the tool "${toolCall.toolName}"` +
                    ` with the following arguments:`,
                    JSON.stringify(toolCall.args),
                    `The tool accepts the following schema:`,
                    JSON.stringify(parameterSchema(toolCall)),
                    'Please fix the arguments.',
                ].join('\n'),
            });

            return { ...toolCall, args: JSON.stringify(repairedArgs) };
        },
        onError: async (error) => {
            console.error('Error in chat', error);
            // if there was an error with the API, do not penalize the user
            if (usageRecordId && rateLimitId) {
                await createTRPCClient(req)
                    .then(({ api }) => api.usage.revertIncrement({ usageRecordId, rateLimitId }))
                    .catch(error => console.error('Error in chat usage decrement', error));
            }
        },
    });

    return result.toDataStreamResponse(
        {
            getErrorMessage: errorHandler,
        }
    );
}

export function errorHandler(error: unknown) {
    if (error == null) {
        return 'unknown error';
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return JSON.stringify(error);
}
